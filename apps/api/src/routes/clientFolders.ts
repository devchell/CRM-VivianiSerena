import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'
import { hasPermission } from '@viviani/types'
import { prisma } from '../lib/prisma'
import { apiEnv } from '../lib/env'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { AuditLogger } from '../infrastructure/security/AuditLogger'
import { deletePrivateFile, readPrivateUploadFile, uploadPrivateFile } from '../infrastructure/storage'
import { UPLOAD } from '../shared/constants'
import { logger } from '../lib/logger'

export const clientFoldersRouter: Router = Router()

const folderIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
const stageSchema = z.enum(['before', 'progress', 'after'])
const folderBodySchema = z.object({
  clientId: folderIdSchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  position: z.number().int().min(0).max(100).optional(),
  leadId: folderIdSchema.nullable().optional(),
  clientName: z.string().trim().min(2).max(120).optional(),
  clientEmail: z.string().trim().email().max(255).nullable().optional(),
  clientPhone: z.string().trim().max(40).nullable().optional(),
  serviceLabel: z.string().trim().max(120).nullable().optional(),
  notes: z.string().max(5_000).nullable().optional(),
  publicTitle: z.string().trim().max(120).nullable().optional(),
  publicDescription: z.string().max(1_000).nullable().optional(),
  isPublished: z.boolean().optional(),
  publicConsent: z.boolean().optional(),
})
const updateBodySchema = folderBodySchema.omit({ leadId: true }).partial()
const clientBodySchema = z.object({
  leadId: folderIdSchema.nullable().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().max(5_000).nullable().optional(),
})
const clientUpdateSchema = clientBodySchema.partial()
const reorderBodySchema = z.object({
  folderIds: z.array(folderIdSchema).max(100),
})
const mediaBodySchema = z.object({
  stage: stageSchema,
  capturedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
})
const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD.MAX_SIZE },
  fileFilter: (_req, file, callback) => {
    callback(null, UPLOAD.ALLOWED_TYPES.includes(file.mimetype))
  },
})

const folderInclude = {
  lead: { select: { id: true, name: true, email: true, phone: true } },
  client: { select: { id: true, leadId: true, name: true, email: true, phone: true, notes: true } },
  media: { orderBy: { capturedAt: 'asc' as const } },
} as const

const clientListInclude = {
  lead: { select: { id: true, name: true, email: true, phone: true } },
  _count: { select: { folders: true } },
} as const

const clientDetailInclude = {
  lead: { select: { id: true, name: true, email: true, phone: true } },
  folders: { orderBy: [{ position: 'asc' }, { occurredAt: 'asc' }], include: folderInclude },
} satisfies Prisma.ClientInclude

type FolderWithRelations = NonNullable<Awaited<ReturnType<typeof prisma.clientFolder.findUnique>>> & {
  lead: { id: string; name: string; email: string; phone: string | null } | null
  client?: { id: string; leadId: string | null; name: string; email: string | null; phone: string | null; notes: string | null } | null
  media: Array<{
    id: string
    folderId: string
    stage: 'before' | 'progress' | 'after'
    capturedAt: Date
    note: string | null
    originalFilename: string
    optimizedStorageKey: string
    width: number
    height: number
    createdAt: Date
  }>
}

type ClientRecord = {
  id: string
  leadId: string | null
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lead: { id: string; name: string; email: string; phone: string | null } | null
  folders?: FolderWithRelations[]
  _count?: { folders: number }
}

function normalizeNullable(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function dateAtNoonUtc(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new AppError(400, 'Data da imagem inválida')
  return date
}

function dateOrNow(value: string | undefined) {
  return value ? dateAtNoonUtc(value) : new Date()
}

function mediaUrl(folderId: string, mediaId: string) {
  return `${apiEnv.apiBaseUrl}/api/v1/client-folders/public/${folderId}/media/${mediaId}`
}

function privateMediaUrl(folderId: string, mediaId: string) {
  return `${apiEnv.apiBaseUrl}/api/v1/client-folders/${folderId}/media/${mediaId}`
}

function mapMedia(folderId: string, media: FolderWithRelations['media'][number]) {
  return {
    id: media.id,
    stage: media.stage,
    capturedAt: media.capturedAt.toISOString().slice(0, 10),
    note: media.note,
    originalFilename: media.originalFilename,
    width: media.width,
    height: media.height,
    url: privateMediaUrl(folderId, media.id),
  }
}

function mapFolder(folder: FolderWithRelations) {
  const client = folder.client ?? {
    id: folder.clientId,
    leadId: folder.leadId,
    name: folder.clientName,
    email: folder.clientEmail,
    phone: folder.clientPhone,
    notes: folder.notes,
  }
  return {
    id: folder.id,
    clientId: folder.clientId,
    name: folder.name,
    occurredAt: folder.occurredAt.toISOString().slice(0, 10),
    position: folder.position,
    leadId: folder.leadId,
    clientName: folder.clientName,
    clientEmail: folder.clientEmail,
    clientPhone: folder.clientPhone,
    serviceLabel: folder.serviceLabel,
    notes: folder.notes,
    publicTitle: folder.publicTitle,
    publicDescription: folder.publicDescription,
    isPublished: folder.isPublished,
    hasPublicConsent: Boolean(folder.publicConsentAt),
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    lead: folder.lead,
    client,
    media: folder.media.map((item) => mapMedia(folder.id, item)),
  }
}

function mapClient(client: ClientRecord) {
  return {
    id: client.id,
    leadId: client.leadId,
    name: client.name,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    lead: client.lead,
    folderCount: client._count?.folders ?? client.folders?.length ?? 0,
    folders: client.folders?.map((folder) => mapFolder(folder)) ?? [],
  }
}

async function findFolder(id: string) {
  const folder = await prisma.clientFolder.findUnique({ where: { id }, include: folderInclude })
  if (!folder) throw new AppError(404, 'Pasta não encontrada')
  return folder as FolderWithRelations
}

async function removeMediaFiles(keys: string[]) {
  const results = await Promise.allSettled(keys.map((key) => deletePrivateFile(key)))
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn('Client folder media cleanup failed', { key: keys[index], error: result.reason })
    }
  })
}

async function audit(
  base: { userId: string; ip?: string },
  action: string,
  folderId: string,
  extra?: Record<string, unknown>,
  resource = 'ClientFolder',
) {
  await AuditLogger.log({
    ...base,
    action,
    resource,
    details: { folderId, ...extra },
  })
}

// Public routes intentionally precede authenticate. They return only published
// folders and optimized derivatives; the original upload key never leaves the API.
clientFoldersRouter.get('/public', async (_req, res, next) => {
  try {
    const folders = await prisma.clientFolder.findMany({
      where: { isPublished: true, publicConsentAt: { not: null }, media: { some: {} } },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: { media: { orderBy: { capturedAt: 'asc' } } },
    })

    res.json({
      success: true,
      data: folders.map((folder) => ({
        id: folder.id,
        title: folder.publicTitle?.trim() || 'Resultado de cliente',
        description: folder.publicDescription,
        serviceLabel: folder.serviceLabel,
        media: folder.media.map((item) => ({
          id: item.id,
          stage: item.stage,
          capturedAt: item.capturedAt.toISOString().slice(0, 10),
          width: item.width,
          height: item.height,
          url: mediaUrl(folder.id, item.id),
        })),
      })),
    })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.get('/public/:id/media/:mediaId', async (req, res, next) => {
  try {
    const folderId = folderIdSchema.parse(req.params.id)
    const mediaId = folderIdSchema.parse(req.params.mediaId)
    const media = await prisma.clientFolderMedia.findFirst({
      where: {
        id: mediaId,
        folderId,
        folder: { isPublished: true, publicConsentAt: { not: null } },
      },
      select: { optimizedStorageKey: true },
    })
    if (!media) throw new AppError(404, 'Imagem não encontrada')

    const buffer = await readPrivateUploadFile(media.optimizedStorageKey)
    res.type('image/webp').set('Cache-Control', 'no-store').send(buffer)
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.use(authenticate)

async function findClientSummary(id: string) {
  const client = await prisma.client.findUnique({ where: { id }, include: clientListInclude })
  if (!client) throw new AppError(404, 'Cliente não encontrado')
  return client as unknown as ClientRecord
}

async function findClientDetail(id: string) {
  const client = await prisma.client.findUnique({ where: { id }, include: clientDetailInclude })
  if (!client) throw new AppError(404, 'Cliente não encontrado')
  return client as unknown as ClientRecord
}

async function findLead(leadId: string | null | undefined) {
  if (!leadId) return null
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, deletedAt: null, anonymized: false },
    select: { id: true, name: true, email: true, phone: true },
  })
  if (!lead) throw new AppError(404, 'Lead não encontrado')
  return lead
}

clientFoldersRouter.get('/clients', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query)
    const search = query.search?.trim()
    const clients = await prisma.client.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
      include: clientListInclude,
    })
    res.json({ success: true, data: clients.map((client) => mapClient(client as unknown as ClientRecord)) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.get('/clients/:id', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const client = await findClientDetail(folderIdSchema.parse(req.params.id))
    res.json({ success: true, data: mapClient(client) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.post('/clients', authorizePermission('leads.create'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required')
    const input = clientBodySchema.parse(req.body)
    const name = normalizeNullable(input.name)
    if (!name) throw new AppError(400, 'Informe o nome do cliente')
    const lead = await findLead(input.leadId)
    const client = await prisma.client.create({
      data: {
        leadId: lead?.id ?? null,
        name,
        email: normalizeNullable(input.email) ?? lead?.email ?? null,
        phone: normalizeNullable(input.phone) ?? lead?.phone ?? null,
        notes: normalizeNullable(input.notes),
        createdBy: req.user.sub,
      },
      include: clientListInclude,
    })
    await audit({ userId: req.user.sub, ip: req.ip }, 'CREATE', client.id, { linkedLead: Boolean(lead) }, 'Client')
    res.status(201).json({ success: true, data: mapClient(client as unknown as ClientRecord) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.patch('/clients/:id', authorizePermission('leads.update'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required')
    const id = folderIdSchema.parse(req.params.id)
    await findClientSummary(id)
    const input = clientUpdateSchema.parse(req.body)
    const lead = input.leadId === undefined ? null : await findLead(input.leadId)
    const client = await prisma.client.update({
      where: { id },
      data: {
        leadId: input.leadId === undefined ? undefined : lead?.id ?? null,
        name: input.name === undefined ? undefined : input.name.trim(),
        email: input.email === undefined ? undefined : normalizeNullable(input.email),
        phone: input.phone === undefined ? undefined : normalizeNullable(input.phone),
        notes: input.notes === undefined ? undefined : normalizeNullable(input.notes),
      },
      include: clientDetailInclude,
    })
    await prisma.clientFolder.updateMany({
      where: { clientId: id },
      data: {
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        leadId: client.leadId,
      },
    })
    await audit({ userId: req.user.sub, ip: req.ip }, 'UPDATE', id, undefined, 'Client')
    res.json({ success: true, data: mapClient(client as unknown as ClientRecord) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.patch('/clients/:clientId/folders/reorder', authorizePermission('leads.update'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required')
    const clientId = folderIdSchema.parse(req.params.clientId)
    await findClientSummary(clientId)
    const { folderIds } = reorderBodySchema.parse(req.body)
    const current = await prisma.clientFolder.findMany({ where: { clientId }, select: { id: true } })
    const currentIds = new Set(current.map((folder) => folder.id))
    if (currentIds.size !== folderIds.length || folderIds.some((id) => !currentIds.has(id))) {
      throw new AppError(400, 'A ordem de pastas não corresponde a este cliente')
    }
    await prisma.$transaction(folderIds.map((id, position) => prisma.clientFolder.update({
      where: { id },
      data: { position },
    })))
    await audit({ userId: req.user.sub, ip: req.ip }, 'REORDER_FOLDERS', clientId, { count: folderIds.length }, 'Client')
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.get('/', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query)
    const search = query.search?.trim()
    const folders = await prisma.clientFolder.findMany({
      where: search ? {
        OR: [
          { clientName: { contains: search, mode: 'insensitive' } },
          { clientEmail: { contains: search, mode: 'insensitive' } },
          { serviceLabel: { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
      include: folderInclude,
    })
    res.json({ success: true, data: folders.map((folder) => mapFolder(folder as FolderWithRelations)) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.get('/:id', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const folder = await findFolder(folderIdSchema.parse(req.params.id))
    res.json({ success: true, data: mapFolder(folder) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.post('/clients/:clientId/folders', authorizePermission('leads.create'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required')
    const clientId = folderIdSchema.parse(req.params.clientId)
    const client = await findClientSummary(clientId)
    const input = folderBodySchema.parse(req.body)
    if (input.isPublished) throw new AppError(400, 'Adicione ao menos uma imagem antes de publicar a pasta')
    if (input.publicConsent === true && !hasPermission(req.user.role, req.user.permissions ?? req.user.allowedModules, 'editar-site.publish')) {
      throw new AppError(403, 'Apenas usuários autorizados podem autorizar a publicação de imagens')
    }
    const count = await prisma.clientFolder.count({ where: { clientId } })
    const folder = await prisma.clientFolder.create({
      data: {
        clientId,
        name: normalizeNullable(input.name) ?? 'Pasta sem título',
        occurredAt: dateOrNow(input.occurredAt),
        position: input.position ?? count,
        leadId: client.leadId,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        serviceLabel: normalizeNullable(input.serviceLabel),
        notes: normalizeNullable(input.notes),
        publicTitle: normalizeNullable(input.publicTitle),
        publicDescription: normalizeNullable(input.publicDescription),
        isPublished: input.isPublished ?? false,
        publicConsentAt: input.publicConsent ? new Date() : null,
        createdBy: req.user.sub,
      },
      include: folderInclude,
    })
    await audit({ userId: req.user.sub, ip: req.ip }, 'CREATE', folder.id, { clientId }, 'ClientFolder')
    res.status(201).json({ success: true, data: mapFolder(folder as FolderWithRelations) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.post('/', authorizePermission('leads.create'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required')
    const userId = req.user.sub
    const input = folderBodySchema.parse(req.body)
    const client = input.clientId
      ? await findClientSummary(input.clientId)
      : await (async () => {
          const lead = await findLead(input.leadId)
          const clientName = normalizeNullable(input.clientName) ?? lead?.name
          if (!clientName) throw new AppError(400, 'Informe o nome do cliente ou selecione um lead')
          const created = await prisma.client.create({
            data: {
              leadId: lead?.id ?? null,
              name: clientName,
              email: normalizeNullable(input.clientEmail) ?? lead?.email ?? null,
              phone: normalizeNullable(input.clientPhone) ?? lead?.phone ?? null,
              notes: normalizeNullable(input.notes),
              createdBy: userId,
            },
            include: clientListInclude,
          })
          return created as unknown as ClientRecord
        })()
    if (input.isPublished) throw new AppError(400, 'Adicione ao menos uma imagem antes de publicar a pasta')
    if (input.publicConsent === true && !hasPermission(req.user.role, req.user.permissions ?? req.user.allowedModules, 'editar-site.publish')) {
      throw new AppError(403, 'Apenas usuários autorizados podem autorizar a publicação de imagens')
    }

    const folder = await prisma.clientFolder.create({
      data: {
        clientId: client.id,
        name: normalizeNullable(input.name) ?? 'Pasta inicial',
        occurredAt: dateOrNow(input.occurredAt),
        position: input.position ?? 0,
        leadId: client.leadId,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        serviceLabel: normalizeNullable(input.serviceLabel),
        notes: normalizeNullable(input.notes),
        publicTitle: normalizeNullable(input.publicTitle),
        publicDescription: normalizeNullable(input.publicDescription),
        isPublished: input.isPublished ?? false,
        publicConsentAt: input.publicConsent ? new Date() : null,
        createdBy: req.user.sub,
      },
      include: folderInclude,
    })

    await audit({ userId: req.user.sub, ip: req.ip }, 'CREATE', folder.id, { clientId: client.id, linkedLead: Boolean(client.leadId) })
    res.status(201).json({ success: true, data: mapFolder(folder as FolderWithRelations) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.patch('/:id', authorizePermission('leads.update'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required')
    const id = folderIdSchema.parse(req.params.id)
    const currentFolder = await findFolder(id)
    const input = updateBodySchema.parse(req.body)
    const changingPublication = input.isPublished !== undefined
      || input.publicTitle !== undefined
      || input.publicDescription !== undefined
      || input.publicConsent !== undefined
    if (changingPublication && !hasPermission(req.user.role, req.user.permissions ?? req.user.allowedModules, 'editar-site.publish')) {
      throw new AppError(403, 'Apenas usuários autorizados podem publicar pastas')
    }
    if (input.isPublished === true && !currentFolder.publicConsentAt && input.publicConsent !== true) {
      throw new AppError(400, 'Confirme a autorização para publicar as imagens')
    }
    if (input.isPublished === true && currentFolder.media.length === 0) {
      throw new AppError(400, 'Adicione ao menos uma imagem antes de publicar a pasta')
    }
    const nextIsPublished = input.publicConsent === false ? false : input.isPublished
    const folder = await prisma.clientFolder.update({
      where: { id },
      data: {
        name: input.name === undefined ? undefined : input.name.trim(),
        occurredAt: input.occurredAt === undefined ? undefined : dateAtNoonUtc(input.occurredAt),
        position: input.position,
        clientName: input.clientName === undefined ? undefined : input.clientName.trim(),
        clientEmail: input.clientEmail === undefined ? undefined : normalizeNullable(input.clientEmail),
        clientPhone: input.clientPhone === undefined ? undefined : normalizeNullable(input.clientPhone),
        serviceLabel: input.serviceLabel === undefined ? undefined : normalizeNullable(input.serviceLabel),
        notes: input.notes === undefined ? undefined : normalizeNullable(input.notes),
        publicTitle: input.publicTitle === undefined ? undefined : normalizeNullable(input.publicTitle),
        publicDescription: input.publicDescription === undefined ? undefined : normalizeNullable(input.publicDescription),
        isPublished: nextIsPublished,
        publicConsentAt: input.publicConsent === true
          ? new Date()
          : input.publicConsent === false
            ? null
            : undefined,
      },
      include: folderInclude,
    })
    await audit({ userId: req.user.sub, ip: req.ip }, 'UPDATE', id, { published: nextIsPublished })
    res.json({ success: true, data: mapFolder(folder as FolderWithRelations) })
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.get('/:id/media/:mediaId', authorizePermission('leads.view'), async (req, res, next) => {
  try {
    const folderId = folderIdSchema.parse(req.params.id)
    const mediaId = folderIdSchema.parse(req.params.mediaId)
    const media = await prisma.clientFolderMedia.findFirst({
      where: { id: mediaId, folderId },
      select: { optimizedStorageKey: true },
    })
    if (!media) throw new AppError(404, 'Imagem não encontrada')
    const buffer = await readPrivateUploadFile(media.optimizedStorageKey)
    res.type('image/webp').set('Cache-Control', 'private, no-store').send(buffer)
  } catch (error) {
    next(error)
  }
})

clientFoldersRouter.post('/:id/media', authorizePermission('leads.update'), upload.single('file'), async (req, res, next) => {
  let storedKeys: string[] = []
  try {
    if (!req.user) throw new AppError(401, 'Authentication required')
    const folderId = folderIdSchema.parse(req.params.id)
    await findFolder(folderId)
    if (!req.file) throw new AppError(400, 'Selecione uma imagem')
    const file = req.file

    const input = mediaBodySchema.parse(req.body)
    const metadata = await sharp(file.buffer, { limitInputPixels: 25_000_000 }).metadata()
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height) {
      throw new AppError(400, 'Arquivo de imagem inválido')
    }

    const optimized = await sharp(file.buffer, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize(2_400, 2_400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90, effort: 4 })
      .toBuffer()
    const optimizedMetadata = await sharp(optimized).metadata()
    const token = randomUUID()
    const originalExtension = metadata.format === 'jpeg' ? 'jpg' : metadata.format
    const originalStorageKey = `client-folder-${folderId}-${token}-original.${originalExtension}`
    const optimizedStorageKey = `client-folder-${folderId}-${token}.webp`
    storedKeys = [originalStorageKey, optimizedStorageKey]

    await uploadPrivateFile({ filename: originalStorageKey, buffer: file.buffer })
    await uploadPrivateFile({ filename: optimizedStorageKey, buffer: optimized })

    const media = await prisma.$transaction(async (tx) => {
      // ponytail: row lock keeps the 100-media ceiling correct under concurrent uploads.
      await tx.$queryRaw`SELECT id FROM "client_folders" WHERE id = ${folderId} FOR UPDATE`
      const count = await tx.clientFolderMedia.count({ where: { folderId } })
      if (count >= 100) throw new AppError(400, 'Esta pasta já atingiu o limite de 100 imagens')
      return tx.clientFolderMedia.create({
        data: {
          folderId,
          stage: input.stage,
          capturedAt: dateAtNoonUtc(input.capturedAt),
          note: normalizeNullable(input.note),
          originalFilename: file.originalname.slice(0, 255),
          originalStorageKey,
          optimizedStorageKey,
          width: optimizedMetadata.width ?? metadata.width,
          height: optimizedMetadata.height ?? metadata.height,
        },
      })
    })

    await audit({ userId: req.user.sub, ip: req.ip }, 'CREATE_MEDIA', folderId, { mediaId: media.id, stage: media.stage })
    res.status(201).json({
      success: true,
      data: {
        id: media.id,
        stage: media.stage,
        capturedAt: media.capturedAt.toISOString().slice(0, 10),
        note: media.note,
        originalFilename: media.originalFilename,
        width: media.width,
        height: media.height,
        url: privateMediaUrl(folderId, media.id),
      },
    })
  } catch (error) {
    if (storedKeys.length > 0) await removeMediaFiles(storedKeys)
    next(error)
  }
})

clientFoldersRouter.delete('/:id/media/:mediaId', authorizePermission('leads.update'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required')
    const folderId = folderIdSchema.parse(req.params.id)
    const mediaId = folderIdSchema.parse(req.params.mediaId)
    const media = await prisma.clientFolderMedia.findFirst({
      where: { id: mediaId, folderId },
      select: { id: true, originalStorageKey: true, optimizedStorageKey: true },
    })
    if (!media) throw new AppError(404, 'Imagem não encontrada')
    await prisma.clientFolderMedia.delete({ where: { id: media.id } })
    await removeMediaFiles([media.originalStorageKey, media.optimizedStorageKey])
    await audit({ userId: req.user.sub, ip: req.ip }, 'DELETE_MEDIA', folderId, { mediaId })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})
