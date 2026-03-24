import { Router } from 'express'
import { z } from 'zod'
import path from 'path'
import multer from 'multer'
import sharp from 'sharp'
import { Prisma, type ContentSection } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { apiEnv } from '../lib/env'
import { logger } from '../lib/logger'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import {
  buildUploadUrl,
  deleteFile,
  ensureUploadStorageReady,
  uploadFile,
} from '../infrastructure/storage'
import { fetchGoogleBusinessReviews, type GoogleBusinessLocation } from '../infrastructure/googleBusiness'
import { UPLOAD } from '../shared/constants'

export const contentRouter: Router = Router()

const updateSchema = z.object({ value: z.unknown() })
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: UPLOAD.MAX_SIZE },
  fileFilter: (_req, file, callback) => {
    if (UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
      callback(null, true)
      return
    }

    callback(new Error('Invalid file type. Only images are allowed.'))
  },
})

type ContentVersionRecord = {
  id: string
  section: ContentSection
  key: string
  value: Prisma.JsonValue
  version: number
  reason: string
  createdAt: Date
  restoredFromId: string | null
  user: { id: string; name: string | null; email: string }
}

function normalizeSectionAlias(section: string): ContentSection {
  return (section === 'sobre' ? 'about' : section) as ContentSection
}

function normalizeContentValue(value: unknown): Prisma.InputJsonValue {
  return typeof value === 'object' && value !== null
    ? (value as Prisma.InputJsonValue)
    : ({ value } as Prisma.InputJsonValue)
}

async function getNextContentVersion(
  db: Pick<typeof prisma, 'contentVersion'>,
  section: ContentSection,
  key: string
) {
  const lastVersion = await db.contentVersion.findFirst({
    where: { section, key },
    orderBy: { version: 'desc' },
    select: { version: true },
  })

  return (lastVersion?.version ?? 0) + 1
}

async function createContentVersion(params: {
  db: Pick<typeof prisma, 'contentVersion'>
  section: ContentSection
  key: string
  value: Prisma.InputJsonValue
  createdBy: string
  contentId?: string | null
  reason?: string
  restoredFromId?: string | null
}) {
  const version = await getNextContentVersion(params.db, params.section, params.key)

  return params.db.contentVersion.create({
    data: {
      contentId: params.contentId ?? null,
      section: params.section,
      key: params.key,
      value: params.value,
      version,
      reason: params.reason ?? 'update',
      restoredFromId: params.restoredFromId ?? null,
      createdBy: params.createdBy,
    },
  })
}

function mapVersionEntry(entry: ContentVersionRecord) {
  return {
    id: entry.id,
    section: entry.section,
    key: entry.key,
    value: entry.value,
    version: entry.version,
    reason: entry.reason,
    savedAt: entry.createdAt.toISOString(),
    restoredFromId: entry.restoredFromId,
    author: {
      id: entry.user.id,
      name: entry.user.name,
      email: entry.user.email,
    },
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function normalizeLinkedGoogleLocations(value: unknown): GoogleBusinessLocation[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => asObject(item))
    .filter((item) => item.accountName && item.locationName && item.locationId)
    .map((item) => ({
      accountName: asString(item.accountName),
      accountId: asString(item.accountId),
      accountLabel: asString(item.accountLabel),
      locationName: asString(item.locationName),
      locationId: asString(item.locationId),
      title: asString(item.title, 'Perfil Google'),
      address: asString(item.address),
    }))
}

contentRouter.get('/', async (_req, res, next) => {
  try {
    const contents = await prisma.content.findMany()
    const result: Record<string, Record<string, unknown>> = {}

    contents.forEach((content) => {
      if (!result[content.section]) {
        result[content.section] = {}
      }

      result[content.section][content.key] = content.value
    })

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

contentRouter.get('/site-summary', async (_req, res, next) => {
  try {
    const [leadCount, completedAppointments, convertedCases, configuredContent] = await Promise.all([
      prisma.lead.count(),
      prisma.appointment.count({ where: { status: 'completed' } }),
      prisma.lead.count({ where: { status: 'converted' } }),
      prisma.content.findMany({
        where: {
          OR: [
            { section: 'contact', key: 'social_proof' },
            { section: 'contact', key: 'trust_stats' },
            { section: 'testimonials', key: 'display_options' },
            { section: 'testimonials', key: 'google_business_locations' },
            { section: 'testimonials', key: 'google_business' },
          ],
        },
      }),
    ])

    const contentMap = configuredContent.reduce<Record<string, Prisma.JsonValue>>((acc, item) => {
      acc[`${item.section}.${item.key}`] = item.value
      return acc
    }, {})

    const socialProof = asObject(contentMap['contact.social_proof'])
    const trustStats = asObject(contentMap['contact.trust_stats'])
    const testimonialDisplay = asObject(contentMap['testimonials.display_options'])
    const googleBusiness = asObject(contentMap['testimonials.google_business'])
    const googleBusinessLocations = contentMap['testimonials.google_business_locations']

    const googleEnabled = asBoolean(testimonialDisplay.googleEnabled, asBoolean(googleBusiness.enabled))
    const linkedLocations = normalizeLinkedGoogleLocations(
      Array.isArray(googleBusinessLocations) ? googleBusinessLocations : googleBusiness.locations
    )

    let googleReviewCount = 0
    let googleAverageRating: number | null = null
    let googleReviews: Awaited<ReturnType<typeof fetchGoogleBusinessReviews>>['reviews'] = []

    if (googleEnabled && linkedLocations.length > 0) {
      try {
        const googlePayload = await fetchGoogleBusinessReviews(linkedLocations)
        googleReviewCount = googlePayload.count
        googleAverageRating = googlePayload.averageRating
        googleReviews = googlePayload.reviews
      } catch (error) {
        logger.warn('Google Business reviews unavailable for site summary', {
          linkedLocations: linkedLocations.length,
          error: error instanceof Error ? error.message : 'unknown_error',
        })
        googleReviewCount = 0
        googleAverageRating = null
        googleReviews = []
      }
    }

    const baseClients = asNumber(socialProof.baseClients)
    const basePublicReviews = asNumber(socialProof.basePublicReviews)
    const clientsRegistered = baseClients + leadCount
    const publicReviews = basePublicReviews + googleReviewCount

    res.json({
      success: true,
      data: {
        socialProof: {
          enabled: asBoolean(socialProof.enabled, true),
          baseClients,
          basePublicReviews,
          actualLeads: leadCount,
          clientsRegistered,
          publicReviews,
          averageRating: googleAverageRating,
        },
        trust: {
          clientsRegistered,
          publicReviews,
          completedAppointments: asNumber(trustStats.baseCompletedAppointments) + completedAppointments,
          convertedCases: asNumber(trustStats.baseConvertedCases) + convertedCases,
        },
        googleBusiness: {
          enabled: googleEnabled,
          linkedLocations,
          reviewCount: googleReviewCount,
          averageRating: googleAverageRating,
          reviews: googleReviews,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

contentRouter.get('/history', authenticate, authorizePermission('editar-site.history'), async (req, res, next) => {
  try {
    const query = historyQuerySchema.parse(req.query)
    const limit = query.limit ?? 25

    const history = await prisma.contentVersion.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: history.map((entry) => mapVersionEntry(entry as ContentVersionRecord)),
    })
  } catch (error) {
    next(error)
  }
})

contentRouter.post('/history/:id/restore', authenticate, authorizePermission('editar-site.restore'), async (req, res, next) => {
  try {
    const versionId = String(req.params.id)
    if (!req.user) {
      throw new AppError(401, 'Sessão inválida')
    }

    const restoredBy = req.user.sub

    const sourceVersion = await prisma.contentVersion.findUnique({
      where: { id: versionId },
    })

    if (!sourceVersion) {
      throw new AppError(404, 'Versao nao encontrada')
    }

    const restoredValue = sourceVersion.value as Prisma.InputJsonValue

    const result = await prisma.$transaction(async (tx) => {
      const content = await tx.content.upsert({
        where: {
          section_key: {
            section: sourceVersion.section,
            key: sourceVersion.key,
          },
        },
        update: {
          value: restoredValue,
          updatedBy: restoredBy,
        },
        create: {
          section: sourceVersion.section,
          key: sourceVersion.key,
          value: restoredValue,
          updatedBy: restoredBy,
        },
      })

      const version = await tx.contentVersion.findFirst({
        where: {
          section: sourceVersion.section,
          key: sourceVersion.key,
        },
        orderBy: { version: 'desc' },
        select: { version: true },
      })

      await tx.contentVersion.create({
        data: {
          contentId: content.id,
          section: sourceVersion.section,
          key: sourceVersion.key,
          value: restoredValue,
          version: (version?.version ?? 0) + 1,
          reason: 'restore',
          restoredFromId: sourceVersion.id,
          createdBy: restoredBy,
        },
      })

      return content
    })

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

contentRouter.post('/upload', authenticate, authorizePermission('editar-site.upload'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file provided' })
      return
    }

    await ensureUploadStorageReady()

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const fullBuffer = await sharp(req.file.buffer)
      .resize(UPLOAD.FULL_WIDTH, undefined, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
    const thumbBuffer = await sharp(req.file.buffer)
      .resize(UPLOAD.THUMB_WIDTH, undefined, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    const blurBuffer = await sharp(req.file.buffer)
      .resize(UPLOAD.BLUR_SIZE, undefined, { withoutEnlargement: true })
      .webp({ quality: 10 })
      .toBuffer()

    const filename = `${id}.webp`
    const thumbnail = `${id}-thumb.webp`
    const blur = `${id}-blur.webp`

    await Promise.all([
      uploadFile({ filename, buffer: fullBuffer, contentType: 'image/webp' }),
      uploadFile({ filename: thumbnail, buffer: thumbBuffer, contentType: 'image/webp' }),
      uploadFile({ filename: blur, buffer: blurBuffer, contentType: 'image/webp' }),
    ])

    res.json({
      success: true,
      data: {
        url: buildUploadUrl(filename),
        thumbnail: buildUploadUrl(thumbnail),
        blur: buildUploadUrl(blur),
        filename,
      },
    })
  } catch (error) {
    next(error)
  }
})

contentRouter.post('/publish', authenticate, authorizePermission('editar-site.publish'), async (_req, res, next) => {
  try {
    const landingRevalidateUrl = apiEnv.landingRevalidateUrl
    const secret = apiEnv.revalidateSecret

    if (!landingRevalidateUrl) {
      throw new AppError(400, 'LANDING_REVALIDATE_URL nao configurado')
    }

    if (!secret) {
      throw new AppError(400, 'REVALIDATE_SECRET nao configurado')
    }

    const url = new URL(landingRevalidateUrl)
    url.searchParams.set('secret', secret)

    const response = await fetch(url.toString(), { method: 'POST' })
    if (!response.ok) {
      throw new AppError(502, 'Falha ao revalidar a landing')
    }

    res.json({ success: true, message: 'Landing revalidada com sucesso' })
  } catch (error) {
    next(error)
  }
})

contentRouter.delete('/upload/:filename', authenticate, authorizePermission('editar-site.delete'), async (req, res, next) => {
  try {
    const baseName = path.basename(String(req.params.filename)).replace(/(-thumb|-blur)?\.(webp|jpg|png)$/, '')
    const files = [`${baseName}.webp`, `${baseName}-thumb.webp`, `${baseName}-blur.webp`]

    await Promise.all(files.map((file) => deleteFile(file)))

    res.json({ success: true, message: 'File deleted' })
  } catch (error) {
    next(error)
  }
})

contentRouter.get('/:section/:key/history', authenticate, authorizePermission('editar-site.history'), async (req, res, next) => {
  try {
    const section = normalizeSectionAlias(String(req.params.section))
    const key = String(req.params.key)
    const query = historyQuerySchema.parse(req.query)
    const limit = query.limit ?? 20

    const history = await prisma.contentVersion.findMany({
      where: { section, key },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: history.map((entry) => mapVersionEntry(entry as ContentVersionRecord)),
    })
  } catch (error) {
    next(error)
  }
})

// ── Auto-templates ──────────────────────────────────────────────────────────

const autoTemplateBodySchema = z.object({
  emailHtml: z.string().max(100000).optional(),
  whatsappText: z.string().max(10000).optional(),
})

const VALID_TEMPLATE_IDS = [
  'appointment_confirmation',
  'appointment_reminder_24h',
  'appointment_reminder_1h',
  'appointment_cancellation',
  'lead_welcome',
  'lead_converted',
  'auth_2fa',
]

contentRouter.get('/auto-templates', authenticate, async (_req, res) => {
  try {
    const templates = await prisma.autoTemplate.findMany()
    return res.json({ success: true, data: templates })
  } catch (error) {
    console.error('[auto-templates GET]', error)
    return res.json({ success: true, data: [] })
  }
})

contentRouter.put('/auto-templates/:templateId', authenticate, authorizePermission('editar-site.update'), async (req, res, next) => {
  try {
    const templateId = String(req.params.templateId)
    if (!VALID_TEMPLATE_IDS.includes(templateId)) {
      throw new AppError(400, `templateId inválido: ${templateId}`)
    }
    const body = autoTemplateBodySchema.parse(req.body)
    const template = await prisma.autoTemplate.upsert({
      where: { templateId },
      update: { emailHtml: body.emailHtml ?? null, whatsappText: body.whatsappText ?? null },
      create: { templateId, emailHtml: body.emailHtml ?? null, whatsappText: body.whatsappText ?? null },
    })
    return res.json({ success: true, data: template })
  } catch (error) {
    console.error('[auto-templates PUT]', error)
    next(error)
  }
})

// ── Section / key wildcard routes (keep AFTER specific routes) ───────────────

contentRouter.get('/:section', async (req, res, next) => {
  try {
    const contents = await prisma.content.findMany({ where: { section: normalizeSectionAlias(String(req.params.section)) } })
    const result = contents.reduce<Record<string, unknown>>((acc, content) => {
      acc[content.key] = content.value
      return acc
    }, {})

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

contentRouter.get('/:section/:key', async (req, res, next) => {
  try {
    const section = normalizeSectionAlias(String(req.params.section))
    const key = String(req.params.key)
    const content = await prisma.content.findUnique({ where: { section_key: { section, key } } })
    res.json({ success: true, data: content ? content.value : null })
  } catch (error) {
    next(error)
  }
})

contentRouter.put('/:section/:key', authenticate, authorizePermission('editar-site.update'), async (req, res, next) => {
  try {
    const { value } = updateSchema.parse(req.body)
    const section = normalizeSectionAlias(String(req.params.section))
    const key = String(req.params.key)
    if (!req.user) {
      throw new AppError(401, 'Sessão inválida')
    }

    const updatedBy = req.user.sub
    const jsonValue = normalizeContentValue(value)

    const content = await prisma.$transaction(async (tx) => {
      const saved = await tx.content.upsert({
        where: { section_key: { section, key } },
        update: { value: jsonValue, updatedBy },
        create: { section, key, value: jsonValue, updatedBy },
      })

      const lastVersion = await tx.contentVersion.findFirst({
        where: { section, key },
        orderBy: { version: 'desc' },
        select: { version: true },
      })

      await tx.contentVersion.create({
        data: {
          contentId: saved.id,
          section,
          key,
          value: jsonValue,
          version: (lastVersion?.version ?? 0) + 1,
          reason: 'update',
          createdBy: updatedBy,
        },
      })

      return saved
    })

    res.json({ success: true, data: content })
  } catch (error) {
    next(error)
  }
})

contentRouter.delete('/:section/:key', authenticate, authorizePermission('editar-site.delete'), async (req, res, next) => {
  try {
    const section = normalizeSectionAlias(String(req.params.section))
    const key = String(req.params.key)
    if (!req.user) {
      throw new AppError(401, 'Sessão inválida')
    }

    const deletedBy = req.user.sub
    const existing = await prisma.content.findUnique({
      where: { section_key: { section, key } },
    })

    if (!existing) {
      throw new AppError(404, 'Campo nao encontrado')
    }

    await prisma.$transaction(async (tx) => {
      await createContentVersion({
        db: tx,
        section,
        key,
        value: existing.value as Prisma.InputJsonValue,
        createdBy: deletedBy,
        contentId: existing.id,
        reason: 'delete',
      })

      await tx.content.delete({ where: { section_key: { section, key } } })
    })

    res.json({ success: true, message: 'Campo removido' })
  } catch (error) {
    next(error)
  }
})
