import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { ContentSection, UserRole } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { authenticate, authorize } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { apiEnv } from '../lib/env'
import { healthcheckUploadStorage } from '../infrastructure/storage'
import { getEmailSettingsOverview, saveEmailSettings } from '../infrastructure/emailSettings'
import { getGoogleCalendarConnectionStatus } from '../infrastructure/googleCalendar'
import { fetchGoogleBusinessReviews, listGoogleBusinessLocations } from '../infrastructure/googleBusiness'

export const adminRouter: Router = Router()

const emailSettingsSchema = z.object({
  host: z.string().trim().min(1, 'Host SMTP é obrigatório'),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().min(1, 'Usuário SMTP é obrigatório'),
  password: z.string().optional(),
  from: z.string().trim().email('E-mail remetente inválido'),
  fromName: z.string().trim().min(1, 'Nome do remetente é obrigatório'),
  adminEmail: z.string().trim().email('E-mail administrativo inválido'),
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

async function requireGoogleBusinessReady() {
  const status = await getGoogleCalendarConnectionStatus()

  if (!status.configured) {
    throw new AppError(400, 'Google OAuth nao esta configurado no ambiente')
  }

  if (!status.connected) {
    throw new AppError(409, 'Google OAuth nao esta conectado. Autorize a conta no painel de administracao primeiro.')
  }
}

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
    if (!req.user) {
      throw new Error('Sessão inválida')
    }

    const body = emailSettingsSchema.parse(req.body)
    const email = await saveEmailSettings(body, req.user.sub)

    await prisma.auditLog.create({
      data: {
        userId: req.user.sub,
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

adminRouter.post('/reset-baseline', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error('Sessão inválida')
    }

    const triggeredBy = req.user.sub
    const passwordHash = await bcrypt.hash('Teste123', 12)
    const preservedEmails = ['admin@vivianiserena.com', 'colaborador@vivianiserena.com']

    const result = await prisma.$transaction(async (tx) => {
      await tx.notificationRead.deleteMany()
      await tx.webVital.deleteMany()
      await tx.analyticsEvent.deleteMany()
      await tx.session.deleteMany()
      await tx.appointment.deleteMany()
      await tx.financial.deleteMany()
      await tx.consentLog.deleteMany()
      await tx.lead.deleteMany()
      await tx.contentVersion.deleteMany()
      await tx.content.deleteMany()
      await tx.auditLog.deleteMany()
      await tx.securityEvent.deleteMany()
      await tx.user.deleteMany({
        where: {
          email: {
            notIn: preservedEmails,
          },
        },
      })

      const admin = await tx.user.upsert({
        where: { email: 'admin@vivianiserena.com' },
        update: {
          name: 'Viviani Serene',
          passwordHash,
          role: UserRole.ADMIN,
          allowedModules: [],
          mustChangePassword: false,
          twoFactorEnabled: false,
          twoFactorEmailEnabled: false,
          twoFactorSmsEnabled: false,
        },
        create: {
          name: 'Viviani Serene',
          email: 'admin@vivianiserena.com',
          passwordHash,
          role: UserRole.ADMIN,
          allowedModules: [],
          mustChangePassword: false,
          twoFactorEnabled: false,
          twoFactorEmailEnabled: false,
          twoFactorSmsEnabled: false,
        },
      })

      await tx.user.upsert({
        where: { email: 'colaborador@vivianiserena.com' },
        update: {
          name: 'João Vitor',
          passwordHash,
          role: UserRole.VIEWER,
          allowedModules: ['dashboard', 'leads', 'financeiro'],
          mustChangePassword: false,
          twoFactorEnabled: false,
          twoFactorEmailEnabled: false,
          twoFactorSmsEnabled: false,
        },
        create: {
          name: 'João Vitor',
          email: 'colaborador@vivianiserena.com',
          passwordHash,
          role: UserRole.VIEWER,
          allowedModules: ['dashboard', 'leads', 'financeiro'],
          mustChangePassword: false,
          twoFactorEnabled: false,
          twoFactorEmailEnabled: false,
          twoFactorSmsEnabled: false,
        },
      })

      const contentEntries = [
        { section: ContentSection.hero, key: 'title', value: { pt: 'Viviani Serena - Estética Avançada' } },
        { section: ContentSection.hero, key: 'subtitle', value: { pt: 'Resultados premium com tecnologia e acolhimento.' } },
        { section: ContentSection.contact, key: 'whatsapp', value: { number: '5511915751770', message: 'Olá! Gostaria de saber mais.' } },
      ] as const

      for (const entry of contentEntries) {
        await tx.content.create({
          data: {
            ...entry,
            updatedBy: admin.id,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'reset',
          resource: 'baseline',
          details: {
            triggeredBy,
            preservedEmailSettings: true,
          },
        },
      })

      return {
        adminEmail: 'admin@vivianiserena.com',
        collaboratorEmail: 'colaborador@vivianiserena.com',
        password: 'Teste123',
      }
    })

    res.json({
      success: true,
      message: 'Banco de homologação resetado para o baseline operacional.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/google-business/locations', async (_req, res, next) => {
  try {
    await requireGoogleBusinessReady()
    const locations = await listGoogleBusinessLocations()
    res.json({ success: true, data: locations })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/google-business/reviews', async (req, res, next) => {
  try {
    await requireGoogleBusinessReady()
    const body = z.object({
      locations: z.array(linkedGoogleLocationSchema).max(25),
    }).parse(req.body)

    const reviews = await fetchGoogleBusinessReviews(body.locations)
    res.json({ success: true, data: reviews })
  } catch (error) {
    next(error)
  }
})
