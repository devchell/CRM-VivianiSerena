import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

process.env.DATABASE_URL ??= 'postgresql://user:pass@db.example.com:5432/app?schema=public'
process.env.REDIS_URL ??= 'redis://redis.example.com:6379'
process.env.API_BASE_URL ??= 'https://api.example.com'
process.env.CRM_URL ??= 'https://crm.example.com'
process.env.CORS_ORIGIN ??= 'https://crm.example.com'
process.env.JWT_PRIVATE_KEY ??= '-----BEGIN RSA PRIVATE KEY-----\nplaceholder\n-----END RSA PRIVATE KEY-----'
process.env.JWT_PUBLIC_KEY ??= '-----BEGIN PUBLIC KEY-----\nplaceholder\n-----END PUBLIC KEY-----'
process.env.NEXTAUTH_SECRET ??= 'test-secret'
process.env.ENCRYPTION_KEY ??= '12345678901234567890123456789012'
process.env.ANONYMIZATION_SALT ??= 'test-anon-salt'

const clientFolderFindMany = vi.fn()
const clientFolderFindUnique = vi.fn()
const clientFolderCreate = vi.fn()
const clientFolderUpdate = vi.fn()
const clientFolderDelete = vi.fn()
const clientFolderMediaFindFirst = vi.fn()
const clientFolderMediaCreate = vi.fn()
const clientFolderMediaDelete = vi.fn()
const clientFolderCount = vi.fn()
const clientFindUnique = vi.fn()
const clientFindMany = vi.fn()
const clientCreate = vi.fn()
const clientUpdate = vi.fn()
const clientUpdateMany = vi.fn()
const transaction = vi.fn()
const leadFindFirst = vi.fn()
const auditLog = vi.fn()
const readPrivateUploadFile = vi.fn()
const uploadPrivateFile = vi.fn()
const deletePrivateFile = vi.fn()
const authUser: { sub: string; role: 'ADMIN' | 'MANAGER'; permissions: string[] } = {
  sub: 'user_1',
  role: 'ADMIN',
  permissions: [],
}

vi.mock('../lib/prisma', () => ({
  prisma: {
    clientFolder: {
      findMany: clientFolderFindMany,
      findUnique: clientFolderFindUnique,
      create: clientFolderCreate,
      update: clientFolderUpdate,
      delete: clientFolderDelete,
      count: clientFolderCount,
    },
    clientFolderMedia: {
      findFirst: clientFolderMediaFindFirst,
      create: clientFolderMediaCreate,
      delete: clientFolderMediaDelete,
    },
    client: {
      findUnique: clientFindUnique,
      findMany: clientFindMany,
      create: clientCreate,
      update: clientUpdate,
      updateMany: clientUpdateMany,
    },
    lead: { findFirst: leadFindFirst },
    $transaction: transaction,
  },
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request & { user?: typeof authUser }, _res: express.Response, next: express.NextFunction) => {
    req.user = authUser
    next()
  },
  authorizePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../infrastructure/security/AuditLogger', () => ({ AuditLogger: { log: auditLog } }))
vi.mock('../infrastructure/storage', () => ({ readPrivateUploadFile, uploadPrivateFile, deletePrivateFile }))
vi.mock('../lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

let clientFoldersRouter: typeof import('./clientFolders').clientFoldersRouter

const baseFolder = {
  id: 'folder_1',
  clientId: 'client_1',
  name: 'Pasta inicial',
  occurredAt: new Date('2026-09-18T12:00:00.000Z'),
  position: 0,
  leadId: 'lead_1',
  clientName: 'Ana',
  clientEmail: 'ana@example.com',
  clientPhone: null,
  serviceLabel: 'Consultoria',
  notes: 'Acompanhar evolução',
  publicTitle: 'Caso Ana',
  publicDescription: 'Descrição pública',
  isPublished: false,
  publicConsentAt: null,
  createdBy: 'user_1',
  createdAt: new Date('2026-09-18T12:00:00.000Z'),
  updatedAt: new Date('2026-09-18T12:00:00.000Z'),
  lead: { id: 'lead_1', name: 'Ana', email: 'ana@example.com', phone: null },
  client: { id: 'client_1', leadId: 'lead_1', name: 'Ana', email: 'ana@example.com', phone: null, notes: null },
  media: [],
}

beforeAll(async () => {
  const module = await import('./clientFolders')
  clientFoldersRouter = module.clientFoldersRouter
})

beforeEach(() => {
  vi.clearAllMocks()
  authUser.role = 'ADMIN'
  authUser.permissions = []
  clientFolderFindMany.mockResolvedValue([])
  clientFolderFindUnique.mockResolvedValue(baseFolder)
  clientFolderCreate.mockResolvedValue(baseFolder)
  clientFolderUpdate.mockResolvedValue({ ...baseFolder, isPublished: true })
  clientFolderDelete.mockResolvedValue({ id: 'folder_1' })
  clientFolderMediaFindFirst.mockResolvedValue(null)
  clientFolderMediaCreate.mockResolvedValue({
    id: 'media_1',
    folderId: 'folder_1',
    stage: 'before',
    capturedAt: new Date('2026-09-18T12:00:00.000Z'),
    note: null,
    originalFilename: 'before.jpg',
    originalStorageKey: 'private-original.jpg',
    optimizedStorageKey: 'private.webp',
    width: 800,
    height: 600,
  })
  clientFolderMediaDelete.mockResolvedValue({ id: 'media_1' })
  clientFolderCount.mockResolvedValue(0)
  clientFindUnique.mockResolvedValue({ id: 'client_1', leadId: 'lead_1', name: 'Ana', email: 'ana@example.com', phone: null, notes: null, createdBy: 'user_1', createdAt: baseFolder.createdAt, updatedAt: baseFolder.updatedAt, lead: baseFolder.lead, _count: { folders: 1 } })
  clientFindMany.mockResolvedValue([])
  clientCreate.mockResolvedValue({ id: 'client_1', leadId: 'lead_1', name: 'Ana', email: 'ana@example.com', phone: null, notes: 'Acompanhar evolução', createdBy: 'user_1', createdAt: baseFolder.createdAt, updatedAt: baseFolder.updatedAt, lead: baseFolder.lead, _count: { folders: 0 } })
  clientUpdate.mockResolvedValue({ id: 'client_1', leadId: 'lead_1', name: 'Ana', email: 'ana@example.com', phone: null, notes: null, createdBy: 'user_1', createdAt: baseFolder.createdAt, updatedAt: baseFolder.updatedAt, lead: baseFolder.lead, folders: [] })
  clientUpdateMany.mockResolvedValue({ count: 0 })
  transaction.mockResolvedValue([])
  leadFindFirst.mockResolvedValue({ id: 'lead_1', name: 'Ana', email: 'ana@example.com', phone: null })
  auditLog.mockResolvedValue(undefined)
  readPrivateUploadFile.mockResolvedValue(Buffer.from('image'))
  uploadPrivateFile.mockResolvedValue(undefined)
  deletePrivateFile.mockResolvedValue(undefined)
})

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/', clientFoldersRouter)
  app.use(errorHandler)
  return app
}

describe('public client folders', () => {
  it('returns only safe published fields and optimized media URLs', async () => {
    clientFolderFindMany.mockResolvedValueOnce([{
      ...baseFolder,
      isPublished: true,
      media: [{
        id: 'media_1',
        stage: 'after',
        capturedAt: new Date('2026-09-18T12:00:00.000Z'),
        note: 'Resultado final',
        optimizedStorageKey: 'private.webp',
        originalStorageKey: 'secret-original.jpg',
        width: 800,
        height: 600,
      }],
    }])

    const response = await request(makeApp()).get('/public')

    expect(response.status).toBe(200)
    expect(response.body.data[0]).toEqual(expect.objectContaining({ id: 'folder_1', title: 'Caso Ana' }))
    expect(response.body.data[0]).not.toHaveProperty('clientName')
    expect(response.body.data[0].media[0].url).toContain('/public/folder_1/media/media_1')
    expect(response.body.data[0].media[0]).not.toHaveProperty('originalStorageKey')
  })

  it('does not serve media when the folder is not published or does not match', async () => {
    const response = await request(makeApp()).get('/public/folder_1/media/media_1')

    expect(response.status).toBe(404)
    expect(readPrivateUploadFile).not.toHaveBeenCalled()
  })

  it('does not serve media when publication consent is missing', async () => {
    clientFolderMediaFindFirst.mockImplementationOnce(async ({ where }: { where: { folder: { publicConsentAt: { not: null } } } }) => {
      expect(where.folder.publicConsentAt).toEqual({ not: null })
      return null
    })

    const response = await request(makeApp()).get('/public/folder_1/media/media_1')

    expect(response.status).toBe(404)
    expect(readPrivateUploadFile).not.toHaveBeenCalled()
  })
})

describe('client folder management', () => {
  it('creates a client without forcing an initial folder', async () => {
    const response = await request(makeApp())
      .post('/clients')
      .send({ name: 'Ana Cliente', email: 'ana@example.com' })

    expect(response.status).toBe(201)
    expect(clientCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'Ana Cliente', email: 'ana@example.com' }),
    }))
  })

  it('persists a drag-and-drop folder order only for the selected client', async () => {
    clientFolderFindMany.mockResolvedValueOnce([{ id: 'folder_1' }])

    const response = await request(makeApp())
      .patch('/clients/client_1/folders/reorder')
      .send({ folderIds: ['folder_1'] })

    expect(response.status).toBe(200)
    expect(transaction).toHaveBeenCalledOnce()
  })

  it('creates a folder from an existing lead without requiring duplicated contact fields', async () => {
    const response = await request(makeApp())
      .post('/')
      .send({ leadId: 'lead_1', serviceLabel: 'Consultoria' })

    expect(response.status).toBe(201)
    expect(clientFolderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        leadId: 'lead_1',
        clientName: 'Ana',
        clientEmail: 'ana@example.com',
      }),
    }))
  })

  it('updates only the publication metadata through the authenticated route', async () => {
    clientFolderFindUnique.mockResolvedValueOnce({
      ...baseFolder,
      media: [{
        id: 'media_1',
        folderId: 'folder_1',
        stage: 'before',
        capturedAt: new Date('2026-09-18T12:00:00.000Z'),
        note: null,
        originalFilename: 'before.jpg',
        originalStorageKey: 'private-original.jpg',
        optimizedStorageKey: 'private.webp',
        width: 800,
        height: 600,
        createdAt: new Date('2026-09-18T12:00:00.000Z'),
      }],
    })
    const response = await request(makeApp())
      .patch('/folder_1')
      .send({ isPublished: true, publicConsent: true, publicTitle: 'Caso publicado' })

    expect(response.status).toBe(200)
    expect(clientFolderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'folder_1' },
      data: expect.objectContaining({ isPublished: true, publicTitle: 'Caso publicado' }),
    }))
  })

  it('deletes a folder and its private media without deleting the client', async () => {
    clientFolderFindUnique.mockResolvedValueOnce({
      ...baseFolder,
      media: [{
        id: 'media_1',
        folderId: 'folder_1',
        stage: 'before',
        capturedAt: new Date('2026-09-18T12:00:00.000Z'),
        note: null,
        originalFilename: 'before.jpg',
        originalStorageKey: 'original.jpg',
        optimizedStorageKey: 'optimized.webp',
        width: 800,
        height: 600,
        createdAt: new Date('2026-09-18T12:00:00.000Z'),
      }],
    })

    const response = await request(makeApp()).delete('/folder_1')

    expect(response.status).toBe(200)
    expect(clientFolderDelete).toHaveBeenCalledWith({ where: { id: 'folder_1' } })
    expect(deletePrivateFile).toHaveBeenCalledWith('original.jpg')
    expect(deletePrivateFile).toHaveBeenCalledWith('optimized.webp')
    expect(clientUpdate).not.toHaveBeenCalled()
  })

  it('does not let a leads-only collaborator publish a folder', async () => {
    authUser.role = 'MANAGER'
    authUser.permissions = ['leads.update']

    const response = await request(makeApp())
      .patch('/folder_1')
      .send({ isPublished: true, publicConsent: true })

    expect(response.status).toBe(403)
    expect(clientFolderUpdate).not.toHaveBeenCalled()
  })

  it('does not let a leads-only collaborator grant publication consent', async () => {
    authUser.role = 'MANAGER'
    authUser.permissions = ['leads.update']

    const response = await request(makeApp())
      .patch('/folder_1')
      .send({ publicConsent: true })

    expect(response.status).toBe(403)
    expect(clientFolderUpdate).not.toHaveBeenCalled()
  })

  it('rejects a non-image upload before writing storage', async () => {
    const response = await request(makeApp())
      .post('/folder_1/media')
      .field('stage', 'before')
      .field('capturedAt', '2026-09-18')
      .attach('file', Buffer.from('not an image'), 'file.txt')

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(uploadPrivateFile).not.toHaveBeenCalled()
  })
})
