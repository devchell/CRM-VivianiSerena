import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const leadCreate = vi.fn()
const consentLogCreate = vi.fn()
const prismaTransaction = vi.fn()
const deletePattern = vi.fn()
const invalidateOperationalMetricCaches = vi.fn()
const emailNewLead = vi.fn()

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: prismaTransaction,
  },
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../lib/redis', () => ({
  deletePattern,
}))

vi.mock('../infrastructure/email', () => ({
  emailService: {
    newLead: emailNewLead,
  },
}))

vi.mock('../domain/metrics/cache', () => ({
  invalidateOperationalMetricCaches,
}))

vi.mock('../domain/metrics/service', () => ({
  buildCommercialLeadWhere: () => ({}),
  getLeadMetrics: vi.fn(),
}))

vi.mock('../infrastructure/security/EncryptionService', () => ({
  EncryptionService: {
    anonymize: vi.fn((value: string) => `anon-${value}`),
  },
}))

vi.mock('../infrastructure/security/AuditLogger', () => ({
  AuditLogger: {
    log: vi.fn(),
  },
}))

let leadsRouter: typeof import('./leads').leadsRouter

beforeAll(async () => {
  const module = await import('./leads')
  leadsRouter = module.leadsRouter
})

beforeEach(() => {
  vi.clearAllMocks()

  prismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    lead: {
      create: leadCreate.mockResolvedValue({
        id: 'lead_1',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '11999999999',
        source: 'instagram',
        createdAt: new Date('2026-03-20T12:00:00.000Z'),
      }),
    },
    consentLog: {
      create: consentLogCreate.mockResolvedValue({
        id: 'consent_1',
      }),
    },
  }))

  deletePattern.mockResolvedValue(undefined)
  invalidateOperationalMetricCaches.mockResolvedValue(undefined)
  emailNewLead.mockResolvedValue(undefined)
})

describe('POST /leads', () => {
  it('persists consent timestamp and LGPD consent log for public lead capture', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', leadsRouter)
    app.use(errorHandler)

    const response = await request(app)
      .post('/')
      .send({
        name: 'Ana',
        email: 'ana@example.com',
        phone: '11999999999',
        source: 'instagram',
        notes: 'Lead de teste',
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      success: true,
      data: { id: 'lead_1' },
    })

    expect(leadCreate).toHaveBeenCalledTimes(1)
    expect(consentLogCreate).toHaveBeenCalledTimes(1)

    const leadPayload = leadCreate.mock.calls[0][0].data
    const consentPayload = consentLogCreate.mock.calls[0][0].data

    expect(leadPayload.consentedAt).toBeInstanceOf(Date)
    expect(consentPayload.consentedAt).toBe(leadPayload.consentedAt)
    expect(consentPayload.email).toBe('ana@example.com')
    expect(consentPayload.channel).toBe('landing_form')
    expect(consentPayload.policyVersion).toBe('2026-03-20')
    expect(typeof consentPayload.ipAddress).toBe('string')
    expect(deletePattern).toHaveBeenCalledWith('leads:*')
    expect(invalidateOperationalMetricCaches).toHaveBeenCalledTimes(1)
  })
})
