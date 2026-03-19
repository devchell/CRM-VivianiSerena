import { Router } from 'express'
import { authenticate, authorizeModule } from '../middleware/authenticate'
import { getCache, setCache, CACHE_TTL } from '../lib/redis'
import { getMetricsOverview } from '../domain/metrics/service'

export const dashboardRouter: Router = Router()
dashboardRouter.use(authenticate)
dashboardRouter.use(authorizeModule('dashboard'))

dashboardRouter.get('/stats', async (_req, res, next) => {
  try {
    const cacheKey = 'dashboard:stats:month'
    const cached = await getCache(cacheKey)
    if (cached) {
      res.json({ success: true, data: cached })
      return
    }

    const overview = await getMetricsOverview('month')
    const data = {
      leads: {
        total: overview.leads.total,
        thisMonth: overview.leads.createdInPeriod,
        converted: overview.leads.converted,
        conversionRate: overview.leads.conversionRate,
      },
      appointments: {
        upcoming: overview.appointments.upcoming,
      },
      financial: {
        income: overview.financial.income,
        expenses: overview.financial.expenses,
        profit: overview.financial.profit,
      },
    }

    await setCache(cacheKey, data, CACHE_TTL.MEDIUM)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})
