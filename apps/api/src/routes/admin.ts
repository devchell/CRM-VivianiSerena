import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { authenticate, authorize } from '../middleware/authenticate'
import { apiEnv } from '../lib/env'
import { healthcheckUploadStorage } from '../infrastructure/storage'
import { getGoogleCalendarConnectionStatus } from '../infrastructure/googleCalendar'

export const adminRouter: Router = Router()

function inferEmailProvider(host?: string) {
  if (!host) return 'Nao configurado'
  const normalized = host.toLowerCase()

  if (normalized.includes('resend')) return 'Resend'
  if (normalized.includes('gmail')) return 'Gmail'
  if (normalized.includes('brevo') || normalized.includes('sendinblue')) return 'Brevo'
  if (normalized.includes('outlook')) return 'Outlook'

  return host
}

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

    const smtpHost = process.env.SMTP_HOST?.trim()
    const smtpUser = process.env.SMTP_USER?.trim()
    const emailFrom = process.env.EMAIL_FROM?.trim()

    res.json({
      success: true,
      data: {
        integrations: {
          googleCalendar: google,
          email: {
            configured: Boolean(smtpHost && smtpUser && process.env.SMTP_PASS?.trim() && emailFrom),
            provider: inferEmailProvider(smtpHost),
            host: smtpHost ?? null,
            port: process.env.SMTP_PORT?.trim() ?? null,
            secure: process.env.SMTP_SECURE?.trim() === 'true',
            from: emailFrom ?? null,
            fromName: process.env.EMAIL_FROM_NAME?.trim() ?? null,
          },
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
