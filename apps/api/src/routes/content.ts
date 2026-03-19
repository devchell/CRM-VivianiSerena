import { Router } from 'express'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import sharp from 'sharp'
import { Prisma, type ContentSection } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { apiEnv } from '../lib/env'
import { authenticate, authorize } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { UPLOAD } from '../shared/constants'

export const contentRouter: Router = Router()

const updateSchema = z.object({ value: z.unknown() })
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const uploadDir = path.resolve(UPLOAD.DIR)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

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

contentRouter.get('/history', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
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

contentRouter.post('/history/:id/restore', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const versionId = String(req.params.id)
    const restoredBy = req.user!.sub

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

contentRouter.post('/upload', authenticate, authorize('ADMIN', 'MANAGER'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file provided' })
      return
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const fullPath = path.join(uploadDir, `${id}.webp`)
    const thumbPath = path.join(uploadDir, `${id}-thumb.webp`)
    const blurPath = path.join(uploadDir, `${id}-blur.webp`)

    await sharp(req.file.buffer).resize(UPLOAD.FULL_WIDTH, undefined, { withoutEnlargement: true }).webp({ quality: 85 }).toFile(fullPath)
    await sharp(req.file.buffer).resize(UPLOAD.THUMB_WIDTH, undefined, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(thumbPath)
    await sharp(req.file.buffer).resize(UPLOAD.BLUR_SIZE, undefined, { withoutEnlargement: true }).webp({ quality: 10 }).toFile(blurPath)

    const baseUrl = `${apiEnv.apiBaseUrl}/uploads/`
    res.json({
      success: true,
      data: {
        url: `${baseUrl}${id}.webp`,
        thumbnail: `${baseUrl}${id}-thumb.webp`,
        blur: `${baseUrl}${id}-blur.webp`,
        filename: `${id}.webp`,
      },
    })
  } catch (error) {
    next(error)
  }
})

contentRouter.post('/publish', authenticate, authorize('ADMIN', 'MANAGER'), async (_req, res, next) => {
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

contentRouter.delete('/upload/:filename', authenticate, authorize('ADMIN', 'MANAGER'), (req, res, next) => {
  try {
    const baseName = path.basename(String(req.params.filename)).replace(/(-thumb|-blur)?\.(webp|jpg|png)$/, '')
    const files = [`${baseName}.webp`, `${baseName}-thumb.webp`, `${baseName}-blur.webp`]

    files.forEach((file) => {
      const filePath = path.join(uploadDir, file)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    })

    res.json({ success: true, message: 'File deleted' })
  } catch (error) {
    next(error)
  }
})

contentRouter.get('/:section/:key/history', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const section = String(req.params.section) as ContentSection
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

contentRouter.get('/:section', async (req, res, next) => {
  try {
    const contents = await prisma.content.findMany({ where: { section: req.params.section as ContentSection } })
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
    const section = String(req.params.section) as ContentSection
    const key = String(req.params.key)
    const content = await prisma.content.findUnique({ where: { section_key: { section, key } } })
    res.json({ success: true, data: content ? content.value : null })
  } catch (error) {
    next(error)
  }
})

contentRouter.put('/:section/:key', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { value } = updateSchema.parse(req.body)
    const section = String(req.params.section) as ContentSection
    const key = String(req.params.key)
    const updatedBy = req.user!.sub
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

contentRouter.delete('/:section/:key', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const section = String(req.params.section) as ContentSection
    const key = String(req.params.key)
    const deletedBy = req.user!.sub
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
