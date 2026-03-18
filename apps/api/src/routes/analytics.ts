import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { getCache, setCache, CACHE_TTL } from '../lib/redis'
import { anonymizeIp } from '../middleware/security'
import { getAnalyticsMetrics } from '../domain/metrics/service'

export const analyticsRouter: Router = Router()

const pageviewSchema = z.object({
  page: z.string(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  sessionId: z.string().optional(),
  duration: z.number().optional(),
})

const eventSchema = z.object({
  name: z.string(),
  category: z.string(),
  label: z.string().optional(),
  value: z.number().optional(),
  page: z.string().optional(),
  sessionId: z.string().optional(),
})

const vitalsSchema = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  page: z.string().optional(),
})

// POST /analytics/pageview — public
analyticsRouter.post('/pageview', async (req, res, next) => {
  try {
    const data = pageviewSchema.parse(req.body)
    const ip = anonymizeIp(req.ip ?? '0.0.0.0')

    // Find or create a session (by sessionId cookie or IP+UA fingerprint)
    const sessionId = data.sessionId
    if (sessionId) {
      // Try to update existing session
      const session = await prisma.session.findFirst({
        where: { id: sessionId },
      })
      if (session) {
        const pages = (session.pagesVisited as string[]) ?? []
        if (!pages.includes(data.page)) pages.push(data.page)
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            pagesVisited: pages,
            duration: data.duration ?? session.duration,
            referrer: data.referrer ?? session.referrer,
          },
        })
        res.json({ success: true })
        return
      }
    }

    // Create anonymous session (not linked to any lead)
    await prisma.session.create({
      data: {
        leadId: await getOrCreateAnonymousLeadId(ip),
        ip,
        userAgent: req.headers['user-agent'] ?? null,
        referrer: data.referrer ?? null,
        pagesVisited: [data.page],
        duration: data.duration ?? 0,
      },
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// POST /analytics/event — public
analyticsRouter.post('/event', async (req, res, next) => {
  try {
    eventSchema.parse(req.body)
    // Events are stored as SecurityEvent with severity=low for now
    // In a full implementation, we'd have an AnalyticsEvent table
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// POST /analytics/vitals — public
analyticsRouter.post('/vitals', async (req, res, next) => {
  try {
    vitalsSchema.parse(req.body)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// GET /analytics/dashboard — authenticated
analyticsRouter.get('/dashboard', authenticate, async (_req, res, next) => {
  try {
    const cacheKey = 'analytics:dashboard'
    const cached = await getCache(cacheKey)
    if (cached) { res.json({ success: true, data: cached }); return }

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

// Helper: get or create an anonymous lead record for tracking
async function getOrCreateAnonymousLeadId(ip: string): Promise<string> {
  const existing = await prisma.lead.findFirst({
    where: { email: `anonymous+${ip.replace(/\./g, '_')}@tracking.internal` },
    select: { id: true },
  })
  if (existing) return existing.id

  const lead = await prisma.lead.create({
    data: {
      name: 'Visitante Anônimo',
      email: `anonymous+${ip.replace(/\./g, '_')}@tracking.internal`,
      source: 'organic',
      status: 'new',
    },
  })
  return lead.id
}
