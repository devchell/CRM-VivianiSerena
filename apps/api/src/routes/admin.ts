import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { authenticate, authorize } from '../middleware/authenticate'
import { apiEnv } from '../lib/env'
import { healthcheckUploadStorage } from '../infrastructure/storage'
import { getEmailSettingsOverview, saveEmailSettings } from '../infrastructure/emailSettings'
import { getGoogleCalendarConnectionStatus } from '../infrastructure/googleCalendar'
import { fetchGoogleBusinessReviews, listGoogleBusinessLocations } from '../infrastructure/googleBusiness'

export const adminRouter: Router = Router()

const emailSettingsSchema = z.object({
  host: z.string().trim().min(1, 'Host SMTP e obrigatorio'),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().min(1, 'Usuario SMTP e obrigatorio'),
  password: z.string().optional(),
  from: z.string().trim().email('E-mail remetente invalido'),
  fromName: z.string().trim().min(1, 'Nome do remetente e obrigatorio'),
  adminEmail: z.string().trim().email('E-mail administrativo invalido'),
})

const linkedGoogleLocationSchema = z.object({
  accountName: z.string().min(1),
  accountId: z.string().min(1),
  accountLabel: z.string().min(1),
  locationName: z.string().min(1),
  locationId: z.string().min(1),
  title: z.string().min(1),
  address: z.string().optional().default(''),
})

adminRouter.use(authenticate, authorize('ADMIN'))

adminRouter.get('/overview', async (_req, res, next) => {
  try {
    const [google, uploads] = await Promise.all([
      getGoogleCalendarConnectionStatus(),
      healthcheckUploadStorage(),
    ])

    let database = false
    let redisReady = false

    try {
      await prisma.$queryRaw`SELECT 1`
      database = true
    } catch {
      database = false
    }

    try {
      await redis.ping()
      redisReady = true
    } catch {
      redisReady = false
    }

    const email = await getEmailSettingsOverview()

    res.json({
      success: true,
      data: {
        integrations: {
          googleCalendar: google,
          email,
        },
        infrastructure: {
          database,
          redis: redisReady,
          uploads,
          storageDriver: apiEnv.storageDriver,
        },
        environment: {
          apiBaseUrl: apiEnv.apiBaseUrl,
          crmUrl: apiEnv.crmUrl,
          corsOrigins: apiEnv.corsOrigins,
          googleRedirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() ?? null,
          googleClientConfigured: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
          calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary',
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.put('/email-settings', async (req, res, next) => {
  try {
    const body = emailSettingsSchema.parse(req.body)
    const email = await saveEmailSettings(body, req.user!.sub)

    await prisma.auditLog.create({
      data: {
        userId: req.user!.sub,
        action: 'update',
        resource: 'email_settings',
        details: {
          host: email.host,
          port: email.port,
          secure: email.secure,
          from: email.from,
          adminEmail: email.adminEmail,
          source: email.source,
        },
      },
    })

    res.json({
      success: true,
      message: 'Dados de e-mail atualizados com sucesso',
      data: email,
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/google-business/locations', async (_req, res, next) => {
  try {
    const locations = await listGoogleBusinessLocations()
    res.json({ success: true, data: locations })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/google-business/reviews', async (req, res, next) => {
  try {
    const body = z.object({
      locations: z.array(linkedGoogleLocationSchema).max(25),
    }).parse(req.body)

    const reviews = await fetchGoogleBusinessReviews(body.locations)
    res.json({ success: true, data: reviews })
  } catch (error) {
    next(error)
  }
})
