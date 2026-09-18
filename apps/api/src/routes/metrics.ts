import { Router } from 'express'
import { z } from 'zod'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { getCache, setCache, CACHE_TTL } from '../lib/redis'
import { getMetricsOverview } from '../domain/metrics/service'
import { AppError } from '../middleware/errorHandler'

export const metricsRouter: Router = Router()
metricsRouter.use(authenticate)
metricsRouter.use(authorizePermission('dashboard.view'))

metricsRouter.get('/overview', async (req, res, next) => {
  try {
    const { period } = z.object({
      period: z.enum(['month', 'last30d']).optional(),
    }).parse(req.query)

    const effectivePeriod = period ?? 'month'
    const cacheKey = `metrics:overview:${effectivePeriod}`
    const cached = await getCache(cacheKey)

    if (cached) {
      res.json({ success: true, data: cached })
      return
    }

    const overview = await getMetricsOverview(effectivePeriod)
    await setCache(cacheKey, overview, CACHE_TTL.MEDIUM * 2) // 10 min
    res.json({ success: true, data: overview })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof AppError) {
      next(error)
      return
    }

    next(new AppError(503, 'Métricas indisponíveis temporariamente. Tente novamente.'))
  }
})
