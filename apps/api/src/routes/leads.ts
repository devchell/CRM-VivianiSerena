import { Router } from 'express'
import { z } from 'zod'
import type { Server as SocketServer } from 'socket.io'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { deletePattern } from '../lib/redis'
import { anonymizeIp } from '../middleware/security'
import { emailService } from '../infrastructure/email'
import { EncryptionService } from '../infrastructure/security/EncryptionService'
import { AuditLogger } from '../infrastructure/security/AuditLogger'
import { buildCommercialLeadWhere, getLeadMetrics } from '../domain/metrics/service'
import { invalidateOperationalMetricCaches } from '../domain/metrics/cache'

export const leadsRouter: Router = Router()

const createLeadSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  source: z.enum(['organic', 'instagram', 'facebook', 'google_ads', 'referral', 'whatsapp', 'other']),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  notes: z.string().optional(),
  website: z.string().max(0).optional(), // honeypot — bots fill, humans don't
})

const updateLeadSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.enum(['organic', 'instagram', 'facebook', 'google_ads', 'referral', 'whatsapp', 'other']).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  notes: z.string().optional(),
})

// POST / — public (landing page form submission)
leadsRouter.post('/', async (req, res, next) => {
  try {
    const data = createLeadSchema.parse(req.body)
    if (data.website !== undefined && data.website !== '') {
      return res.json({ success: true }) // silently ignore bot
    }
    const _ip = anonymizeIp(req.ip ?? '0.0.0.0') // LGPD: never store raw IP
    const lead = await prisma.lead.create({
      data: {
        name: data.name, email: data.email, phone: data.phone, source: data.source,
        utmSource: data.utmSource, utmMedium: data.utmMedium, utmCampaign: data.utmCampaign, notes: data.notes,
      },
    })
    const io = req.app.get('io') as SocketServer | undefined
    if (io) io.to('dashboard').emit('new_lead', { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone, source: lead.source, createdAt: lead.createdAt })
    emailService.newLead({ name: lead.name, email: lead.email, phone: lead.phone ?? undefined, source: lead.source }).catch(() => {})
    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    return res.status(201).json({ success: true, data: { id: lead.id } })
  } catch (error) { return next(error) }
})

// All routes below require authentication
leadsRouter.use(authenticate)

leadsRouter.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, source, search, from, to } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = buildCommercialLeadWhere()
    if (status) where.status = status
    if (source) where.source = source
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(String(from))
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(String(to))
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search) } },
      ]
    }
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.lead.count({ where }),
    ])
    res.json({ success: true, data: leads, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } })
  } catch (error) { next(error) }
})

// GET /stats — analytics for CRM dashboard
leadsRouter.get('/stats', async (req, res, next) => {
  try {
    const { days = 30 } = req.query
    const metrics = await getLeadMetrics(Number(days) === 30 ? 'last30d' : 'month')
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
        period: String(days) + 'd',
      },
    })
  } catch (error) { next(error) }
})

// GET /export — CSV download
leadsRouter.get('/export', async (req, res, next) => {
  try {
    const { status, from, to } = req.query
    const where: Record<string, unknown> = buildCommercialLeadWhere()
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(String(from))
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(String(to))
    }
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { name: true, email: true, phone: true, source: true, status: true, utmSource: true, utmMedium: true, utmCampaign: true, notes: true, createdAt: true, convertedAt: true },
    })
    const headers = ['Nome', 'Email', 'Telefone', 'Origem', 'Status', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Notas', 'Criado em', 'Convertido em']
    const rows = leads.map(l => [
      l.name, l.email, l.phone ?? '', l.source, l.status,
      l.utmSource ?? '', l.utmMedium ?? '', l.utmCampaign ?? '', l.notes ?? '',
      l.createdAt.toISOString(), l.convertedAt?.toISOString() ?? '',
    ])
    const escape = (v: string) => '"' + v.replace(/"/g, '""') + '"'
    const csv = [headers, ...rows].map(row => row.map(cell => escape(String(cell))).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="leads-' + new Date().toISOString().split('T')[0] + '.csv"')
    res.send('\uFEFF' + csv)
  } catch (error) { next(error) }
})

leadsRouter.get('/:id', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id }, include: { appointments: true, sessions: true } })
    if (!lead) throw new AppError(404, 'Lead not found')
    res.json({ success: true, data: lead })
  } catch (error) { next(error) }
})

leadsRouter.put('/:id', async (req, res, next) => {
  try {
    const data = updateLeadSchema.parse(req.body)
    const updateData: Record<string, unknown> = { ...data }
    if (data.status === 'converted') updateData.convertedAt = new Date()
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: updateData })
    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: lead })
  } catch (error) { next(error) }
})

leadsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = updateLeadSchema.parse(req.body)
    const updateData: Record<string, unknown> = { ...data }
    if (data.status === 'converted') updateData.convertedAt = new Date()
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: updateData })
    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: lead })
  } catch (error) { next(error) }
})

leadsRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } })
    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, message: 'Lead deleted' })
  } catch (error) { next(error) }
})


// LGPD Art. 18 — Anonimizar dados de um lead (não deleta para preservar métricas)
leadsRouter.patch('/:id/gdpr', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } })
    if (!lead) throw new AppError(404, 'Lead not found')
    if (lead.anonymized) {
      res.json({ success: true, message: 'Dados já foram anonimizados anteriormente' })
      return
    }

    const anonymized = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        name: 'Anônimo',
        email: `anonimo_${EncryptionService.anonymize(lead.email)}@anonimizado.lgpd`,
        phone: lead.phone ? '**********' : null,
        notes: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        anonymized: true,
      },
    })

    const authReq = req as typeof req & { user?: { id: string } }
    if (authReq.user?.id) {
      await AuditLogger.log({
        userId: authReq.user.id,
        action: 'GDPR_ANONYMIZE',
        resource: 'Lead',
        details: { leadId: req.params.id, originalEmail: EncryptionService.anonymize(lead.email) },
        ip: req.ip,
      })
    }

    await deletePattern('leads:*')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: anonymized, message: 'Dados anonimizados com sucesso (LGPD Art. 18)' })
  } catch (err) { next(err) }
})
