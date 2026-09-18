import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { ContentSection, UserRole } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { authenticate, authorize } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { apiEnv } from '../lib/env'
import { deletePrivateFile, healthcheckUploadStorage } from '../infrastructure/storage'
import { getActiveEmailSettings, getEmailSettingsOverview, saveEmailSettings } from '../infrastructure/emailSettings'
import { emailService } from '../infrastructure/email'
import { getGoogleCalendarConnectionStatus } from '../infrastructure/googleCalendar'
import { fetchGoogleBusinessReviews, listGoogleBusinessLocations } from '../infrastructure/googleBusiness'
import {
  connectWhatsAppBusinessChannel,
  disconnectWhatsAppBusinessChannel,
  getWhatsAppChannelStatus,
} from '../infrastructure/whatsapp'
import { emailRateLimiter } from '../middleware/rateLimiter'
import { maskEmail } from '../lib/redact'
import { logger } from '../lib/logger'

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

const whatsappConnectSchema = z.object({
  code: z.string().min(1),
  phoneNumberId: z.string().optional(),
  wabaId: z.string().optional(),
  businessAccountId: z.string().optional(),
  appScopedUserId: z.string().optional(),
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
    const [google, uploads, whatsapp] = await Promise.all([
      getGoogleCalendarConnectionStatus(),
      healthcheckUploadStorage(),
      getWhatsAppChannelStatus(),
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
          whatsapp,
        },
        infrastructure: {
          database,
          redis: redisReady,
          uploads,
          storageDriver: 'local',
        },
        environment: {
          apiBaseUrl: apiEnv.apiBaseUrl,
          crmUrl: apiEnv.crmUrl,
          corsOrigins: apiEnv.corsOrigins,
          googleRedirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() ?? null,
          googleClientConfigured: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
          calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary',
          whatsappAppId: apiEnv.whatsappAppId ?? null,
          whatsappEmbeddedSignupConfigId: apiEnv.whatsappEmbeddedSignupConfigId ?? null,
          whatsappWebhookPath: whatsapp.webhookPath,
          whatsappGraphApiVersion: whatsapp.graphApiVersion,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/whatsapp/status', async (_req, res, next) => {
  try {
    res.json({ success: true, data: await getWhatsAppChannelStatus() })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/whatsapp/connect', async (req, res, next) => {
  try {
    if (!req.user?.sub) {
      throw new AppError(401, 'Sessao invalida')
    }

    const body = whatsappConnectSchema.parse(req.body)
    const status = await connectWhatsAppBusinessChannel(body, {
      userId: req.user.sub,
      ip: req.ip,
    })

    res.json({
      success: true,
      message: 'Canal oficial do WhatsApp conectado com sucesso',
      data: status,
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/whatsapp/connect', async (req, res, next) => {
  try {
    if (!req.user?.sub) {
      throw new AppError(401, 'Sessao invalida')
    }

    const status = await disconnectWhatsAppBusinessChannel({
      userId: req.user.sub,
      ip: req.ip,
    })

    res.json({
      success: true,
      message: 'Canal oficial do WhatsApp desconectado',
      data: status,
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
          from: email.from ? maskEmail(email.from) : null,
          adminEmail: email.adminEmail ? maskEmail(email.adminEmail) : null,
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

adminRouter.post('/email-settings/test', emailRateLimiter, async (req, res, next) => {
  try {
    const settings = await getActiveEmailSettings()
    if (!settings.configured || !settings.adminEmail) {
      throw new AppError(409, 'Configure o SMTP e o e-mail administrativo antes de enviar um teste')
    }

    const body = z.object({
      to: z.string().trim().email('E-mail de teste inválido').optional(),
    }).parse(req.body)
    const to = body.to ?? settings.adminEmail
    const sent = await emailService.sendTestEmail(to)

    if (!sent) {
      throw new AppError(502, 'O SMTP recusou o envio. Revise host, porta, segurança e credenciais.')
    }

    if (req.user?.sub) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.sub,
          action: 'send_test',
          resource: 'email_settings',
          details: { to: maskEmail(to) },
        },
      })
    }

    res.json({ success: true, message: `E-mail de teste enviado para ${to}` })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/reset-baseline', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error('Sessão inválida')
    }

    if (!apiEnv.allowBaselineReset) {
      throw new AppError(403, 'Reset de baseline desabilitado neste ambiente')
    }

    if (!apiEnv.baselineResetPassword) {
      throw new AppError(500, 'BASELINE_RESET_PASSWORD nao configurada para este ambiente')
    }

    const triggeredBy = req.user.sub
    const passwordHash = await bcrypt.hash(apiEnv.baselineResetPassword, 12)
    const preservedEmails = ['admin@vivianiserena.com', 'colaborador@vivianiserena.com']
    const mediaFiles = await prisma.clientFolderMedia.findMany({
      select: { originalStorageKey: true, optimizedStorageKey: true },
    })

    const result = await prisma.$transaction(async (tx) => {
      await tx.notificationRead.deleteMany()
      await tx.webVital.deleteMany()
      await tx.analyticsEvent.deleteMany()
      await tx.session.deleteMany()
      await tx.appointment.deleteMany()
      await tx.clientFolderMedia.deleteMany()
      await tx.clientFolder.deleteMany()
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
      }
    })

    const cleanup = await Promise.allSettled(mediaFiles.flatMap((media) => [
      deletePrivateFile(media.originalStorageKey),
      deletePrivateFile(media.optimizedStorageKey),
    ]))
    cleanup.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.warn('Baseline reset left private media cleanup pending', {
          index,
          error: result.reason,
        })
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
