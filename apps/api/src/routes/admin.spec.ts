import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const getGoogleCalendarConnectionStatus = vi.fn()
const listGoogleBusinessLocations = vi.fn()

vi.mock('@prisma/client', () => ({
  ContentSection: {
    hero: 'hero',
    contact: 'contact',
  },
  UserRole: {
    ADMIN: 'ADMIN',
    VIEWER: 'VIEWER',
  },
}))

vi.mock('../lib/prisma', () => ({
  prisma: {},
}))

vi.mock('../lib/redis', () => ({
  redis: {
    ping: vi.fn(),
  },
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      sub: 'admin_1',
      email: 'admin@example.com',
      role: 'ADMIN',
      iat: 0,
      exp: 0,
    }
    next()
  },
  authorize: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../lib/env', () => ({
  apiEnv: {
    storageDriver: 'local',
    apiBaseUrl: 'https://api.example.com',
    crmUrl: 'https://crm.example.com',
    corsOrigins: ['https://crm.example.com'],
  },
}))

vi.mock('../infrastructure/storage', () => ({
  healthcheckUploadStorage: vi.fn(),
}))

vi.mock('../infrastructure/emailSettings', () => ({
  getEmailSettingsOverview: vi.fn(),
  saveEmailSettings: vi.fn(),
}))

vi.mock('../infrastructure/googleCalendar', () => ({
  getGoogleCalendarConnectionStatus,
}))

vi.mock('../infrastructure/googleBusiness', () => ({
  listGoogleBusinessLocations,
  fetchGoogleBusinessReviews: vi.fn(),
}))

let adminRouter: typeof import('./admin').adminRouter

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@db.example.com:5432/app?schema=public'
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://redis.example.com:6379'
  process.env.API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.example.com'
  process.env.CRM_URL = process.env.CRM_URL ?? 'https://crm.example.com'
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'https://crm.example.com'
  process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY ?? '-----BEGIN RSA PRIVATE KEY-----\nplaceholder\n-----END RSA PRIVATE KEY-----'
  process.env.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY ?? '-----BEGIN PUBLIC KEY-----\nplaceholder\n-----END PUBLIC KEY-----'
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'test-secret'
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? '12345678901234567890123456789012'
  process.env.ANONYMIZATION_SALT = process.env.ANONYMIZATION_SALT ?? 'test-anon-salt'

  const module = await import('./admin')
  adminRouter = module.adminRouter
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /admin/google-business/locations', () => {
  it('fails explicitly when Google OAuth is not configured', async () => {
    getGoogleCalendarConnectionStatus.mockResolvedValue({
      configured: false,
      connected: false,
    })

    const app = express()
    app.use('/admin', adminRouter)
    app.use(errorHandler)

    const response = await request(app).get('/admin/google-business/locations')

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Google OAuth nao esta configurado')
    expect(listGoogleBusinessLocations).not.toHaveBeenCalled()
  })

  it('fails explicitly when Google OAuth is configured but not connected', async () => {
    getGoogleCalendarConnectionStatus.mockResolvedValue({
      configured: true,
      connected: false,
    })

    const app = express()
    app.use('/admin', adminRouter)
    app.use(errorHandler)

    const response = await request(app).get('/admin/google-business/locations')

    expect(response.status).toBe(409)
    expect(response.body.error).toContain('Google OAuth nao esta conectado')
    expect(listGoogleBusinessLocations).not.toHaveBeenCalled()
  })
})
