import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { deletePattern } from '../lib/redis'
import { anonymizeIp } from '../middleware/security'
import { emailService } from '../infrastructure/email'
import { EncryptionService } from '../infrastructure/security/EncryptionService'
import { AuditLogger } from '../infrastructure/security/AuditLogger'
import { buildCommercialLeadWhere, getLeadMetrics } from '../domain/metrics/service'
import { invalidateOperationalMetricCaches } from '../domain/metrics/cache'
import { logger } from '../lib/logger'
import { publicLeadRateLimiter } from '../middleware/rateLimiter'
import { isValidAnalyticsSession } from '../lib/analyticsSession'
import { deletePrivateFile } from '../infrastructure/storage'

export const leadsRouter: Router = Router()

const LEAD_PRIVACY_POLICY_VERSION = '2026-03-20'
const LEAD_CONSENT_TEXT = 'Lead enviado voluntariamente pelo formulario publico para contato comercial.'
const leadSourceSchema = z.enum(['organic', 'instagram', 'facebook', 'google_ads', 'referral', 'whatsapp', 'other'])
const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'converted', 'lost'])

const createLeadSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  source: leadSourceSchema,
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  capturePage: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  sessionId: z.string().max(64).optional(),
  sessionProof: z.string().length(64).optional(),
  notes: z.string().max(1000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consentimento é obrigatório' }) }),
  website: z.string().max(200).optional(),
})

const manualLeadSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  source: leadSourceSchema,
  sourceDetail: z.string().max(120).optional(),
  status: leadStatusSchema.optional().default('new'),
  notes: z.string().optional(),
  consented: z.boolean().optional().default(false),
})

const updateLeadSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: leadSourceSchema.optional(),
  sourceDetail: z.string().max(120).optional(),
  status: leadStatusSchema.optional(),
  notes: z.string().optional(),
  consentedAt: z.string().datetime().nullable().optional(),
})

const leadQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(200).optional().default(20),
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
  sourceDetail: z.string().optional(),
  consented: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

const leadStatsQuerySchema = leadQuerySchema.extend({
  days: z.coerce.number().int().positive().optional().default(30),
})

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function resolveConvertedAt(status?: z.infer<typeof leadStatusSchema>) {
  if (status === undefined) return undefined
  return status === 'converted' ? new Date() : null
}

function buildLeadWhere(input: z.infer<typeof leadQuerySchema>): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = buildCommercialLeadWhere()

  if (input.status) where.status = input.status
  if (input.source) where.source = input.source
  if (input.consented) where.consentedAt = input.consented === 'true' ? { not: null } : null
  if (input.sourceDetail?.trim()) {
    where.utmSource = { equals: input.sourceDetail.trim(), mode: 'insensitive' }
  }
  if (input.from || input.to) {
    where.createdAt = {}
    if (input.from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(input.from)
    if (input.to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(input.to)
  }
  if (input.search?.trim()) {
    const search = input.search.trim()
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { notes: { contains: search, mode: 'insensitive' } },
    ]
  }

  return where
}

function normalizeLeadMutation(data: z.infer<typeof updateLeadSchema>) {
  const updateData: Record<string, unknown> = {
    ...data,
    phone: data.phone === undefined ? undefined : normalizeOptionalText(data.phone),
    notes: data.notes === undefined ? undefined : normalizeOptionalText(data.notes),
    utmSource: data.sourceDetail === undefined ? undefined : normalizeOptionalText(data.sourceDetail),
    consentedAt: data.consentedAt === undefined ? undefined : (data.consentedAt ? new Date(data.consentedAt) : null),
  }

  delete updateData.sourceDetail

  const convertedAt = resolveConvertedAt(data.status)
  if (convertedAt !== undefined) updateData.convertedAt = convertedAt

  return updateData
}

async function getLeadStatsForWhere(where: Prisma.LeadWhereInput) {
  const [total, converted, byStatus, bySource] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: 'converted' } }),
    prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['source'], where, _count: { _all: true } }),
  ])

  return {
    total,
    recent: total,
    converted,
    convertedInPeriod: converted,
    conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    byStatus,
    bySource,
    period: 'filtered',
  }
}

leadsRouter.post('/', publicLeadRateLimiter, async (req, res, next) => {
  try {
    const data = createLeadSchema.parse(req.body)
    if (data.website !== undefined && data.website !== '') {
      return res.json({ success: true })
    }

    const consentedAt = new Date()
    const anonymizedIp = anonymizeIp(req.ip ?? '0.0.0.0')
    const lead = await prisma.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: normalizeOptionalText(data.phone),
          source: data.source,
          utmSource: normalizeOptionalText(data.utmSource) ?? 'landing_form',
          utmMedium: normalizeOptionalText(data.utmMedium),
          utmCampaign: normalizeOptionalText(data.utmCampaign),
          notes: normalizeOptionalText(data.notes),
          consentedAt,
        },
      })

      const capturePage = normalizeOptionalText(data.capturePage)
      const referrer = normalizeOptionalText(data.referrer) ?? normalizeOptionalText(req.get('referer'))
      if (isValidAnalyticsSession(data.sessionId, data.sessionProof)) {
        const existingSession = await tx.session.findUnique({ where: { id: data.sessionId } })
        if (existingSession) {
          const pages = Array.isArray(existingSession.pagesVisited)
            ? [...(existingSession.pagesVisited as string[])]
            : []
          if (capturePage && !pages.includes(capturePage)) pages.push(capturePage)

          await tx.session.update({
            where: { id: existingSession.id },
            data: {
              leadId: createdLead.id,
              referrer: referrer ?? existingSession.referrer,
              userAgent: existingSession.userAgent ?? req.get('user-agent') ?? null,
              pagesVisited: pages,
            },
          })
        }
      } else if (capturePage || referrer) {
        await tx.session.create({
          data: {
            leadId: createdLead.id,
            ip: anonymizedIp,
            userAgent: req.get('user-agent') ?? null,
            referrer,
            pagesVisited: capturePage ? [capturePage] : [],
          },
        })
      }

      await tx.consentLog.create({
        data: {
          email: createdLead.email,
          ipAddress: anonymizedIp,
          policyVersion: LEAD_PRIVACY_POLICY_VERSION,
          consentText: LEAD_CONSENT_TEXT,
          consentedAt,
          channel: 'landing_form',
        },
      })

      return createdLead
    })

    emailService.newLead({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? undefined,
      source: lead.source,
    }).catch((error: unknown) => {
      logger.warn('Lead notification could not be sent', {
        error: error instanceof Error ? error.message : 'unknown error',
      })
    })

    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    return res.status(201).json({ success: true, data: { id: lead.id } })
  } catch (error) {
    return next(error)
  }
})

leadsRouter.use(authenticate)

leadsRouter.post('/manual', authorizePermission('leads.create'), async (req, res, next) => {
  try {
    const data = manualLeadSchema.parse(req.body)
    if (!req.user) throw new AppError(401, 'Authentication required')

    const consentedAt = data.consented ? new Date() : null
    const lead = await prisma.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: normalizeOptionalText(data.phone),
          source: data.source,
          utmSource: normalizeOptionalText(data.sourceDetail) ?? 'manual_crm',
          status: data.status,
          notes: normalizeOptionalText(data.notes),
          consentedAt,
          convertedAt: data.status === 'converted' ? new Date() : null,
        },
      })

      if (consentedAt) {
        await tx.consentLog.create({
          data: {
            email: createdLead.email,
            ipAddress: anonymizeIp(req.ip ?? '0.0.0.0'),
            policyVersion: LEAD_PRIVACY_POLICY_VERSION,
            consentText: 'Lead cadastrado manualmente no CRM com consentimento operacional registrado.',
            consentedAt,
            channel: 'crm_manual',
          },
        })
      }

      return createdLead
    })

    await AuditLogger.log({
      userId: req.user.sub,
      action: 'CREATE',
      resource: 'Lead',
      details: { leadId: lead.id, origin: 'manual_crm', source: lead.source },
      ip: req.ip,
    })

    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.status(201).json({ success: true, data: lead })
  } catch (error) {
    next(error)
  }
})

leadsRouter.get('/', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const query = leadQuerySchema.parse(req.query)
    const skip = (query.page - 1) * query.limit
    const where = buildLeadWhere(query)

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({ where, skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
      prisma.lead.count({ where }),
    ])

    res.json({
      success: true,
      data: leads,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    })
  } catch (error) {
    next(error)
  }
})

leadsRouter.get('/stats', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const query = leadStatsQuerySchema.parse(req.query)
    const hasFilters = Boolean(
      query.status || query.source || query.sourceDetail || query.consented || query.search || query.from || query.to
    )

    if (hasFilters) {
      res.json({ success: true, data: await getLeadStatsForWhere(buildLeadWhere(query)) })
      return
    }

    const metrics = await getLeadMetrics(query.days === 30 ? 'last30d' : 'month')
    res.json({
      success: true,
      data: {
        total: metrics.total,
        recent: metrics.createdInPeriod,
        converted: metrics.converted,
        convertedInPeriod: metrics.convertedInPeriod,
        conversionRate: metrics.conversionRate,
        byStatus: metrics.byStatus,
        bySource: metrics.bySource,
        period: String(query.days) + 'd',
      },
    })
  } catch (error) {
    next(error)
  }
})

leadsRouter.get('/export', authorizePermission('leads.export'), async (req, res, next) => {
  try {
    const query = leadQuerySchema.parse(req.query)
    const where = buildLeadWhere(query)
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        email: true,
        phone: true,
        source: true,
        status: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        notes: true,
        consentedAt: true,
        createdAt: true,
        convertedAt: true,
      },
    })

    const headers = [
      'Nome',
      'Email',
      'Telefone',
      'Origem',
      'Status',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'Consentido em',
      'Notas',
      'Criado em',
      'Convertido em',
    ]
    const rows = leads.map((lead) => [
      lead.name,
      lead.email,
      lead.phone ?? '',
      lead.source,
      lead.status,
      lead.utmSource ?? '',
      lead.utmMedium ?? '',
      lead.utmCampaign ?? '',
      lead.consentedAt?.toISOString() ?? '',
      lead.notes ?? '',
      lead.createdAt.toISOString(),
      lead.convertedAt?.toISOString() ?? '',
    ])
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map((row) => row.map((cell) => escape(String(cell))).join(',')).join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send('\uFEFF' + csv)
  } catch (error) {
    next(error)
  }
})

leadsRouter.patch('/bulk', authorizePermission('leads.update'), async (req, res, next) => {
  try {
    const { ids, updates } = req.body as { ids?: unknown; updates?: unknown }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids obrigatório' })
    }
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates obrigatório' })
    }
    const allowed = ['status', 'source']
    const safeUpdates = Object.fromEntries(
      Object.entries(updates as Record<string, unknown>).filter(([k]) => allowed.includes(k))
    )
    if (safeUpdates.status) {
      const parsed = leadStatusSchema.safeParse(safeUpdates.status)
      if (!parsed.success) return res.status(400).json({ error: 'status inválido' })
      safeUpdates.status = parsed.data
      if (parsed.data === 'converted') safeUpdates.convertedAt = new Date()
    }
    if (safeUpdates.source) {
      const parsed = leadSourceSchema.safeParse(safeUpdates.source)
      if (!parsed.success) return res.status(400).json({ error: 'source inválido' })
      safeUpdates.source = parsed.data
    }
    const result = await prisma.lead.updateMany({
      where: { id: { in: ids as string[] }, deletedAt: null },
      data: safeUpdates,
    })
    if (req.user?.sub) {
      await AuditLogger.log({
        userId: req.user.sub,
        action: 'UPDATE',
        resource: 'Lead',
        details: { bulk: true, count: result.count, updates: safeUpdates },
        ip: req.ip,
      })
    }
    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    return res.json({ success: true, updated: result.count })
  } catch (error) {
    return next(error)
  }
})

leadsRouter.delete('/bulk', authorizePermission('leads.delete'), async (req, res, next) => {
  try {
    const { ids } = req.body as { ids?: unknown }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids obrigatório' })
    }
    const result = await prisma.lead.updateMany({
      where: { id: { in: ids as string[] }, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    if (req.user?.sub) {
      await AuditLogger.log({
        userId: req.user.sub,
        action: 'DELETE',
        resource: 'Lead',
        details: { bulk: true, count: result.count },
        ip: req.ip,
      })
    }
    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    return res.json({ success: true, deleted: result.count })
  } catch (error) {
    return next(error)
  }
})

leadsRouter.get('/:id', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const leadId = String(req.params.id)
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      include: {
        appointments: true,
        sessions: {
          orderBy: { createdAt: 'desc' },
          include: {
            analyticsEvents: {
              orderBy: { createdAt: 'desc' },
              select: { id: true, name: true, category: true, label: true, page: true, createdAt: true },
            },
          },
        },
      },
    })
    if (!lead) throw new AppError(404, 'Lead not found')

    const consentLogs = await prisma.consentLog.findMany({
      where: { email: lead.email },
      orderBy: { consentedAt: 'desc' },
      select: { id: true, channel: true, policyVersion: true, consentedAt: true, ipAddress: true },
    })

    const timeline = [
      {
        id: `lead:${lead.id}`,
        type: 'lead_created',
        title: 'Lead criada',
        description: `${lead.name} - ${lead.source}`,
        timestamp: lead.createdAt.toISOString(),
      },
      ...consentLogs.map((entry) => ({
        id: `consent:${entry.id}`,
        type: 'consent',
        title: 'Consentimento registrado',
        description: `${entry.channel} - politica ${entry.policyVersion}`,
        timestamp: entry.consentedAt.toISOString(),
      })),
      ...lead.sessions.flatMap((session) => session.analyticsEvents.map((event) => ({
        id: `analytics:${event.id}`,
        type: 'analytics',
        title: event.name,
        description: event.page ?? event.label ?? event.category,
        timestamp: event.createdAt.toISOString(),
      }))),
      ...lead.appointments.map((appointment) => ({
        id: `appointment:${appointment.id}`,
        type: 'appointment',
        title: 'Agendamento vinculado',
        description: `${appointment.serviceType} - ${appointment.status}`,
        timestamp: appointment.createdAt.toISOString(),
      })),
    ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())

    res.json({ success: true, data: { ...lead, consentLogs, timeline } })
  } catch (error) {
    next(error)
  }
})

leadsRouter.put('/:id', authorizePermission('leads.update'), async (req, res, next) => {
  try {
    const leadId = String(req.params.id)
    const data = updateLeadSchema.parse(req.body)
    const previousLead = await prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      select: { email: true, consentedAt: true },
    })
    if (!previousLead) throw new AppError(404, 'Lead not found')

    const lead = await prisma.lead.update({ where: { id: leadId }, data: normalizeLeadMutation(data) })

    if (!previousLead.consentedAt && lead.consentedAt) {
      await prisma.consentLog.create({
        data: {
          email: previousLead.email,
          ipAddress: anonymizeIp(req.ip ?? '0.0.0.0'),
          policyVersion: LEAD_PRIVACY_POLICY_VERSION,
          consentText: 'Consentimento operacional registrado via edicao manual no CRM.',
          consentedAt: lead.consentedAt,
          channel: 'crm_update',
        },
      })
    }

    if (req.user?.sub) {
      await AuditLogger.log({
        userId: req.user.sub,
        action: 'UPDATE',
        resource: 'Lead',
        details: { leadId, mode: 'put' },
        ip: req.ip,
      })
    }

    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: lead })
  } catch (error) {
    next(error)
  }
})

leadsRouter.patch('/:id', authorizePermission('leads.update'), async (req, res, next) => {
  try {
    const leadId = String(req.params.id)
    const data = updateLeadSchema.parse(req.body)
    const previousLead = await prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      select: { email: true, consentedAt: true },
    })
    if (!previousLead) throw new AppError(404, 'Lead not found')

    const lead = await prisma.lead.update({ where: { id: leadId }, data: normalizeLeadMutation(data) })

    if (!previousLead.consentedAt && lead.consentedAt) {
      await prisma.consentLog.create({
        data: {
          email: previousLead.email,
          ipAddress: anonymizeIp(req.ip ?? '0.0.0.0'),
          policyVersion: LEAD_PRIVACY_POLICY_VERSION,
          consentText: 'Consentimento operacional registrado via edicao manual no CRM.',
          consentedAt: lead.consentedAt,
          channel: 'crm_update',
        },
      })
    }

    if (req.user?.sub) {
      await AuditLogger.log({
        userId: req.user.sub,
        action: 'UPDATE',
        resource: 'Lead',
        details: { leadId, mode: 'patch' },
        ip: req.ip,
      })
    }

    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: lead })
  } catch (error) {
    next(error)
  }
})

leadsRouter.delete('/:id', authorizePermission('leads.delete'), async (req, res, next) => {
  try {
    const leadId = String(req.params.id)
    const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } })
    if (!lead) throw new AppError(404, 'Lead not found')

    await prisma.lead.update({ where: { id: leadId }, data: { deletedAt: new Date() } })

    if (req.user?.sub) {
      await AuditLogger.log({
        userId: req.user.sub,
        action: 'DELETE',
        resource: 'Lead',
        details: { leadId, mode: 'soft_delete' },
        ip: req.ip,
      })
    }

    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, message: 'Lead archived' })
  } catch (error) {
    next(error)
  }
})

leadsRouter.patch('/:id/gdpr', authorizePermission('leads.gdpr'), async (req, res, next) => {
  try {
    const leadId = String(req.params.id)
    const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } })
    if (!lead) throw new AppError(404, 'Lead not found')
    if (lead.anonymized) {
      res.json({ success: true, message: 'Dados ja foram anonimizados anteriormente' })
      return
    }

    const anonymizedEmail = `anonimo_${EncryptionService.anonymize(lead.email)}@anonimizado.lgpd`
    const folderMediaKeys = await prisma.clientFolderMedia.findMany({
      where: { folder: { leadId } },
      select: { originalStorageKey: true, optimizedStorageKey: true },
    })
    const anonymized = await prisma.$transaction(async (tx) => {
      const sessions = await tx.session.findMany({
        where: { leadId },
        select: { id: true },
      })
      const sessionIds = sessions.map((session) => session.id)

      const anonymizedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          name: 'Anonimo',
          email: anonymizedEmail,
          phone: lead.phone ? '**********' : null,
          notes: null,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          anonymized: true,
        },
      })

      await Promise.all([
        tx.consentLog.updateMany({
          where: { email: lead.email },
          data: { email: anonymizedEmail, ipAddress: null },
        }),
        tx.session.updateMany({
          where: { leadId },
          data: { ip: null, userAgent: null, referrer: null, pagesVisited: [] },
        }),
        tx.appointment.updateMany({
          where: { leadId },
          data: { notes: null },
        }),
        tx.clientFolder.updateMany({
          where: { leadId },
          data: {
            clientName: 'Anonimo',
            clientEmail: anonymizedEmail,
            clientPhone: null,
            notes: null,
            publicTitle: null,
            publicDescription: null,
            isPublished: false,
            publicConsentAt: null,
          },
        }),
        tx.clientFolderMedia.deleteMany({ where: { folder: { leadId } } }),
        ...(sessionIds.length > 0
          ? [
              tx.analyticsEvent.updateMany({
                where: { sessionId: { in: sessionIds } },
                data: { label: null, page: null, payload: {} },
              }),
              tx.webVital.updateMany({
                where: { sessionId: { in: sessionIds } },
                data: { page: null },
              }),
            ]
          : []),
      ])

      return anonymizedLead
    })

    const mediaCleanup = await Promise.allSettled(folderMediaKeys.flatMap((media) => [
      deletePrivateFile(media.originalStorageKey),
      deletePrivateFile(media.optimizedStorageKey),
    ]))
    mediaCleanup.forEach((result) => {
      if (result.status === 'rejected') {
        logger.warn('Lead GDPR media cleanup failed', { error: result.reason })
      }
    })

    const authReq = req as typeof req & { user?: { sub: string } }
    if (authReq.user?.sub) {
      await AuditLogger.log({
        userId: authReq.user.sub,
        action: 'GDPR_ANONYMIZE',
        resource: 'Lead',
        details: { leadId, originalEmail: EncryptionService.anonymize(lead.email) },
        ip: req.ip,
      })
    }

    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: anonymized, message: 'Dados anonimizados com sucesso (LGPD Art. 18)' })
  } catch (err) {
    next(err)
  }
})
