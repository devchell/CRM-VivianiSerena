import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const leadFindFirst = vi.fn()
const consentLogFindMany = vi.fn()
const auditLog = vi.fn()

vi.mock('../lib/prisma', () => ({
  prisma: {
    lead: {
      findFirst: leadFindFirst,
    },
    consentLog: {
      findMany: consentLogFindMany,
    },
  },
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      sub: 'admin_1',
      email: 'admin@example.com',
      role: 'ADMIN',
      permissions: ['privacy.manage'],
      iat: 0,
      exp: 0,
    }
    next()
  },
  authorizePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../infrastructure/security/EncryptionService', () => ({
  EncryptionService: {
    anonymize: vi.fn(() => 'masked'),
  },
}))

vi.mock('../infrastructure/security/AuditLogger', () => ({
  AuditLogger: {
    log: auditLog,
  },
}))

let privacyRouter: typeof import('./privacy').privacyRouter

beforeAll(async () => {
  const module = await import('./privacy')
  privacyRouter = module.privacyRouter
})

beforeEach(() => {
  vi.clearAllMocks()

  leadFindFirst.mockResolvedValue({
    id: 'lead_1',
    name: 'Ana',
    email: 'ana@example.com',
    phone: '11999999999',
    source: 'instagram',
    createdAt: new Date('2026-03-20T12:00:00.000Z'),
    status: 'new',
    notes: 'Lead de teste',
    consentedAt: new Date('2026-03-20T12:00:00.000Z'),
    sessions: [],
    appointments: [],
  })

  consentLogFindMany.mockResolvedValue([
    {
      channel: 'landing_form',
      policyVersion: '2026-03-20',
      consentText: 'Lead enviado voluntariamente pelo formulario publico para contato comercial.',
      consentedAt: new Date('2026-03-20T12:00:00.000Z'),
      ipAddress: '127.0.0.0',
    },
  ])
})

describe('GET /privacy/export', () => {
  it('exports consent timestamp and consent log history for LGPD requests', async () => {
    const app = express()
    app.use('/privacy', privacyRouter)
    app.use(errorHandler)

    const response = await request(app)
      .get('/privacy/export')
      .query({ email: 'ana@example.com' })

    expect(response.status).toBe(200)
    expect(response.body.personalData.email).toBe('ana@example.com')
    expect(response.body.personalData.consentedAt).toBe('2026-03-20T12:00:00.000Z')
    expect(response.body.consentLogs).toHaveLength(1)
    expect(response.body.consentLogs[0]).toMatchObject({
      channel: 'landing_form',
      policyVersion: '2026-03-20',
      ipAddress: '127.0.0.0',
    })
    expect(auditLog).toHaveBeenCalledTimes(1)
  })
})
