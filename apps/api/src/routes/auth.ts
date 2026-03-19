import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "../lib/prisma"
import { redis } from "../lib/redis"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt"
import { authenticate, authorize } from "../middleware/authenticate"
import { authRateLimiter } from "../middleware/rateLimiter"
import { AppError } from "../middleware/errorHandler"
import { logger } from "../lib/logger"
import { recordLoginFailure, resetLoginFailures, bruteForceCheck } from "../middleware/security"
import { emailService } from "../infrastructure/email"
import { smsService } from "../infrastructure/sms"

export const authRouter: Router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // Usado pelo NextAuth para completar o fluxo 2FA
  twoFactorSessionToken: z.string().optional(),
})

// ─── POST /login ──────────────────────────────────────────────────────────────

authRouter.post("/login", authRateLimiter, bruteForceCheck, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const ip = req.ip ?? "unknown"

    // ── Fluxo de conclusão 2FA (NextAuth chama com twoFactorSessionToken) ──
    if (body.twoFactorSessionToken) {
      const raw = await redis.get(`2fa_session:${body.twoFactorSessionToken}`)
      if (!raw) throw new AppError(401, "Sessão 2FA expirada ou inválida")
      await redis.del(`2fa_session:${body.twoFactorSessionToken}`)
      const session = JSON.parse(raw) as { userId: string; email: string; role: string }
      const user = await prisma.user.findUnique({ where: { id: session.userId } })
      if (!user) throw new AppError(401, "Usuário não encontrado")
      const accessToken = signAccessToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        allowedModules: user.allowedModules,
        mustChangePassword: user.mustChangePassword,
        photoUrl: user.photoUrl,
      })
      const refreshToken = signRefreshToken(user.id)
      await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken)
      await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN_2FA", resource: "auth", ip, details: {} } })
      return res
        .cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
        .cookie("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
        .json({
          success: true,
          data: {
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              mustChangePassword: user.mustChangePassword,
              allowedModules: user.allowedModules,
              photoUrl: user.photoUrl,
            },
          },
        })
    }

    // ── Fluxo normal de login ──
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) { recordLoginFailure(ip); throw new AppError(401, "Credenciais inválidas") }
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new AppError(423, "Conta temporariamente bloqueada. Tente novamente mais tarde.")

    const isValidPassword = await bcrypt.compare(body.password, user.passwordHash)
    if (!isValidPassword) {
      recordLoginFailure(ip)
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: { increment: 1 }, lockedUntil: user.failedAttempts >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : null },
      })
      throw new AppError(401, "Credenciais inválidas")
    }

    resetLoginFailures(ip)
    await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() } })

    // ── 2FA habilitado: iniciar fluxo OTP ──
    if (user.twoFactorEnabled) {
      if (!user.phone) throw new AppError(400, "2FA ativo mas sem telefone cadastrado. Contate o administrador.")

      const twoFactorToken = crypto.randomUUID()
      const emailCode = generateOtp()

      // Armazena estado do fluxo 2FA (10 min)
      await redis.setex(`2fa_login:${twoFactorToken}`, 600, JSON.stringify({
        userId: user.id, email: user.email, role: user.role, emailVerified: false,
      }))
      // Armazena código de email (5 min)
      await redis.setex(`2fa_email:${twoFactorToken}`, 300, emailCode)

      await emailService.sendOtp({ to: user.email, code: emailCode, type: "login" })
      logger.info("2FA OTP sent to email", { userId: user.id })

      return res.json({ success: true, data: { requiresTwoFactor: true, twoFactorToken, maskedEmail: maskEmail(user.email) } })
    }

    // ── Login direto (sem 2FA) ──
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      allowedModules: user.allowedModules,
      mustChangePassword: user.mustChangePassword,
      photoUrl: user.photoUrl,
    })
    const refreshToken = signRefreshToken(user.id)
    await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken)
    await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", resource: "auth", ip, details: {} } })
    logger.info("User logged in", { userId: user.id, email: user.email, ip })

    return res
      .cookie("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            allowedModules: user.allowedModules,
            photoUrl: user.photoUrl,
          },
        },
      })
  } catch (error) { next(error) }
})

// ─── POST /2fa/verify-email-otp ───────────────────────────────────────────────

authRouter.post("/2fa/verify-email-otp", authRateLimiter, async (req, res, next) => {
  try {
    const { twoFactorToken, code } = z.object({
      twoFactorToken: z.string(),
      code: z.string().length(6),
    }).parse(req.body)

    const raw = await redis.get(`2fa_login:${twoFactorToken}`)
    if (!raw) throw new AppError(401, "Sessão expirada. Faça login novamente.")
    const state = JSON.parse(raw) as { userId: string; email: string; role: string; emailVerified: boolean }

    const storedCode = await redis.get(`2fa_email:${twoFactorToken}`)
    if (!storedCode || storedCode !== code) throw new AppError(401, "Código de e-mail inválido ou expirado.")

    // Marca email como verificado
    state.emailVerified = true
    await redis.setex(`2fa_login:${twoFactorToken}`, 600, JSON.stringify(state))
    await redis.del(`2fa_email:${twoFactorToken}`)

    // Envia código SMS
    const user = await prisma.user.findUnique({ where: { id: state.userId }, select: { phone: true } })
    if (!user?.phone) throw new AppError(400, "Telefone não cadastrado.")

    const smsCode = generateOtp()
    await redis.setex(`2fa_sms:${twoFactorToken}`, 300, smsCode)
    await smsService.sendOtp(user.phone, smsCode)

    logger.info("2FA email OTP verified, SMS sent", { userId: state.userId })
    res.json({ success: true, data: { step: "sms", maskedPhone: maskPhone(user.phone) } })
  } catch (error) { next(error) }
})

// ─── POST /2fa/verify-sms-otp ─────────────────────────────────────────────────

authRouter.post("/2fa/verify-sms-otp", authRateLimiter, async (req, res, next) => {
  try {
    const { twoFactorToken, code } = z.object({
      twoFactorToken: z.string(),
      code: z.string().length(6),
    }).parse(req.body)

    const raw = await redis.get(`2fa_login:${twoFactorToken}`)
    if (!raw) throw new AppError(401, "Sessão expirada. Faça login novamente.")
    const state = JSON.parse(raw) as { userId: string; email: string; role: string; emailVerified: boolean }

    if (!state.emailVerified) throw new AppError(400, "E-mail ainda não verificado.")

    const storedCode = await redis.get(`2fa_sms:${twoFactorToken}`)
    if (!storedCode || storedCode !== code) throw new AppError(401, "Código SMS inválido ou expirado.")

    await redis.del(`2fa_login:${twoFactorToken}`)
    await redis.del(`2fa_sms:${twoFactorToken}`)

    // Cria sessionToken para o NextAuth completar o login
    const sessionToken = crypto.randomUUID()
    await redis.setex(`2fa_session:${sessionToken}`, 120, JSON.stringify({
      userId: state.userId, email: state.email, role: state.role,
    }))

    logger.info("2FA fully verified", { userId: state.userId })
    res.json({ success: true, data: { sessionToken } })
  } catch (error) { next(error) }
})

// ─── POST /refresh ────────────────────────────────────────────────────────────

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.refresh_token as string | undefined
    const bodyResult = z.object({ refreshToken: z.string() }).safeParse(req.body)
    const token = cookieToken ?? (bodyResult.success ? bodyResult.data.refreshToken : undefined)
    if (!token) throw new AppError(401, "Refresh token required")
    const payload = verifyRefreshToken(token)
    const stored = await redis.get(`refresh:${payload.sub}`)
    if (!stored || stored !== token) throw new AppError(401, "Invalid refresh token")
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) throw new AppError(401, "User not found")
    const newAccessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      allowedModules: user.allowedModules,
      mustChangePassword: user.mustChangePassword,
      photoUrl: user.photoUrl,
    })
    const newRefreshToken = signRefreshToken(user.id)
    await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, newRefreshToken)
    res
      .cookie("access_token", newAccessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie("refresh_token", newRefreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } })
  } catch (error) { next(error) }
})

// ─── POST /logout ─────────────────────────────────────────────────────────────

authRouter.post("/logout", authenticate, async (req, res, next) => {
  try {
    if (req.user) {
      await redis.del(`refresh:${req.user.sub}`)
      await prisma.auditLog.create({ data: { userId: req.user.sub, action: "LOGOUT", resource: "auth", ip: req.ip ?? null, details: {} } })
    }
    res.clearCookie("access_token").clearCookie("refresh_token").json({ success: true, message: "Logged out successfully" })
  } catch (error) { next(error) }
})

// ─── GET /me ──────────────────────────────────────────────────────────────────

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        twoFactorEnabled: true,
        allowedModules: true,
        mustChangePassword: true,
        photoUrl: true,
      },
    })
    if (!user) throw new AppError(404, "User not found")
    res.json({ success: true, data: { ...user } })
  } catch (error) { next(error) }
})

// ─── PUT /profile ─────────────────────────────────────────────────────────────

authRouter.put("/profile", authenticate, async (req, res, next) => {
  try {
    const { name, email, phone, photoUrl } = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(10).max(20).optional(),
      photoUrl: z.string().url().nullable().optional(),
    }).parse(req.body)

    const update: { name?: string; email?: string; phone?: string; photoUrl?: string | null } = {}
    if (name !== undefined) update.name = name.trim()
    if (email !== undefined) update.email = email.trim().toLowerCase()
    if (phone !== undefined) update.phone = phone.replace(/\D/g, "")
    if (photoUrl !== undefined) update.photoUrl = photoUrl

    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: update,
      select: { id: true, email: true, name: true, phone: true, role: true, photoUrl: true },
    })
    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "UPDATE_PROFILE", resource: "auth", ip: req.ip ?? null, details: update as object },
    })
    logger.info("Profile updated", { userId: req.user!.sub })
    res.json({ success: true, data: user })
  } catch (error) { next(error) }
})

// ─── PUT /password ────────────────────────────────────────────────────────────

authRouter.put("/password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(8),
      newPassword: z.string().min(8, "Nova senha deve ter no mínimo 8 caracteres"),
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } })
    if (!user) throw new AppError(404, "Usuário não encontrado")

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) throw new AppError(401, "Senha atual incorreta")

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: req.user!.sub }, data: { passwordHash } })
    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "CHANGE_PASSWORD", resource: "auth", ip: req.ip ?? null, details: {} },
    })
    logger.info("Password changed", { userId: req.user!.sub })
    res.json({ success: true, message: "Senha alterada com sucesso" })
  } catch (error) { next(error) }
})

// ─── POST /2fa/toggle ─────────────────────────────────────────────────────────

authRouter.post("/2fa/toggle", authenticate, async (req, res, next) => {
  try {
    const { enable, password } = z.object({
      enable: z.boolean(),
      password: z.string().min(1),
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } })
    if (!user) throw new AppError(404, "Usuário não encontrado")

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) throw new AppError(401, "Senha incorreta")

    if (enable && !user.phone) throw new AppError(400, "Cadastre um telefone antes de ativar o 2FA")

    await prisma.user.update({ where: { id: req.user!.sub }, data: { twoFactorEnabled: enable } })
    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: enable ? "2FA_ENABLED" : "2FA_DISABLED", resource: "auth", ip: req.ip ?? null, details: {} },
    })
    logger.info(`2FA ${enable ? "enabled" : "disabled"}`, { userId: req.user!.sub })
    res.json({ success: true, message: enable ? "2FA ativado com sucesso" : "2FA desativado com sucesso" })
  } catch (error) { next(error) }
})

// ─── POST /set-password (primeiro login) ──────────────────────────────────────

authRouter.post("/set-password", authenticate, async (req, res, next) => {
  try {
    const { newPassword } = z.object({
      newPassword: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } })
    if (!user) throw new AppError(404, "Usuário não encontrado")
    if (!user.mustChangePassword) throw new AppError(400, "Sem necessidade de troca de senha")

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { passwordHash, mustChangePassword: false },
    })
    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "SET_INITIAL_PASSWORD", resource: "auth", ip: req.ip ?? null, details: {} },
    })
    logger.info("Initial password set", { userId: req.user!.sub })
    res.json({ success: true, message: "Senha definida com sucesso. Faça login com a nova senha." })
  } catch (error) { next(error) }
})

// ─── Google Calendar (mantido) ────────────────────────────────────────────────

authRouter.get("/google", authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { googleCalendar } = require("../infrastructure/googleCalendar") as { googleCalendar: import("../infrastructure/googleCalendar").GoogleCalendarService }
    const state = crypto.randomUUID()
    await redis.setex(`google:oauth:state:${state}`, 600, JSON.stringify({
      userId: req.user!.sub,
      role: req.user!.role,
    }))
    const url = googleCalendar.getAuthUrl(state)
    res.json({ success: true, data: { authUrl: url } })
  } catch (error) { next(error) }
})

authRouter.get("/google/callback", async (req, res, next) => {
  try {
    const { code, state } = z.object({ code: z.string(), state: z.string() }).parse(req.query)
    const stateKey = `google:oauth:state:${state}`
    const authState = await redis.get(stateKey)
    if (!authState) {
      throw new AppError(401, "Google OAuth state invalido ou expirado")
    }

    await redis.del(stateKey)
    const { googleCalendar } = await import("../infrastructure/googleCalendar")
    await googleCalendar.handleCallback(code)
    res.json({ success: true, message: "Google Calendar connected successfully" })
  } catch (error) { next(error) }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  return `${local.slice(0, 2)}${"*".repeat(local.length - 2)}@${domain}`
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`
}
