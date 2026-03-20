import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const auditLogFindMany = vi.fn()
const auditLogCreate = vi.fn()
const leadFindMany = vi.fn()
const getActiveEmailSettings = vi.fn()
const sendCampaignMessage = vi.fn()

let settingsLogs: Array<Record<string, unknown>> = []
let draftLogs: Array<Record<string, unknown>> = []
let campaignLogs: Array<Record<string, unknown>> = []
let dispatchLogs: Array<Record<string, unknown>> = []

vi.mock('../lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: auditLogFindMany,
      create: auditLogCreate,
    },
    lead: {
      findMany: leadFindMany,
    },
  },
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request & { user?: { sub: string } }, _res: express.Response, next: express.NextFunction) => {
    req.user = { sub: 'user_1' }
    next()
  },
  authorizePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../domain/metrics/service', () => ({
  buildCommercialLeadWhere: () => ({}),
}))

vi.mock('../infrastructure/emailSettings', () => ({
  getActiveEmailSettings,
}))

vi.mock('../infrastructure/email', () => ({
  emailService: {
    sendCampaignMessage,
  },
}))

let dispatchesRouter: typeof import('./dispatches').dispatchesRouter

beforeAll(async () => {
  const module = await import('./dispatches')
  dispatchesRouter = module.dispatchesRouter
})

beforeEach(() => {
  vi.clearAllMocks()
  settingsLogs = []
  draftLogs = []
  campaignLogs = []
  dispatchLogs = []

  auditLogFindMany.mockImplementation(async ({ where }: { where?: { resource?: unknown } }) => {
    const resource = where?.resource
    if (resource === 'DispatchSettings') return settingsLogs
    if (resource === 'DispatchDraft') return draftLogs
    if (resource === 'DispatchCampaign') return campaignLogs
    if (resource && typeof resource === 'object' && Array.isArray((resource as { in?: unknown[] }).in)) {
      return dispatchLogs
    }
    return []
  })

  auditLogCreate.mockResolvedValue({ id: 'audit_1' })
  getActiveEmailSettings.mockResolvedValue({ configured: false })
  sendCampaignMessage.mockResolvedValue(true)
})

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', dispatchesRouter)
  app.use(errorHandler)
  return app
}

describe('GET /dispatches/audience', () => {
  it('builds eligibility and unique ineligible counts from the canonical leads base', async () => {
    const now = new Date('2026-03-20T12:00:00.000Z')
    dispatchLogs = [
      {
        id: 'recipient_1',
        resource: 'DispatchRecipient',
        timestamp: now,
        details: {
          resourceType: 'recipient',
          channel: 'email',
          attempted: true,
          email: 'bounce@example.com',
          reason: 'previous_bounce',
        },
      },
    ]

    leadFindMany.mockResolvedValue([
      {
        id: 'lead_1',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '11999990000',
        source: 'instagram',
        status: 'new',
        notes: null,
        utmSource: 'landing_form',
        consentedAt: new Date('2026-03-20T09:00:00.000Z'),
        anonymized: false,
        createdAt: now,
      },
      {
        id: 'lead_2',
        name: 'Bea',
        email: 'email-invalido',
        phone: null,
        source: 'organic',
        status: 'new',
        notes: null,
        utmSource: 'blog',
        consentedAt: null,
        anonymized: false,
        createdAt: now,
      },
      {
        id: 'lead_3',
        name: 'Caio',
        email: 'bounce@example.com',
        phone: '11911112222',
        source: 'whatsapp',
        status: 'new',
        notes: null,
        utmSource: 'manual',
        consentedAt: new Date('2026-03-20T09:00:00.000Z'),
        anonymized: false,
        createdAt: now,
      },
    ])

    const response = await request(createApp()).get('/audience').query({ status: 'new' })

    expect(response.status).toBe(200)
    expect(response.body.data.summary).toMatchObject({
      totalAudience: 3,
      reachableAnyChannel: 2,
      fullyIneligible: 1,
      email: {
        eligible: 1,
        ineligible: 2,
        providerConfigured: false,
      },
      whatsapp: {
        eligible: 2,
        ineligible: 1,
        providerConfigured: false,
      },
    })
    expect(response.body.data.sample[0]).toMatchObject({
      id: 'lead_1',
      whatsappE164: '+5511999990000',
    })
    expect(response.body.data.sample[2]).toMatchObject({
      id: 'lead_3',
      emailReason: 'previous_bounce',
    })
  })
})

describe('POST /dispatches/send', () => {
  it('respects batch size, preserves unique ineligible count and logs blocked recipients', async () => {
    settingsLogs = [
      {
        id: 'settings_1',
        action: 'UPSERT',
        resource: 'DispatchSettings',
        timestamp: new Date('2026-03-20T10:00:00.000Z'),
        details: {
          settings: {
            emailDailyLimit: 5,
            whatsappDailyLimit: 5,
            batchSize: 1,
            pacingMs: 0,
            inactiveAfterDays: 90,
          },
        },
      },
    ]

    leadFindMany.mockResolvedValue([
      {
        id: 'lead_1',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '11999990000',
        source: 'instagram',
        status: 'new',
        notes: null,
        utmSource: 'landing_form',
        consentedAt: new Date('2026-03-20T09:00:00.000Z'),
        anonymized: false,
        createdAt: new Date('2026-03-20T12:00:00.000Z'),
      },
      {
        id: 'lead_2',
        name: 'Bea',
        email: 'bea@example.com',
        phone: '11988887777',
        source: 'organic',
        status: 'new',
        notes: null,
        utmSource: 'blog',
        consentedAt: new Date('2026-03-20T09:00:00.000Z'),
        anonymized: false,
        createdAt: new Date('2026-03-20T12:00:00.000Z'),
      },
    ])

    const response = await request(createApp())
      .post('/send')
      .send({
        idempotencyKey: 'dispatch-12345678',
        confirm: true,
        filters: { status: 'new' },
        draft: {
          status: 'new',
          emailEnabled: true,
          emailSubject: 'Campanha',
          emailBody: 'Mensagem',
          whatsappEnabled: true,
          whatsappBody: 'Oi!',
        },
      })

    expect(response.status).toBe(201)
    expect(response.body.data.totals).toMatchObject({
      totalAudience: 2,
      emailEligible: 2,
      emailFailed: 1,
      emailBlocked: 1,
      whatsappEligible: 2,
      whatsappFailed: 1,
      whatsappBlocked: 1,
      ineligible: 0,
    })
    expect(sendCampaignMessage).not.toHaveBeenCalled()
    expect(auditLogCreate).toHaveBeenCalledTimes(5)
  })

  it('returns the previous payload when the idempotency key already exists', async () => {
    campaignLogs = [
      {
        id: 'campaign_1',
        resource: 'DispatchCampaign',
        timestamp: new Date('2026-03-20T13:00:00.000Z'),
        details: {
          campaignId: 'campaign_1',
          idempotencyKey: 'dispatch-duplicate',
          totals: { totalAudience: 4 },
        },
      },
    ]

    const response = await request(createApp())
      .post('/send')
      .send({
        idempotencyKey: 'dispatch-duplicate',
        confirm: true,
        filters: { status: 'new' },
        draft: {
          status: 'new',
          emailEnabled: true,
          emailSubject: 'Campanha',
          emailBody: 'Mensagem',
          whatsappEnabled: false,
          whatsappBody: '',
        },
      })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      campaignId: 'campaign_1',
      idempotencyKey: 'dispatch-duplicate',
    })
    expect(auditLogCreate).not.toHaveBeenCalled()
  })
})
