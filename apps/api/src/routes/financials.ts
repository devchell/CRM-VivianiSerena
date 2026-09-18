import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { getCache, setCache, CACHE_TTL, deleteCache } from '../lib/redis'
import { FINANCIAL_CATEGORIES_BY_TYPE } from '@viviani/types'
import { getFinancialCharts, getFinancialSummary } from '../domain/metrics/service'
import { invalidateOperationalMetricCaches } from '../domain/metrics/cache'
import { AuditLogger } from '../infrastructure/security/AuditLogger'

export const financialsRouter: Router = Router()
financialsRouter.use(authenticate)

const schema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.enum(['coaching_revenue', 'workshop_revenue', 'mentoring_revenue', 'marketing', 'tools_software', 'education', 'office', 'taxes', 'other']),
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().datetime(),
  recurring: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
})

const listQuerySchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category: z.enum(['coaching_revenue', 'workshop_revenue', 'mentoring_revenue', 'marketing', 'tools_software', 'education', 'office', 'taxes', 'other']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

financialsRouter.get('/', authorizePermission('financeiro.view'), async (req, res, next) => {
  try {
    const { type, from, to, category, page, limit } = listQuerySchema.parse(req.query)
    const skip = (page - 1) * limit
    const where: Prisma.FinancialWhereInput = { deletedAt: null }
    if (type) where.type = type
    if (category) where.category = category
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(String(from))
      if (to) (where.date as Record<string, unknown>).lte = new Date(String(to))
    }
    const [financials, total] = await Promise.all([
      prisma.financial.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      prisma.financial.count({ where }),
    ])
    res.json({ success: true, data: financials, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } })
  } catch (error) { next(error) }
})

financialsRouter.get('/summary', authorizePermission('financeiro.view'), async (_req, res, next) => {
  try {
    const cached = await getCache('financial:summary')
    if (cached) { res.json({ success: true, data: cached }); return }

    const summary = await getFinancialSummary('month')
    const data = {
      income: summary.income,
      expenses: summary.expenses,
      profit: summary.profit,
      previousIncome: summary.previousIncome,
      previousExpenses: summary.previousExpenses,
      previousProfit: summary.previousProfit,
      averageTicket: summary.averageTicket,
      convertedLeadsInPeriod: summary.convertedLeadsInPeriod,
      categories: summary.categories ?? FINANCIAL_CATEGORIES_BY_TYPE,
    }
    await setCache('financial:summary', data, CACHE_TTL.MEDIUM)
    res.json({ success: true, data })
  } catch (error) { next(error) }
})

financialsRouter.get('/charts', authorizePermission('financeiro.view'), async (_req, res, next) => {
  try {
    const cached = await getCache('financial:charts')
    if (cached) { res.json({ success: true, data: cached }); return }

    const data = await getFinancialCharts(12)
    await setCache('financial:charts', data, CACHE_TTL.LONG)
    res.json({ success: true, data })
  } catch (error) { next(error) }
})

financialsRouter.post('/', authorizePermission('financeiro.create'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    const financial = await prisma.financial.create({ data: { ...data, date: new Date(data.date) } })
    await deleteCache('financial:summary')
    await deleteCache('financial:charts')
    await invalidateOperationalMetricCaches()
    res.status(201).json({ success: true, data: financial })
  } catch (error) { next(error) }
})

financialsRouter.post('/recurring', authorizePermission('financeiro.create'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    const financial = await prisma.financial.create({ data: { ...data, date: new Date(data.date), recurring: true } })
    await deleteCache('financial:summary')
    await deleteCache('financial:charts')
    await invalidateOperationalMetricCaches()
    res.status(201).json({ success: true, data: financial })
  } catch (error) { next(error) }
})

financialsRouter.patch('/:id', authorizePermission('financeiro.update'), async (req, res, next) => {
  try {
    const financialId = String(req.params.id)
    const data = schema.partial().parse(req.body)
    const existing = await prisma.financial.findFirst({ where: { id: financialId, deletedAt: null } })
    if (!existing) {
      res.status(404).json({ success: false, error: 'Financial record not found' })
      return
    }
    const financial = await prisma.$transaction(async (tx) => {
      const replacement = await tx.financial.create({
        data: {
          type: data.type ?? existing.type,
          category: data.category ?? existing.category,
          amount: data.amount ?? existing.amount,
          description: data.description ?? existing.description,
          date: data.date ? new Date(data.date) : existing.date,
          recurring: data.recurring ?? existing.recurring,
          tags: data.tags ?? existing.tags,
        },
      })

      await tx.financial.update({ where: { id: financialId }, data: { deletedAt: new Date() } })
      return replacement
    })
    await AuditLogger.log({
      userId: req.user?.sub ?? 'system',
      action: 'UPDATE',
      resource: 'Financial',
      details: { archivedId: financialId, replacementId: financial.id, mode: 'versioned_replacement' },
      ip: req.ip,
    })
    await deleteCache('financial:summary')
    await deleteCache('financial:charts')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: financial })
  } catch (error) { next(error) }
})

financialsRouter.delete('/:id', authorizePermission('financeiro.delete'), async (req, res, next) => {
  try {
    const financialId = String(req.params.id)
    const existing = await prisma.financial.findFirst({ where: { id: financialId, deletedAt: null } })
    if (!existing) {
      res.status(404).json({ success: false, error: 'Financial record not found' })
      return
    }
    await prisma.financial.update({ where: { id: financialId }, data: { deletedAt: new Date() } })
    await deleteCache('financial:summary')
    await deleteCache('financial:charts')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, message: 'Financial record archived' })
  } catch (error) { next(error) }
})
