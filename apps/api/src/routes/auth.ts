import { type Response, Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { authenticate, authorize } from '../middleware/authenticate'
import { authRateLimiter } from '../middleware/rateLimiter'
import { AppError } from '../middleware/errorHandler'
import { logger } from '../lib/logger'
import { apiEnv } from '../lib/env'
import { recordLoginFailure, resetLoginFailures, bruteForceCheck } from '../middleware/security'
import { emailService } from '../infrastructure/email'
import { smsService } from '../infrastructure/sms'
import { disconnectGoogleCalendar, getGoogleCalendarConnectionStatus, isGoogleCalendarConfigured } from '../infrastructure/googleCalendar'
import {
  inferUserProfile,
  resolveAllowedModules,
  resolvePermissions,
  type AuthTokenPayload,
  type UserRole,
} from '@viviani/types'

export const authRouter: Router = Router()

type TwoFactorChannel = 'email' | 'sms'

type AccessUser = {
  id: string
  email: string
  name?: string | null
  role: UserRole
  allowedModules?: string[]
  mustChangePassword?: boolean
  photoUrl?: string | null
}

type TwoFactorPreferencesInput = {
  twoFactorEnabled: boolean
  twoFactorEmailEnabled?: boolean | null
  twoFactorSmsEnabled?: boolean | null
  phone?: string | null
}

type TwoFactorState = {
  userId: string
  email: string
  role: string
  pendingChannels: TwoFactorChannel[]
  verifiedChannels: TwoFactorChannel[]
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

function buildAccessContext(user: AccessUser) {
  const permissions = resolvePermissions(user.role, user.allowedModules)
  const allowedModules = resolveAllowedModules(user.role, user.allowedModules)
  const profile = inferUserProfile(user.role, user.allowedModules)

  return {
    accessTokenPayload: {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profile,
      permissions,
      allowedModules,
      mustChangePassword: user.mustChangePassword,
      photoUrl: user.photoUrl,
    } satisfies Omit<AuthTokenPayload, 'iat' | 'exp'>,
    userPayload: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile,
      permissions,
      allowedModules,
      mustChangePassword: user.mustChangePassword ?? false,
      photoUrl: user.photoUrl ?? null,
    },
  }
}

function requireAuthenticatedUser(user: AuthTokenPayload | undefined): AuthTokenPayload {
  if (!user) {
    throw new AppError(401, 'Sessão inválida')
  }

  return user
}

function resolveTwoFactorSettings(user: TwoFactorPreferencesInput) {
  const emailEnabled = Boolean(user.twoFactorEnabled && user.twoFactorEmailEnabled)
  const smsEnabled = Boolean(user.twoFactorEnabled && user.twoFactorSmsEnabled && user.phone)

  return {
    enabled: emailEnabled || smsEnabled,
    emailEnabled,
    smsEnabled,
  }
}

function getTwoFactorChannels(user: TwoFactorPreferencesInput): TwoFactorChannel[] {
  const settings = resolveTwoFactorSettings(user)
  const channels: TwoFactorChannel[] = []

  if (settings.smsEnabled) {
    channels.push('sms')
  }

  if (settings.emailEnabled) {
    channels.push('email')
  }

  return channels
}

function getCurrentTwoFactorChannel(state: TwoFactorState): TwoFactorChannel {
  const channel = state.pendingChannels[0]

  if (!channel) {
    throw new AppError(400, 'Fluxo 2FA inválido')
  }

  return channel
}

async function completeAuthenticatedLogin(
  res: Response,
  user: AccessUser,
  ip: string,
  auditAction: 'LOGIN' | 'LOGIN_2FA'
) {
  const access = buildAccessContext(user)
  const accessToken = signAccessToken(access.accessTokenPayload)
  const refreshToken = signRefreshToken(user.id)

  await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken)
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: auditAction,
      resource: 'auth',
      ip,
      details: {},
    },
  })

  return res
    .cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
    .cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: access.userPayload,
      },
    })
}

async function sendTwoFactorChallenge(
  user: { email: string; phone?: string | null },
  twoFactorToken: string,
  channel: TwoFactorChannel
) {
  const code = generateOtp()

  if (channel === 'email') {
    await redis.setex(`2fa_email:${twoFactorToken}`, 300, code)
    const sent = await emailService.sendOtp({ to: user.email, code, type: 'login' })

    if (!sent) {
      throw new AppError(503, 'Não foi possível enviar o código por e-mail')
    }

    return {
      nextStep: 'email' as const,
      maskedEmail: maskEmail(user.email),
    }
  }

  if (!user.phone) {
    throw new AppError(400, 'Telefone não cadastrado. Atualize seu perfil antes de usar 2FA por celular.')
  }

  await redis.setex(`2fa_sms:${twoFactorToken}`, 300, code)
  const sent = await smsService.sendOtp(user.phone, code)

  if (!sent) {
    throw new AppError(503, 'Não foi possível enviar o código por SMS')
  }

  return {
    nextStep: 'sms' as const,
    maskedPhone: maskPhone(user.phone),
  }
}

async function loadTwoFactorState(twoFactorToken: string) {
  const raw = await redis.get(`2fa_login:${twoFactorToken}`)

  if (!raw) {
    throw new AppError(401, 'Sessão expirada. Faça login novamente.')
  }

  return JSON.parse(raw) as TwoFactorState
}

async function advanceTwoFactorFlow(twoFactorToken: string, state: TwoFactorState) {
  const completedChannel = state.pendingChannels.shift()

  if (!completedChannel) {
    throw new AppError(400, 'Fluxo 2FA inválido')
  }

  state.verifiedChannels.push(completedChannel)

  if (state.pendingChannels.length === 0) {
    await redis.del(`2fa_login:${twoFactorToken}`)
    const sessionToken = crypto.randomUUID()

    await redis.setex(
      `2fa_session:${sessionToken}`,
      120,
      JSON.stringify({
        userId: state.userId,
        email: state.email,
        role: state.role,
      })
    )

    logger.info('2FA fully verified', {
      userId: state.userId,
      channels: state.verifiedChannels,
    })

    return {
      sessionToken,
    }
  }

  await redis.setex(`2fa_login:${twoFactorToken}`, 600, JSON.stringify(state))

  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    select: {
      email: true,
      phone: true,
    },
  })

  if (!user) {
    throw new AppError(401, 'Usuário não encontrado')
  }

  const nextChannel = getCurrentTwoFactorChannel(state)
  const nextChallenge = await sendTwoFactorChallenge(user, twoFactorToken, nextChannel)

  logger.info('2FA challenge advanced', {
    userId: state.userId,
    nextChannel,
  })

  return nextChallenge
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  twoFactorSessionToken: z.string().optional(),
})

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  photoUrl: z.string().url().nullable().optional(),
})

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(8),
      newPassword: z.string().min(8, 'Nova senha deve ter no mínimo 8 caracteres'),
})

const twoFactorPreferencesSchema = z.object({
  enabled: z.boolean(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  password: z.string().min(1),
})

async function updateTwoFactorPreferences(params: {
  userId: string
  password: string
  enabled: boolean
  emailEnabled?: boolean
  smsEnabled?: boolean
  ip?: string | null
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
  })

  if (!user) {
    throw new AppError(404, 'Usuário não encontrado')
  }

  const isValid = await bcrypt.compare(params.password, user.passwordHash)
  if (!isValid) {
    throw new AppError(401, 'Senha incorreta')
  }

  let emailEnabled = params.enabled ? Boolean(params.emailEnabled) : false
  let smsEnabled = params.enabled ? Boolean(params.smsEnabled ?? !emailEnabled) : false

  if (smsEnabled && !user.phone) {
    throw new AppError(400, 'Cadastre um telefone antes de ativar o 2FA por celular')
  }

  if (!emailEnabled && !smsEnabled) {
    emailEnabled = false
    smsEnabled = false
  }

  const twoFactorEnabled = emailEnabled || smsEnabled

  const updated = await prisma.user.update({
    where: { id: params.userId },
    data: {
      twoFactorEnabled,
      twoFactorEmailEnabled: emailEnabled,
      twoFactorSmsEnabled: smsEnabled,
    },
    select: {
      twoFactorEnabled: true,
      twoFactorEmailEnabled: true,
      twoFactorSmsEnabled: true,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: '2FA_UPDATED',
      resource: 'auth',
      ip: params.ip ?? null,
      details: {
        enabled: updated.twoFactorEnabled,
        emailEnabled: updated.twoFactorEmailEnabled,
        smsEnabled: updated.twoFactorSmsEnabled,
      },
    },
  })

  const message = !updated.twoFactorEnabled
    ? '2FA desativado com sucesso'
    : updated.twoFactorEmailEnabled && updated.twoFactorSmsEnabled
      ? '2FA ativado por celular e e-mail'
      : updated.twoFactorSmsEnabled
        ? '2FA ativado por celular'
        : '2FA ativado por e-mail'

  return {
    ...updated,
    message,
  }
}

authRouter.post('/login', authRateLimiter, bruteForceCheck, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const ip = req.ip ?? 'unknown'

    if (body.twoFactorSessionToken) {
      const raw = await redis.get(`2fa_session:${body.twoFactorSessionToken}`)

      if (!raw) {
        throw new AppError(401, 'Sessão 2FA expirada ou inválida')
      }

      await redis.del(`2fa_session:${body.twoFactorSessionToken}`)
      const session = JSON.parse(raw) as { userId: string }
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
      })

      if (!user) {
        throw new AppError(401, 'Usuário não encontrado')
      }

      return completeAuthenticatedLogin(res, user, ip, 'LOGIN_2FA')
    }

    const user = await prisma.user.findUnique({ where: { email: body.email } })

    if (!user) {
      recordLoginFailure(ip)
      throw new AppError(401, 'Credenciais inválidas')
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, 'Conta temporariamente bloqueada. Tente novamente mais tarde.')
    }

    const isValidPassword = await bcrypt.compare(body.password, user.passwordHash)
    if (!isValidPassword) {
      recordLoginFailure(ip)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: { increment: 1 },
          lockedUntil: user.failedAttempts >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      })
      throw new AppError(401, 'Credenciais inválidas')
    }

    resetLoginFailures(ip)
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    })

    const requiredChannels = getTwoFactorChannels(user)

    if (requiredChannels.length > 0) {
      const twoFactorToken = crypto.randomUUID()
      const state: TwoFactorState = {
        userId: user.id,
        email: user.email,
        role: user.role,
        pendingChannels: [...requiredChannels],
        verifiedChannels: [],
      }

      await redis.setex(`2fa_login:${twoFactorToken}`, 600, JSON.stringify(state))

      const firstChannel = getCurrentTwoFactorChannel(state)
      const challenge = await sendTwoFactorChallenge(user, twoFactorToken, firstChannel)

      logger.info('2FA challenge sent', {
        userId: user.id,
        channels: requiredChannels,
      })

      return res.json({
        success: true,
        data: {
          requiresTwoFactor: true,
          twoFactorToken,
          requiredChannels,
          ...challenge,
        },
      })
    }

    logger.info('User logged in', { userId: user.id, email: user.email, ip })
    return completeAuthenticatedLogin(res, user, ip, 'LOGIN')
  } catch (error) {
    next(error)
  }
})

authRouter.post('/2fa/verify-email-otp', authRateLimiter, async (req, res, next) => {
  try {
    const { twoFactorToken, code } = z.object({
      twoFactorToken: z.string(),
      code: z.string().length(6),
    }).parse(req.body)

    const state = await loadTwoFactorState(twoFactorToken)

    if (getCurrentTwoFactorChannel(state) !== 'email') {
      throw new AppError(400, 'Etapa 2FA incorreta para este código')
    }

    const storedCode = await redis.get(`2fa_email:${twoFactorToken}`)
    if (!storedCode || storedCode !== code) {
      throw new AppError(401, 'Código de e-mail inválido ou expirado.')
    }

    await redis.del(`2fa_email:${twoFactorToken}`)
    const result = await advanceTwoFactorFlow(twoFactorToken, state)

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/2fa/verify-sms-otp', authRateLimiter, async (req, res, next) => {
  try {
    const { twoFactorToken, code } = z.object({
      twoFactorToken: z.string(),
      code: z.string().length(6),
    }).parse(req.body)

    const state = await loadTwoFactorState(twoFactorToken)

    if (getCurrentTwoFactorChannel(state) !== 'sms') {
      throw new AppError(400, 'Etapa 2FA incorreta para este código')
    }

    const storedCode = await redis.get(`2fa_sms:${twoFactorToken}`)
    if (!storedCode || storedCode !== code) {
      throw new AppError(401, 'Código SMS inválido ou expirado.')
    }

    await redis.del(`2fa_sms:${twoFactorToken}`)
    const result = await advanceTwoFactorFlow(twoFactorToken, state)

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.refresh_token as string | undefined
    const bodyResult = z.object({ refreshToken: z.string() }).safeParse(req.body)
    const token = cookieToken ?? (bodyResult.success ? bodyResult.data.refreshToken : undefined)

    if (!token) {
      throw new AppError(401, 'Refresh token required')
    }

    const payload = verifyRefreshToken(token)
    const stored = await redis.get(`refresh:${payload.sub}`)

    if (!stored || stored !== token) {
      throw new AppError(401, 'Invalid refresh token')
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      throw new AppError(401, 'User not found')
    }

    const access = buildAccessContext(user)
    const newAccessToken = signAccessToken(access.accessTokenPayload)
    const newRefreshToken = signRefreshToken(user.id)

    await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, newRefreshToken)

    res
      .cookie('access_token', newAccessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', newRefreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    if (req.user) {
      await redis.del(`refresh:${req.user.sub}`)
      await prisma.auditLog.create({
        data: {
          userId: req.user.sub,
          action: 'LOGOUT',
          resource: 'auth',
          ip: req.ip ?? null,
          details: {},
        },
      })
    }

    res
      .clearCookie('access_token')
      .clearCookie('refresh_token')
      .json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const authUser = requireAuthenticatedUser(req.user)
    const user = await prisma.user.findUnique({
      where: { id: authUser.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        twoFactorEnabled: true,
        twoFactorEmailEnabled: true,
        twoFactorSmsEnabled: true,
        allowedModules: true,
        mustChangePassword: true,
        photoUrl: true,
      },
    })

    if (!user) {
      throw new AppError(404, 'User not found')
    }

    const access = buildAccessContext(user)

    res.json({
      success: true,
      data: {
        ...user,
        ...access.userPayload,
      },
    })
  } catch (error) {
    next(error)
  }
})

authRouter.put('/profile', authenticate, async (req, res, next) => {
  try {
    const authUser = requireAuthenticatedUser(req.user)
    const { name, email, phone, photoUrl } = profileUpdateSchema.parse(req.body)
    const update: { name?: string; email?: string; phone?: string; photoUrl?: string | null } = {}

    if (name !== undefined) update.name = name.trim()
    if (email !== undefined) update.email = email.trim().toLowerCase()
    if (phone !== undefined) update.phone = phone.replace(/\D/g, '')
    if (photoUrl !== undefined) update.photoUrl = photoUrl

    const user = await prisma.user.update({
      where: { id: authUser.sub },
      data: update,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        photoUrl: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: authUser.sub,
        action: 'UPDATE_PROFILE',
        resource: 'auth',
        ip: req.ip ?? null,
        details: update as object,
      },
    })

    logger.info('Profile updated', { userId: authUser.sub })
    res.json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
})

authRouter.put('/password', authenticate, async (req, res, next) => {
  try {
    const authUser = requireAuthenticatedUser(req.user)
    const { currentPassword, newPassword } = passwordUpdateSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: authUser.sub } })
    if (!user) {
      throw new AppError(404, 'Usuário não encontrado')
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      throw new AppError(401, 'Senha atual incorreta')
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: authUser.sub }, data: { passwordHash } })
    await prisma.auditLog.create({
      data: {
        userId: authUser.sub,
        action: 'CHANGE_PASSWORD',
        resource: 'auth',
        ip: req.ip ?? null,
        details: {},
      },
    })

    logger.info('Password changed', { userId: authUser.sub })
    res.json({ success: true, message: 'Senha alterada com sucesso' })
  } catch (error) {
    next(error)
  }
})

authRouter.put('/2fa/preferences', authenticate, async (req, res, next) => {
  try {
    const authUser = requireAuthenticatedUser(req.user)
    const body = twoFactorPreferencesSchema.parse(req.body)
    const result = await updateTwoFactorPreferences({
      userId: authUser.sub,
      password: body.password,
      enabled: body.enabled,
      emailEnabled: body.emailEnabled,
      smsEnabled: body.smsEnabled,
      ip: req.ip ?? null,
    })

    logger.info('2FA preferences updated', {
      userId: authUser.sub,
      enabled: result.twoFactorEnabled,
      emailEnabled: result.twoFactorEmailEnabled,
      smsEnabled: result.twoFactorSmsEnabled,
    })

    res.json({
      success: true,
      message: result.message,
      data: {
        twoFactorEnabled: result.twoFactorEnabled,
        twoFactorEmailEnabled: result.twoFactorEmailEnabled,
        twoFactorSmsEnabled: result.twoFactorSmsEnabled,
      },
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/2fa/toggle', authenticate, async (req, res, next) => {
  try {
    const authUser = requireAuthenticatedUser(req.user)
    const { enable, password } = z.object({
      enable: z.boolean(),
      password: z.string().min(1),
    }).parse(req.body)

    const result = await updateTwoFactorPreferences({
      userId: authUser.sub,
      password,
      enabled: enable,
      smsEnabled: enable,
      emailEnabled: false,
      ip: req.ip ?? null,
    })

    res.json({
      success: true,
      message: result.message,
      data: {
        twoFactorEnabled: result.twoFactorEnabled,
        twoFactorEmailEnabled: result.twoFactorEmailEnabled,
        twoFactorSmsEnabled: result.twoFactorSmsEnabled,
      },
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/set-password', authenticate, async (req, res, next) => {
  try {
    const authUser = requireAuthenticatedUser(req.user)
    const { newPassword } = z.object({
      newPassword: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: authUser.sub } })
    if (!user) {
      throw new AppError(404, 'Usuário não encontrado')
    }

    if (!user.mustChangePassword) {
      throw new AppError(400, 'Sem necessidade de troca de senha')
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: authUser.sub },
      data: { passwordHash, mustChangePassword: false },
    })
    await prisma.auditLog.create({
      data: {
        userId: authUser.sub,
        action: 'SET_INITIAL_PASSWORD',
        resource: 'auth',
        ip: req.ip ?? null,
        details: {},
      },
    })

    logger.info('Initial password set', { userId: authUser.sub })
    res.json({ success: true, message: 'Senha definida com sucesso. Faça login com a nova senha.' })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/google', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const authUser = requireAuthenticatedUser(req.user)
    if (!isGoogleCalendarConfigured()) {
      throw new AppError(400, 'Google Calendar não está configurado no ambiente')
    }

    const { googleCalendar } = await import('../infrastructure/googleCalendar')
    const state = crypto.randomUUID()
    const redirect = resolveGoogleRedirectTarget(
      typeof req.query.redirect === 'string' ? req.query.redirect : undefined
    )

    await redis.setex(
      `google:oauth:state:${state}`,
      600,
      JSON.stringify({
        userId: authUser.sub,
        role: authUser.role,
        redirect,
      })
    )

    const url = googleCalendar.getAuthUrl(state)
    res.json({ success: true, data: { authUrl: url } })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/google/status', authenticate, authorize('ADMIN'), async (_req, res, next) => {
  try {
    const status = await getGoogleCalendarConnectionStatus()
    res.json({ success: true, data: status })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/google/callback', async (req, res) => {
  let redirectTarget = '/administracao?google=error'

  try {
    const { code, state } = z.object({ code: z.string(), state: z.string() }).parse(req.query)
    const stateKey = `google:oauth:state:${state}`
    const authState = await redis.get(stateKey)

    if (!authState) {
      throw new AppError(401, 'Google OAuth state inválido ou expirado')
    }

    const parsedState = JSON.parse(authState) as { redirect?: string }
    redirectTarget = resolveGoogleRedirectTarget(
      parsedState.redirect?.replace('google=connected', 'google=error')
    )
    await redis.del(stateKey)
    const { googleCalendar } = await import('../infrastructure/googleCalendar')
    await googleCalendar.handleCallback(code)
    res.redirect(`${apiEnv.crmUrl}${resolveGoogleRedirectTarget(parsedState.redirect)}`)
  } catch (error) {
    logger.error('Google Calendar callback failed', error)
    res.redirect(`${apiEnv.crmUrl}${redirectTarget}`)
  }
})

authRouter.delete('/google', authenticate, authorize('ADMIN'), async (_req, res, next) => {
  try {
    await disconnectGoogleCalendar()
    res.json({ success: true, message: 'Google Calendar desconectado com sucesso' })
  } catch (error) {
    next(error)
  }
})

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const visible = local.slice(0, Math.min(2, local.length))
  const hidden = '*'.repeat(Math.max(1, local.length - visible.length))

  return `${visible}${hidden}@${domain}`
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

function resolveGoogleRedirectTarget(input?: string) {
  if (!input) {
    return '/administracao?google=connected'
  }

  if (!input.startsWith('/')) {
    return '/administracao?google=connected'
  }

  if (input.startsWith('//')) {
    return '/administracao?google=connected'
  }

  return input
}
