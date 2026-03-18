import { Router } from 'express'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import sharp from 'sharp'
import { type ContentSection } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { apiEnv } from '../lib/env'
import { authenticate, authorize } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { UPLOAD } from '../shared/constants'

export const contentRouter: Router = Router()

const updateSchema = z.object({ value: z.unknown() })

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
    const jsonValue = typeof value === 'object' && value !== null ? value : { value }

    const content = await prisma.content.upsert({
      where: { section_key: { section, key } },
      update: { value: jsonValue as object, updatedBy },
      create: { section, key, value: jsonValue as object, updatedBy },
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

    await prisma.content.delete({ where: { section_key: { section, key } } })
    res.json({ success: true, message: 'Campo removido' })
  } catch (error) {
    next(error)
  }
})
