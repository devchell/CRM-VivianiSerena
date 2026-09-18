import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { getCache, setCache, CACHE_TTL } from '../lib/redis'
import { anonymizeIp } from '../middleware/security'
import { getAnalyticsMetrics } from '../domain/metrics/service'
import { invalidateOperationalMetricCaches } from '../domain/metrics/cache'
import { createAnalyticsSessionProof, isValidAnalyticsSession } from '../lib/analyticsSession'

export const analyticsRouter: Router = Router()

const pageviewSchema = z.object({
  page: z.string().trim().min(1).max(500),
  referrer: z.string().max(2048).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(200).optional(),
  sessionId: z.string().max(64).optional(),
  sessionProof: z.string().length(64).optional(),
  duration: z.number().finite().min(0).max(86_400).optional(),
})

const eventSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  label: z.string().max(200).optional(),
  value: z.number().finite().min(-1_000_000).max(1_000_000).optional(),
  page: z.string().max(500).optional(),
  sessionId: z.string().max(64).optional(),
  sessionProof: z.string().length(64).optional(),
})

const vitalsSchema = z.object({
  name: z.string().trim().min(1).max(50),
  value: z.number().finite().min(0).max(1_000_000),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  page: z.string().max(500).optional(),
  sessionId: z.string().max(64).optional(),
  sessionProof: z.string().length(64).optional(),
  id: z.string().max(100).optional(),
  navigationType: z.string().max(50).optional(),
})

analyticsRouter.post('/pageview', async (req, res, next) => {
  try {
    const data = pageviewSchema.parse(req.body)
    const ip = anonymizeIp(req.ip ?? '0.0.0.0')

    if (isValidAnalyticsSession(data.sessionId, data.sessionProof)) {
      const existing = await prisma.session.findUnique({
        where: { id: data.sessionId },
      })

      if (existing) {
        const pages = (existing.pagesVisited as string[]) ?? []
        if (!pages.includes(data.page)) {
          pages.push(data.page)
        }

        await prisma.session.update({
          where: { id: data.sessionId },
          data: {
            pagesVisited: pages,
            duration: data.duration ?? existing.duration,
            referrer: data.referrer ?? existing.referrer,
          },
        })

        await invalidateOperationalMetricCaches()
        res.json({ success: true, data: { sessionId: data.sessionId, sessionProof: createAnalyticsSessionProof(data.sessionId) } })
        return
      }
    }

    const session = await prisma.session.create({
      data: {
        ip,
        userAgent: req.headers['user-agent'] ?? null,
        referrer: data.referrer ?? null,
        pagesVisited: [data.page],
        duration: data.duration ?? 0,
      },
    })

    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: { sessionId: session.id, sessionProof: createAnalyticsSessionProof(session.id) } })
  } catch (error) {
    next(error)
  }
})

analyticsRouter.post('/event', async (req, res, next) => {
  try {
    const data = eventSchema.parse(req.body)
    const session = isValidAnalyticsSession(data.sessionId, data.sessionProof)
      ? await prisma.session.findUnique({ where: { id: data.sessionId }, select: { id: true } })
      : null

    const event = await prisma.analyticsEvent.create({
      data: {
        sessionId: session?.id ?? null,
        name: data.name,
        category: data.category,
        label: data.label ?? null,
        value: data.value ?? null,
        page: data.page ?? null,
        payload: {
          name: data.name,
          category: data.category,
          label: data.label ?? null,
          value: data.value ?? null,
          page: data.page ?? null,
        },
      },
    })

    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: { id: event.id } })
  } catch (error) {
    next(error)
  }
})

analyticsRouter.post('/vitals', async (req, res, next) => {
  try {
    const data = vitalsSchema.parse(req.body)
    const session = isValidAnalyticsSession(data.sessionId, data.sessionProof)
      ? await prisma.session.findUnique({ where: { id: data.sessionId }, select: { id: true } })
      : null

    const vital = await prisma.webVital.create({
      data: {
        sessionId: session?.id ?? null,
        metricId: data.id ?? null,
        name: data.name,
        value: data.value,
        rating: data.rating ?? null,
        page: data.page ?? null,
        navigationType: data.navigationType ?? null,
      },
    })

    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: { id: vital.id } })
  } catch (error) {
    next(error)
  }
})

analyticsRouter.get('/dashboard', authenticate, authorizePermission('dashboard.view'), async (_req, res, next) => {
  try {
    const cacheKey = 'analytics:dashboard'
    const cached = await getCache(cacheKey)
    if (cached) {
      res.json({ success: true, data: cached })
      return
    }

    const metrics = await getAnalyticsMetrics()
    const data = {
      period: '30d',
      pageviews: metrics.sessions30d,
      uniqueSessions: metrics.uniqueReferrers,
      bounceRate: metrics.bounceRate,
      topReferrers: metrics.topReferrers,
      heatmap: metrics.heatmap,
      funnel: metrics.funnel,
    }

    await setCache(cacheKey, data, CACHE_TTL.MEDIUM)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})
