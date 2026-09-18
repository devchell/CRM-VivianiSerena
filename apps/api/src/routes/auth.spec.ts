import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthTokenPayload } from '@viviani/types'
import { errorHandler } from '../middleware/errorHandler'

const {
  bcryptCompare,
  bcryptHash,
  userFindUnique,
  userUpdate,
  auditLogCreate,
  redisGet,
  redisSet,
  redisDel,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  emailSendOtp,
  smsSendOtp,
  recordLoginFailure,
  resetLoginFailures,
  loggerInfo,
  loggerError,
} = vi.hoisted(() => ({
  bcryptCompare: vi.fn(),
  bcryptHash: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  emailSendOtp: vi.fn(),
  smsSendOtp: vi.fn(),
  recordLoginFailure: vi.fn(),
  resetLoginFailures: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}))

let authenticatedUser: AuthTokenPayload | undefined

vi.mock('bcryptjs', () => ({
  default: {
    compare: bcryptCompare,
    hash: bcryptHash,
  },
}))

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      update: userUpdate,
    },
    auditLog: {
      create: auditLogCreate,
    },
  },
}))

vi.mock('../lib/redis', () => ({
  redis: {
    get: redisGet,
    set: redisSet,
    del: redisDel,
  },
}))

vi.mock('../lib/jwt', () => ({
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
}))

vi.mock('../infrastructure/email', () => ({
  emailService: {
    sendOtp: emailSendOtp,
  },
}))

vi.mock('../infrastructure/sms', () => ({
  smsService: {
    sendOtp: smsSendOtp,
  },
}))

vi.mock('../middleware/security', () => ({
  bruteForceCheck: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  recordLoginFailure,
  resetLoginFailures,
}))

vi.mock('../middleware/rateLimiter', () => ({
  authRateLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = authenticatedUser
    next()
  },
  authorize: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../infrastructure/googleCalendar', () => ({
  disconnectGoogleCalendar: vi.fn(),
  getGoogleCalendarConnectionStatus: vi.fn(),
  isGoogleCalendarConfigured: vi.fn(),
}))

vi.mock('../lib/env', () => ({
  apiEnv: {
    apiBaseUrl: 'https://api.example.com',
    crmUrl: 'https://crm.example.com',
    landingRevalidateUrl: undefined,
    revalidateSecret: undefined,
  },
}))

vi.mock('../lib/logger', () => ({
  logger: {
    info: loggerInfo,
    error: loggerError,
    warn: vi.fn(),
  },
}))

let authRouter: typeof import('./auth').authRouter

beforeAll(async () => {
  const module = await import('./auth')
  authRouter = module.authRouter
})

beforeEach(() => {
  vi.clearAllMocks()
  authenticatedUser = undefined
  bcryptCompare.mockResolvedValue(true)
  bcryptHash.mockResolvedValue('new-password-hash')
  userUpdate.mockResolvedValue({})
  auditLogCreate.mockResolvedValue({})
  redisGet.mockResolvedValue(null)
  redisSet.mockResolvedValue('OK')
  redisDel.mockResolvedValue(1)
  signAccessToken.mockReturnValue('access-token')
  signRefreshToken.mockReturnValue('refresh-token')
  verifyRefreshToken.mockReturnValue({ sub: 'user_1' })
  emailSendOtp.mockResolvedValue(true)
  smsSendOtp.mockResolvedValue(true)
  recordLoginFailure.mockResolvedValue(undefined)
  resetLoginFailures.mockResolvedValue(undefined)
})

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', authRouter)
  app.use(errorHandler)
  return app
}

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'viviani@example.com',
    username: 'viviani',
    name: 'Viviani Serena',
    role: 'ADMIN' as const,
    allowedModules: [],
    passwordHash: 'password-hash',
    mustChangePassword: false,
    phone: null,
    photoUrl: null,
    twoFactorEnabled: false,
    twoFactorEmailEnabled: false,
    twoFactorSmsEnabled: false,
    failedAttempts: 0,
    lockedUntil: null,
    ...overrides,
  }
}

describe('POST /login', () => {
  it('normalizes a username before lookup and returns the authenticated session', async () => {
    userFindUnique.mockResolvedValueOnce(createUser())

    const response = await request(createApp())
      .post('/login')
      .send({ identifier: '  ViViAnI  ', password: 'valid-password' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          username: 'viviani',
          profile: 'ADMIN',
        },
      },
    })
    expect(userFindUnique).toHaveBeenCalledWith({ where: { username: 'viviani' } })
    expect(userFindUnique).toHaveBeenCalledTimes(1)
    expect(resetLoginFailures).toHaveBeenCalled()
    expect(auditLogCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LOGIN', resource: 'auth' }),
    }))
  })

  it('does not reveal whether an unknown identifier exists', async () => {
    userFindUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/login')
      .send({ identifier: 'unknown', password: 'valid-password' })

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('Credenciais inválidas')
    expect(recordLoginFailure).toHaveBeenCalled()
    expect(response.body).not.toHaveProperty('data.user')
  })
})

describe('2FA login flow', () => {
  it('requires the configured e-mail OTP and only creates a session after verification', async () => {
    const user = createUser({
      twoFactorEnabled: true,
      twoFactorEmailEnabled: true,
    })
    userFindUnique.mockResolvedValueOnce(user)

    const login = await request(createApp())
      .post('/login')
      .send({ identifier: 'viviani', password: 'valid-password' })

    expect(login.status).toBe(200)
    expect(login.body.data.requiresTwoFactor).toBe(true)
    expect(login.body.data.requiredChannels).toEqual(['email'])
    expect(emailSendOtp).toHaveBeenCalledWith(expect.objectContaining({
      to: user.email,
      type: 'login',
    }))
    expect(signAccessToken).not.toHaveBeenCalled()

    const twoFactorToken = login.body.data.twoFactorToken as string
    redisGet.mockImplementation(async (key: string) => {
      if (key === `2fa_login:${twoFactorToken}`) {
        return {
          userId: user.id,
          email: user.email,
          role: user.role,
          pendingChannels: ['email'],
          verifiedChannels: [],
        }
      }
      if (key === `2fa_email:${twoFactorToken}`) return '123456'
      return null
    })

    const verified = await request(createApp())
      .post('/2fa/verify-email-otp')
      .send({ twoFactorToken, code: '123456' })

    expect(verified.status).toBe(200)
    expect(verified.body.data.sessionToken).toEqual(expect.any(String))
    expect(signAccessToken).not.toHaveBeenCalled()

    const sessionToken = verified.body.data.sessionToken as string
    redisGet.mockImplementation(async (key: string) => (
      key === `2fa_session:${sessionToken}` ? { userId: user.id } : null
    ))
    userFindUnique.mockResolvedValueOnce(user)

    const completed = await request(createApp())
      .post('/login')
      .send({ twoFactorSessionToken: sessionToken, password: 'valid-password' })

    expect(completed.status).toBe(200)
    expect(completed.body.data.user.id).toBe(user.id)
    expect(signAccessToken).toHaveBeenCalledTimes(1)
    expect(auditLogCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LOGIN_2FA' }),
    }))
  })
})

describe('PUT /password', () => {
  it('changes the password only after validating the current one', async () => {
    authenticatedUser = {
      sub: 'user_1',
      email: 'viviani@example.com',
      role: 'ADMIN',
      iat: 0,
      exp: 0,
    }
    userFindUnique.mockResolvedValueOnce(createUser())

    const response = await request(createApp())
      .put('/password')
      .send({ currentPassword: 'old-password', newPassword: 'new-password' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ success: true })
    expect(bcryptHash).toHaveBeenCalledWith('new-password', 12)
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { passwordHash: 'new-password-hash' },
    })
    expect(auditLogCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'CHANGE_PASSWORD', resource: 'auth' }),
    }))
  })
})
