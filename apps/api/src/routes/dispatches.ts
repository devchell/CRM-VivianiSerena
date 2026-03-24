import { randomUUID } from 'crypto'
import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { buildCommercialLeadWhere } from '../domain/metrics/service'
import { emailService } from '../infrastructure/email'
import { getActiveEmailSettings } from '../infrastructure/emailSettings'
import { getWhatsAppChannelStatus, sendWhatsAppBusinessMessage } from '../infrastructure/whatsapp'
import { getDefaultTemplate } from '../domain/defaultTemplates'

export const dispatchesRouter: Router = Router()
dispatchesRouter.use(authenticate)

const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'converted', 'lost'])
const leadSourceSchema = z.enum(['organic', 'instagram', 'facebook', 'google_ads', 'referral', 'whatsapp', 'other'])
const activityStateSchema = z.enum(['all', 'active', 'inactive']).default('all')
const booleanFilterSchema = z.enum(['all', 'yes', 'no']).default('all')

const DEFAULT_SETTINGS = {
  emailDailyLimit: 200,
  whatsappDailyLimit: 200,
  batchSize: 25,
  pacingMs: 150,
  inactiveAfterDays: 90,
} as const

const audienceQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  activityState: activityStateSchema.optional().default('all'),
  consented: z.enum(['all', 'yes', 'no']).optional().default('all'),
  emailEligibility: booleanFilterSchema.optional().default('all'),
  whatsappEligibility: booleanFilterSchema.optional().default('all'),
  search: z.string().optional(),
})

const draftSchema = z.object({
  status: leadStatusSchema,
  emailEnabled: z.boolean().default(false),
  emailSubject: z.string().max(160).default(''),
  emailBody: z.string().max(20000).default(''),
  whatsappEnabled: z.boolean().default(false),
  whatsappBody: z.string().max(3000).default(''),
})

const settingsSchema = z.object({
  emailDailyLimit: z.number().int().min(1).max(5000),
  whatsappDailyLimit: z.number().int().min(1).max(5000),
  batchSize: z.number().int().min(1).max(200),
  pacingMs: z.number().int().min(0).max(5000),
  inactiveAfterDays: z.number().int().min(7).max(365),
})

const sendSchema = z.object({
  idempotencyKey: z.string().min(8).max(200),
  filters: audienceQuerySchema,
  draft: draftSchema,
  confirm: z.literal(true),
})

type DispatchSettings = z.infer<typeof settingsSchema>
type AudienceFilters = z.infer<typeof audienceQuerySchema>
type DraftConfig = z.infer<typeof draftSchema>
type LeadRow = {
  id: string
  name: string
  email: string
  phone: string | null
  source: z.infer<typeof leadSourceSchema>
  status: z.infer<typeof leadStatusSchema>
  notes: string | null
  utmSource: string | null
  consentedAt: Date | null
  anonymized: boolean
  createdAt: Date
}
type RecipientReason =
  | 'eligible'
  | 'missing_email'
  | 'invalid_email'
  | 'missing_number'
  | 'invalid_number'
  | 'missing_consent'
  | 'opt_out'
  | 'previous_bounce'
  | 'daily_limit'
  | 'provider_failed'
  | 'provider_unconfigured'
type ActivityState = z.infer<typeof activityStateSchema>

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function parseSettings(value: unknown): DispatchSettings {
  const parsed = settingsSchema.safeParse(value)
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS }
}

function parseDraft(status: z.infer<typeof leadStatusSchema>, value: unknown): DraftConfig {
  const parsed = draftSchema.safeParse({ ...asJsonObject(value), status })
  return parsed.success
    ? parsed.data
    : {
      status,
      emailEnabled: false,
      emailSubject: '',
      emailBody: '',
      whatsappEnabled: false,
      whatsappBody: '',
    }
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const SOURCE_NAMES: Record<string, string> = {
  organic: 'pesquisa orgânica',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_ads: 'Google Ads',
  referral: 'indicação',
  whatsapp: 'WhatsApp',
  other: 'outro canal',
}

const SERVICE_NAMES: Record<string, string> = {
  sobrancelhas: 'Sobrancelhas',
  labios_eyeliner: 'Lábios / Eyeliner',
  capilar: 'Micropigmentação capilar',
  tatuagens: 'Tatuagens',
  nao_sei: 'não sei ao certo',
}

const PERIOD_NAMES: Record<string, string> = {
  manha: 'manhã',
  tarde: 'tarde',
  qualquer: 'qualquer horário',
}

function extractNoteValue(notes: string | null, key: 'service' | 'period'): string {
  if (!notes) return ''
  const pattern = key === 'service' ? /Serviço:\s*([^|]+)/ : /Período:\s*([^|]+)/
  const raw = notes.match(pattern)?.[1]?.trim() ?? ''
  if (key === 'service') return SERVICE_NAMES[raw] ?? raw
  return PERIOD_NAMES[raw] ?? raw
}

function interpolateVariables(template: string, lead: LeadRow): string {
  return template
    .replace(/\{nome\}/gi,     lead.name ?? '')
    .replace(/\{email\}/gi,    lead.email ?? '')
    .replace(/\{telefone\}/gi, lead.phone ?? '')
    .replace(/\{servico\}/gi,  extractNoteValue(lead.notes, 'service'))
    .replace(/\{periodo\}/gi,  extractNoteValue(lead.notes, 'period'))
    .replace(/\{origem\}/gi,   SOURCE_NAMES[lead.source] ?? lead.source)
    .replace(/\{canal\}/gi,    SOURCE_NAMES[lead.utmSource ?? ''] ?? lead.utmSource ?? '')
    .replace(/\{data\}/gi,     new Date().toLocaleDateString('pt-BR'))
    .replace(/\{hora\}/gi,     new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
}

function normalizePhoneToE164(value: string | null) {
  if (!value) return null
  let digits = value.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '')
  if (!digits.startsWith('55')) {
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`
    }
  }
  if (digits.length < 12 || digits.length > 13) return null
  return `+${digits}`
}

function resolveActivityState(lead: LeadRow, settings: DispatchSettings): ActivityState {
  if (lead.status === 'converted' || lead.status === 'lost') return 'inactive'
  const cutoff = new Date(Date.now() - settings.inactiveAfterDays * 24 * 60 * 60 * 1000)
  return lead.createdAt >= cutoff ? 'active' : 'inactive'
}

function buildLeadWhere(filters: AudienceFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = buildCommercialLeadWhere()

  if (filters.status) where.status = filters.status
  if (filters.source) where.source = filters.source
  if (filters.consented === 'yes') where.consentedAt = { not: null }
  if (filters.consented === 'no') where.consentedAt = null
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.from)
    if (filters.to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(filters.to)
  }
  if (filters.search?.trim()) {
    const search = filters.search.trim()
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { notes: { contains: search, mode: 'insensitive' } },
    ]
  }

  return where
}

async function getLatestSettings() {
  const entries = await prisma.auditLog.findMany({
    where: { resource: 'DispatchSettings' },
    orderBy: { timestamp: 'desc' },
    take: 10,
  })
  const latest = entries.find((entry) => entry.action === 'UPSERT')
  return latest ? parseSettings(asJsonObject(latest.details).settings) : { ...DEFAULT_SETTINGS }
}

async function getDraftForStatus(status: z.infer<typeof leadStatusSchema>) {
  const entries = await prisma.auditLog.findMany({
    where: { resource: 'DispatchDraft' },
    orderBy: { timestamp: 'desc' },
    take: 50,
  })

  const latest = entries.find((entry) => {
    const details = asJsonObject(entry.details)
    return details.status === status
  })

  return parseDraft(status, latest ? asJsonObject(latest.details) : {})
}

async function getCampaignByIdempotencyKey(idempotencyKey: string) {
  const entries = await prisma.auditLog.findMany({
    where: { resource: 'DispatchCampaign' },
    orderBy: { timestamp: 'desc' },
    take: 100,
  })

  return entries.find((entry) => asJsonObject(entry.details).idempotencyKey === idempotencyKey) ?? null
}

async function getHistoricalDispatchLogs() {
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
  return prisma.auditLog.findMany({
    where: {
      resource: { in: ['DispatchCampaign', 'DispatchRecipient', 'DispatchReceipt'] },
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'desc' },
    take: 4000,
  })
}

function classifyEmailLead(lead: LeadRow, bouncedEmails: Set<string>): RecipientReason {
  if (lead.anonymized) return 'opt_out'
  if (!lead.email) return 'missing_email'
  if (!isValidEmail(lead.email)) return 'invalid_email'
  if (!lead.consentedAt) return 'missing_consent'
  if (bouncedEmails.has(normalizeEmail(lead.email))) return 'previous_bounce'
  return 'eligible'
}

function classifyWhatsappLead(lead: LeadRow): RecipientReason {
  if (lead.anonymized) return 'opt_out'
  if (!lead.phone) return 'missing_number'
  if (!normalizePhoneToE164(lead.phone)) return 'invalid_number'
  if (!lead.consentedAt) return 'missing_consent'
  return 'eligible'
}

async function buildAudience(filters: AudienceFilters, settings: DispatchSettings) {
  const leads = await prisma.lead.findMany({
    where: buildLeadWhere(filters),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      source: true,
      status: true,
      notes: true,
      utmSource: true,
      consentedAt: true,
      anonymized: true,
      createdAt: true,
    },
  }) as LeadRow[]

  const dispatchLogs = await getHistoricalDispatchLogs()
  const bouncedEmails = new Set(
    dispatchLogs
      .map((entry) => asJsonObject(entry.details))
      .filter((details) => details.channel === 'email' && details.reason === 'previous_bounce')
      .map((details) => normalizeEmail(String(details.email ?? '')))
      .filter(Boolean)
  )

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const sentToday = {
    email: 0,
    whatsapp: 0,
  }

  for (const entry of dispatchLogs) {
    if (entry.timestamp < dayStart) continue
    const details = asJsonObject(entry.details)
    if (details.resourceType === 'recipient' && details.attempted === true) {
      if (details.channel === 'email') sentToday.email += 1
      if (details.channel === 'whatsapp') sentToday.whatsapp += 1
    }
  }

  const rows = leads
    .map((lead) => {
      const activityState = resolveActivityState(lead, settings)
      const emailReason = classifyEmailLead(lead, bouncedEmails)
      const whatsappReason = classifyWhatsappLead(lead)
      const whatsappE164 = normalizePhoneToE164(lead.phone)

      return {
        ...lead,
        activityState,
        emailReason,
        whatsappReason,
        whatsappE164,
      }
    })
    .filter((lead) => (filters.activityState === 'all' ? true : lead.activityState === filters.activityState))
    .filter((lead) => {
      if (filters.emailEligibility === 'yes') return lead.emailReason === 'eligible'
      if (filters.emailEligibility === 'no') return lead.emailReason !== 'eligible'
      return true
    })
    .filter((lead) => {
      if (filters.whatsappEligibility === 'yes') return lead.whatsappReason === 'eligible'
      if (filters.whatsappEligibility === 'no') return lead.whatsappReason !== 'eligible'
      return true
    })

  const statusCounts = rows.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.status] = (acc[lead.status] ?? 0) + 1
    return acc
  }, {})
  const sourceCounts = rows.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.source] = (acc[lead.source] ?? 0) + 1
    return acc
  }, {})
  const activityCounts = rows.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.activityState] = (acc[lead.activityState] ?? 0) + 1
    return acc
  }, {})
  const emailReasons = rows.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.emailReason] = (acc[lead.emailReason] ?? 0) + 1
    return acc
  }, {})
  const whatsappReasons = rows.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.whatsappReason] = (acc[lead.whatsappReason] ?? 0) + 1
    return acc
  }, {})

  const [emailSettings, whatsappStatus] = await Promise.all([
    getActiveEmailSettings(),
    getWhatsAppChannelStatus(),
  ])

  return {
    rows,
    summary: {
      totalAudience: rows.length,
      reachableAnyChannel: rows.filter((lead) => lead.emailReason === 'eligible' || lead.whatsappReason === 'eligible').length,
      fullyIneligible: rows.filter((lead) => lead.emailReason !== 'eligible' && lead.whatsappReason !== 'eligible').length,
      sentToday,
      statusCounts,
      sourceCounts,
      activityCounts,
      email: {
        eligible: rows.filter((lead) => lead.emailReason === 'eligible').length,
        ineligible: rows.filter((lead) => lead.emailReason !== 'eligible').length,
        reasons: emailReasons,
        remainingToday: Math.max(settings.emailDailyLimit - sentToday.email, 0),
        providerConfigured: emailSettings.configured,
      },
      whatsapp: {
        eligible: rows.filter((lead) => lead.whatsappReason === 'eligible').length,
        ineligible: rows.filter((lead) => lead.whatsappReason !== 'eligible').length,
        reasons: whatsappReasons,
        remainingToday: Math.max(settings.whatsappDailyLimit - sentToday.whatsapp, 0),
        providerConfigured: whatsappStatus.connected,
      },
    },
    sample: rows.slice(0, 100),
  }
}

dispatchesRouter.get('/settings', authorizePermission('leads.broadcast'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await getLatestSettings() })
  } catch (error) {
    next(error)
  }
})

dispatchesRouter.put('/settings', authorizePermission('leads.broadcast'), async (req, res, next) => {
  try {
    if (!req.user?.sub) throw new AppError(401, 'Authentication required')
    const settings = settingsSchema.parse(req.body)

    await prisma.auditLog.create({
      data: {
        userId: req.user.sub,
        action: 'UPSERT',
        resource: 'DispatchSettings',
        ip: req.ip,
        details: { settings } as Prisma.InputJsonObject,
      },
    })

    res.json({ success: true, data: settings })
  } catch (error) {
    next(error)
  }
})

dispatchesRouter.get('/drafts/:status', authorizePermission('leads.broadcast'), async (req, res, next) => {
  try {
    const status = leadStatusSchema.parse(String(req.params.status))
    res.json({ success: true, data: await getDraftForStatus(status) })
  } catch (error) {
    next(error)
  }
})

dispatchesRouter.put('/drafts/:status', authorizePermission('leads.broadcast'), async (req, res, next) => {
  try {
    if (!req.user?.sub) throw new AppError(401, 'Authentication required')
    const status = leadStatusSchema.parse(String(req.params.status))
    const draft = draftSchema.parse({ ...req.body, status })

    await prisma.auditLog.create({
      data: {
        userId: req.user.sub,
        action: 'UPSERT',
        resource: 'DispatchDraft',
        ip: req.ip,
        details: draft as unknown as Prisma.InputJsonObject,
      },
    })

    res.json({ success: true, data: draft })
  } catch (error) {
    next(error)
  }
})

dispatchesRouter.get('/audience', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const filters = audienceQuerySchema.parse(req.query)
    const settings = await getLatestSettings()
    const audience = await buildAudience(filters, settings)
    res.json({ success: true, data: { filters, settings, ...audience } })
  } catch (error) {
    next(error)
  }
})

dispatchesRouter.get('/history', authorizePermission('leads.view'), async (_req, res, next) => {
  try {
    const logs = await getHistoricalDispatchLogs()
    const campaigns = logs
      .filter((entry) => entry.resource === 'DispatchCampaign')
      .map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        ...asJsonObject(entry.details),
      }))
      .slice(0, 30)

    const recipientLogs = logs
      .filter((entry) => entry.resource === 'DispatchRecipient' || entry.resource === 'DispatchReceipt')
      .map((entry) => asJsonObject(entry.details))

    const bySource = recipientLogs.reduce<Record<string, number>>((acc, item) => {
      const source = String(item.source ?? 'other')
      acc[source] = (acc[source] ?? 0) + 1
      return acc
    }, {})
    const byStatus = recipientLogs.reduce<Record<string, number>>((acc, item) => {
      const status = String(item.leadStatus ?? 'unknown')
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    }, {})
    const byEligibility = recipientLogs.reduce<Record<string, number>>((acc, item) => {
      const key = `${String(item.channel ?? 'unknown')}:${String(item.reason ?? 'unknown')}`
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    const byPeriod = recipientLogs.reduce<Record<string, number>>((acc, item) => {
      const date = String(item.sentAt ?? item.timestamp ?? '').slice(0, 10) || 'unknown'
      acc[date] = (acc[date] ?? 0) + 1
      return acc
    }, {})

    res.json({
      success: true,
      data: {
        campaigns,
        reports: {
          bySource,
          byStatus,
          byEligibility,
          byPeriod,
          optOut: recipientLogs.filter((item) => item.reason === 'opt_out').length,
          inactive: recipientLogs.filter((item) => item.activityState === 'inactive').length,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

dispatchesRouter.get('/export', authorizePermission('leads.export'), async (req, res, next) => {
  try {
    const filters = audienceQuerySchema.parse(req.query)
    const settings = await getLatestSettings()
    const audience = await buildAudience(filters, settings)

    const rows = audience.rows.map((lead) => [
      lead.name,
      lead.email,
      lead.phone ?? '',
      lead.source,
      lead.status,
      lead.activityState,
      lead.emailReason,
      lead.whatsappReason,
      lead.whatsappE164 ?? '',
      lead.utmSource ?? '',
      lead.createdAt.toISOString(),
    ])

    const csv = [
      ['Nome', 'Email', 'Telefone', 'Origem', 'Status', 'Atividade', 'Email', 'WhatsApp', 'WhatsApp E164', 'Origem detalhada', 'Criado em'],
      ...rows,
    ].map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="dispatch-audience-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send('\uFEFF' + csv)
  } catch (error) {
    next(error)
  }
})

dispatchesRouter.post('/send', authorizePermission('leads.broadcast'), async (req, res, next) => {
  try {
    if (!req.user?.sub) throw new AppError(401, 'Authentication required')
    const input = sendSchema.parse(req.body)
    if (!input.draft.emailEnabled && !input.draft.whatsappEnabled) {
      throw new AppError(400, 'Nenhum canal habilitado para o disparo')
    }
    const existing = await getCampaignByIdempotencyKey(input.idempotencyKey)
    if (existing) {
      res.json({ success: true, data: asJsonObject(existing.details) })
      return
    }

    const settings = await getLatestSettings()
    const audience = await buildAudience(input.filters, settings)
    const emailProvider = await getActiveEmailSettings()
    const campaignId = randomUUID()

    // Load saved or default templates as fallback
    const savedEmailTemplate = input.draft.emailEnabled
      ? await prisma.leadStatusTemplate.findUnique({ where: { status_channel: { status: input.draft.status, channel: 'email' } } })
      : null
    const savedWhatsappTemplate = input.draft.whatsappEnabled
      ? await prisma.leadStatusTemplate.findUnique({ where: { status_channel: { status: input.draft.status, channel: 'whatsapp' } } })
      : null
    const defaultEmail = getDefaultTemplate(input.draft.status, 'email')
    const defaultWhatsapp = getDefaultTemplate(input.draft.status, 'whatsapp')

    const effectiveEmailSubject = input.draft.emailSubject || savedEmailTemplate?.subject || defaultEmail?.subject || `Contato Viviani Serena - ${input.draft.status}`
    const effectiveEmailBody = input.draft.emailBody || savedEmailTemplate?.body || defaultEmail?.body || ''
    const effectiveWhatsappBody = input.draft.whatsappBody || savedWhatsappTemplate?.body || defaultWhatsapp?.body || ''

    const emailCandidates = input.draft.emailEnabled
      ? audience.rows.filter((lead) => lead.emailReason === 'eligible')
      : []
    const whatsappCandidates = input.draft.whatsappEnabled
      ? audience.rows.filter((lead) => lead.whatsappReason === 'eligible')
      : []
    const emailAllowed = emailCandidates.slice(0, Math.min(audience.summary.email.remainingToday, settings.batchSize))
    const whatsappAllowed = whatsappCandidates.slice(0, Math.min(audience.summary.whatsapp.remainingToday, settings.batchSize))
    const recipientSummaries: Array<Record<string, unknown>> = []
    const reachableLeadIds = new Set([
      ...emailCandidates.map((lead) => lead.id),
      ...whatsappCandidates.map((lead) => lead.id),
    ])

    for (const lead of emailAllowed) {
      const success = emailProvider.configured
        ? await emailService.sendCampaignMessage({
          to: lead.email,
          subject: interpolateVariables(effectiveEmailSubject, lead),
          title: 'Viviani Serena',
          body: interpolateVariables(effectiveEmailBody, lead),
        })
        : false

      const summary = {
        resourceType: 'recipient',
        campaignId,
        channel: 'email',
        leadId: lead.id,
        email: normalizeEmail(lead.email),
        source: lead.source,
        leadStatus: lead.status,
        activityState: lead.activityState,
        reason: success ? 'eligible' : (emailProvider.configured ? 'provider_failed' : 'provider_unconfigured'),
        status: success ? 'sent' : 'provider_failed',
        attempted: true,
        sentAt: new Date().toISOString(),
      }
      recipientSummaries.push(summary)
      await prisma.auditLog.create({
        data: {
          userId: req.user.sub,
          action: success ? 'SENT' : 'FAILED',
          resource: 'DispatchRecipient',
          ip: req.ip,
          details: summary as Prisma.InputJsonObject,
        },
      })

      if (settings.pacingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, settings.pacingMs))
      }
    }

    for (const lead of emailCandidates.slice(emailAllowed.length)) {
      const summary = {
        resourceType: 'recipient',
        campaignId,
        channel: 'email',
        leadId: lead.id,
        email: normalizeEmail(lead.email),
        source: lead.source,
        leadStatus: lead.status,
        activityState: lead.activityState,
        reason: 'daily_limit',
        status: 'blocked',
        attempted: false,
        timestamp: new Date().toISOString(),
      }
      recipientSummaries.push(summary)
      await prisma.auditLog.create({
        data: {
          userId: req.user.sub,
          action: 'BLOCKED',
          resource: 'DispatchRecipient',
          ip: req.ip,
          details: summary as Prisma.InputJsonObject,
        },
      })
    }

    for (const lead of whatsappAllowed) {
      let providerMessageId: string | null = null
      let providerFailed = true
      let providerReason: RecipientReason = 'provider_failed'
      try {
        const response = await sendWhatsAppBusinessMessage({
          to: lead.whatsappE164 ?? '',
          body: interpolateVariables(effectiveWhatsappBody, lead),
        })
        providerMessageId = response.providerMessageId
        providerFailed = false
        providerReason = 'eligible'
      } catch (error) {
        providerFailed = true
        providerReason = error instanceof AppError && error.statusCode === 409
          ? 'provider_unconfigured'
          : 'provider_failed'
      }

      const summary = {
        resourceType: 'recipient',
        campaignId,
        channel: 'whatsapp',
        leadId: lead.id,
        phone: normalizeOptionalText(lead.phone),
        whatsappE164: lead.whatsappE164,
        providerMessageId,
        source: lead.source,
        leadStatus: lead.status,
        activityState: lead.activityState,
        reason: providerFailed ? providerReason : 'eligible',
        status: providerFailed ? 'provider_failed' : 'sent',
        attempted: true,
        sentAt: new Date().toISOString(),
      }
      recipientSummaries.push(summary)
      await prisma.auditLog.create({
        data: {
          userId: req.user.sub,
          action: providerFailed ? 'FAILED' : 'SENT',
          resource: 'DispatchRecipient',
          ip: req.ip,
          details: summary as Prisma.InputJsonObject,
        },
      })

      if (settings.pacingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, settings.pacingMs))
      }
    }

    for (const lead of whatsappCandidates.slice(whatsappAllowed.length)) {
      const summary = {
        resourceType: 'recipient',
        campaignId,
        channel: 'whatsapp',
        leadId: lead.id,
        phone: normalizeOptionalText(lead.phone),
        whatsappE164: lead.whatsappE164,
        source: lead.source,
        leadStatus: lead.status,
        activityState: lead.activityState,
        reason: 'daily_limit',
        status: 'blocked',
        attempted: false,
        timestamp: new Date().toISOString(),
      }
      recipientSummaries.push(summary)
      await prisma.auditLog.create({
        data: {
          userId: req.user.sub,
          action: 'BLOCKED',
          resource: 'DispatchRecipient',
          ip: req.ip,
          details: summary as Prisma.InputJsonObject,
        },
      })
    }

    const payload = {
      campaignId,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
      filters: input.filters,
      draft: input.draft,
      limits: settings,
      totals: {
        totalAudience: audience.summary.totalAudience,
        emailEligible: emailCandidates.length,
        emailSent: recipientSummaries.filter((item) => item.channel === 'email' && item.status === 'sent').length,
        emailBlocked: recipientSummaries.filter((item) => item.channel === 'email' && item.status === 'blocked').length,
        emailFailed: recipientSummaries.filter((item) => item.channel === 'email' && item.status === 'provider_failed').length,
        whatsappEligible: whatsappCandidates.length,
        whatsappSent: recipientSummaries.filter((item) => item.channel === 'whatsapp' && item.status === 'sent').length,
        whatsappBlocked: recipientSummaries.filter((item) => item.channel === 'whatsapp' && item.status === 'blocked').length,
        whatsappFailed: recipientSummaries.filter((item) => item.channel === 'whatsapp' && item.status === 'provider_failed').length,
        ineligible: Math.max(audience.summary.totalAudience - reachableLeadIds.size, 0),
      },
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.sub,
        action: 'SEND',
        resource: 'DispatchCampaign',
        ip: req.ip,
        details: payload as unknown as Prisma.InputJsonObject,
      },
    })

    res.status(201).json({ success: true, data: payload })
  } catch (error) {
    next(error)
  }
})
