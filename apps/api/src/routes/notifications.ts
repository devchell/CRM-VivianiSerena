import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { getRecentActivity } from '../domain/metrics/service'

export const notificationsRouter: Router = Router()

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).optional(),
  all: z.boolean().optional(),
})

notificationsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query)
    const limit = query.limit ?? 10
    const userId = req.user!.sub

    const [activity, reads] = await Promise.all([
      getRecentActivity(limit),
      prisma.notificationRead.findMany({
        where: { userId },
        select: { notificationId: true, readAt: true },
      }),
    ])

    const readsMap = new Map(reads.map((entry) => [entry.notificationId, entry.readAt.toISOString()]))

    const notifications = activity.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      timestamp: item.timestamp,
      read: readsMap.has(item.id),
      readAt: readsMap.get(item.id) ?? null,
    }))

    res.json({ success: true, data: notifications })
  } catch (error) {
    next(error)
  }
})

notificationsRouter.post('/read', authenticate, async (req, res, next) => {
  try {
    const body = markReadSchema.parse(req.body)
    const userId = req.user!.sub

    let notificationIds = body.notificationIds ?? []

    if (body.all) {
      const activity = await getRecentActivity(50)
      notificationIds = activity.map((item) => item.id)
    }

    if (notificationIds.length === 0) {
      res.json({ success: true, data: { count: 0 } })
      return
    }

    const readAt = new Date()

    await prisma.$transaction(
      notificationIds.map((notificationId) =>
        prisma.notificationRead.upsert({
          where: {
            userId_notificationId: {
              userId,
              notificationId,
            },
          },
          update: { readAt },
          create: {
            userId,
            notificationId,
            readAt,
          },
        })
      )
    )

    res.json({ success: true, data: { count: notificationIds.length } })
  } catch (error) {
    next(error)
  }
})
