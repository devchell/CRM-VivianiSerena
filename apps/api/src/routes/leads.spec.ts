import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'
import { createAnalyticsSessionProof } from '../lib/analyticsSession'

process.env.ENCRYPTION_KEY = 'test-encryption-key-for-analytics-session-proofs'

const leadCreate = vi.fn()
const leadUpdate = vi.fn()
const leadUpdateMany = vi.fn()
const leadFindUnique = vi.fn()
const consentLogCreate = vi.fn()
const sessionFindUnique = vi.fn()
const sessionUpdate = vi.fn()
const sessionCreate = vi.fn()
const prismaTransaction = vi.fn()
const deletePattern = vi.fn()
const invalidateOperationalMetricCaches = vi.fn()
const emailNewLead = vi.fn()
const auditLog = vi.fn()
const deletePrivateFile = vi.fn()

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: prismaTransaction,
    lead: {
      findUnique: leadFindUnique,
      findFirst: leadFindUnique,
      update: leadUpdate,
      updateMany: leadUpdateMany,
    },
    consentLog: {
      create: consentLogCreate,
    },
  },
}))

vi.mock('../infrastructure/storage', () => ({ deletePrivateFile }))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request & { user?: { sub: string } }, _res: express.Response, next: express.NextFunction) => {
    req.user = { sub: 'user_1' }
    next()
  },
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
    log: auditLog,
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
        status: 'new',
        utmSource: 'landing_form',
        notes: 'Lead de teste',
        consentedAt: new Date('2026-03-20T12:00:00.000Z'),
        createdAt: new Date('2026-03-20T12:00:00.000Z'),
        convertedAt: null,
      }),
    },
    session: {
      findUnique: sessionFindUnique,
      update: sessionUpdate,
      create: sessionCreate,
    },
    consentLog: {
      create: consentLogCreate.mockResolvedValue({
        id: 'consent_1',
      }),
    },
  }))

  leadUpdate.mockResolvedValue({
    id: 'lead_1',
    email: 'ana@example.com',
    status: 'contacted',
    consentedAt: null,
  })
  leadUpdateMany.mockResolvedValue({ count: 0 })
  leadFindUnique.mockResolvedValue({
    email: 'ana@example.com',
    consentedAt: new Date('2026-03-20T12:00:00.000Z'),
  })
  sessionFindUnique.mockResolvedValue({
    id: 'session_1',
    referrer: null,
    userAgent: null,
    pagesVisited: [],
  })
  sessionUpdate.mockResolvedValue(undefined)
  sessionCreate.mockResolvedValue(undefined)
  deletePattern.mockResolvedValue(undefined)
  invalidateOperationalMetricCaches.mockResolvedValue(undefined)
  emailNewLead.mockResolvedValue(undefined)
  auditLog.mockResolvedValue(undefined)
})

describe('POST /leads', () => {
  it('silently accepts honeypot submissions without persisting them', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', leadsRouter)
    app.use(errorHandler)

    const response = await request(app)
      .post('/')
      .send({
        name: 'Bot',
        email: 'bot@example.com',
        source: 'organic',
        consent: true,
        website: 'https://bot.invalid',
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })
    expect(leadCreate).not.toHaveBeenCalled()
  })

  it('persists consent timestamp, LGPD consent log and links the analytics session', async () => {
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
        utmSource: 'instagram',
        capturePage: '/avaliacao',
        referrer: 'https://instagram.com/campanha',
        sessionId: 'session_1',
        sessionProof: createAnalyticsSessionProof('session_1'),
        notes: 'Lead de teste',
        consent: true,
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      success: true,
      data: { id: 'lead_1' },
    })

    const leadPayload = leadCreate.mock.calls[0][0].data
    const consentPayload = consentLogCreate.mock.calls[0][0].data

    expect(leadPayload.consentedAt).toBeInstanceOf(Date)
    expect(consentPayload.consentedAt).toBe(leadPayload.consentedAt)
    expect(consentPayload.channel).toBe('landing_form')
    expect(sessionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'session_1' },
      data: expect.objectContaining({
        leadId: 'lead_1',
        referrer: 'https://instagram.com/campanha',
        pagesVisited: ['/avaliacao'],
      }),
    }))
    expect(deletePattern).toHaveBeenCalledWith('leads:*')
    expect(invalidateOperationalMetricCaches).toHaveBeenCalledTimes(1)
  })
})

describe('POST /leads/manual', () => {
  it('creates a manual lead with consent traceability and audit log', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', leadsRouter)
    app.use(errorHandler)

    const response = await request(app)
      .post('/manual')
      .send({
        name: 'Bea',
        email: 'bea@example.com',
        phone: '11988887777',
        source: 'whatsapp',
        status: 'qualified',
        notes: 'Indicacao direta',
        consented: true,
      })

    expect(response.status).toBe(201)
    expect(leadCreate).toHaveBeenCalledTimes(1)
    expect(leadCreate.mock.calls[0][0].data).toEqual(expect.objectContaining({
      utmSource: 'manual_crm',
      status: 'qualified',
    }))
    expect(consentLogCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        channel: 'crm_manual',
      }),
    }))
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user_1',
      action: 'CREATE',
      resource: 'Lead',
    }))
  })
})

describe('PATCH /leads/:id', () => {
  it('clears convertedAt when a lead leaves converted status', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', leadsRouter)
    app.use(errorHandler)

    const response = await request(app)
      .patch('/lead_1')
      .send({
        status: 'contacted',
      })

    expect(response.status).toBe(200)
    expect(leadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead_1' },
      data: expect.objectContaining({
        status: 'contacted',
        convertedAt: null,
      }),
    }))
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user_1',
      action: 'UPDATE',
      resource: 'Lead',
      details: expect.objectContaining({ leadId: 'lead_1', mode: 'patch' }),
    }))
  })
})

describe('DELETE /leads/:id', () => {
  it('archives the lead and keeps the audit trail instead of deleting the row', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', leadsRouter)
    app.use(errorHandler)

    const response = await request(app).delete('/lead_1')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ success: true, message: 'Lead archived' })
    expect(leadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead_1' },
      data: { deletedAt: expect.any(Date) },
    }))
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DELETE',
      resource: 'Lead',
      details: { leadId: 'lead_1', mode: 'soft_delete' },
    }))
  })
})
