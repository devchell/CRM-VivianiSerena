import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, authorizeModule } from '../middleware/authenticate'
import { getCache, setCache, CACHE_TTL, deleteCache } from '../lib/redis'
import { FINANCIAL_CATEGORIES_BY_TYPE } from '@viviani/types'
import { getFinancialCharts, getFinancialSummary } from '../domain/metrics/service'
import { invalidateOperationalMetricCaches } from '../domain/metrics/cache'

export const financialsRouter: Router = Router()
financialsRouter.use(authenticate)
financialsRouter.use(authorizeModule('financeiro'))

const schema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.enum(['coaching_revenue', 'workshop_revenue', 'mentoring_revenue', 'marketing', 'tools_software', 'education', 'office', 'taxes', 'other']),
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().datetime(),
  recurring: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
})

financialsRouter.get('/', async (req, res, next) => {
  try {
    const { type, from, to, category, page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (category) where.category = category
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(String(from))
      if (to) (where.date as Record<string, unknown>).lte = new Date(String(to))
    }
    const [financials, total] = await Promise.all([
      prisma.financial.findMany({ where, skip, take: Number(limit), orderBy: { date: 'desc' } }),
      prisma.financial.count({ where }),
    ])
    res.json({ success: true, data: financials, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } })
  } catch (error) { next(error) }
})

financialsRouter.get('/summary', async (_req, res, next) => {
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

financialsRouter.get('/charts', async (_req, res, next) => {
  try {
    const cached = await getCache('financial:charts')
    if (cached) { res.json({ success: true, data: cached }); return }

    const data = await getFinancialCharts(12)
    await setCache('financial:charts', data, CACHE_TTL.LONG)
    res.json({ success: true, data })
  } catch (error) { next(error) }
})

financialsRouter.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    const financial = await prisma.financial.create({ data: { ...data, date: new Date(data.date) } })
    await deleteCache('financial:summary')
    await deleteCache('financial:charts')
    await invalidateOperationalMetricCaches()
    res.status(201).json({ success: true, data: financial })
  } catch (error) { next(error) }
})

financialsRouter.post('/recurring', async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    const financial = await prisma.financial.create({ data: { ...data, date: new Date(data.date), recurring: true } })
    await invalidateOperationalMetricCaches()
    res.status(201).json({ success: true, data: financial })
  } catch (error) { next(error) }
})

financialsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body)
    const financial = await prisma.financial.update({
      where: { id: req.params.id },
      data: data.date ? { ...data, date: new Date(data.date) } : data,
    })
    await deleteCache('financial:summary')
    await deleteCache('financial:charts')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: financial })
  } catch (error) { next(error) }
})

financialsRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.financial.delete({ where: { id: req.params.id } })
    await deleteCache('financial:summary')
    await deleteCache('financial:charts')
    await invalidateOperationalMetricCaches()
    res.json({ success: true, message: 'Financial record deleted' })
  } catch (error) { next(error) }
})
