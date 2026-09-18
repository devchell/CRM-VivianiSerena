import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const {
  contentFindMany,
  contentFindUnique,
  autoTemplateFindMany,
  autoTemplateUpsert,
  loggerError,
} = vi.hoisted(() => ({
  contentFindMany: vi.fn(),
  contentFindUnique: vi.fn(),
  autoTemplateFindMany: vi.fn(),
  autoTemplateUpsert: vi.fn(),
  loggerError: vi.fn(),
}))

let authenticated = false

vi.mock('../lib/prisma', () => ({
  prisma: {
    content: {
      findMany: contentFindMany,
      findUnique: contentFindUnique,
    },
    autoTemplate: {
      findMany: autoTemplateFindMany,
      upsert: autoTemplateUpsert,
    },
  },
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (authenticated) {
      req.user = {
        sub: 'admin_1',
        email: 'admin@example.com',
        role: 'ADMIN',
        iat: 0,
        exp: 0,
      }
    }
    next()
  },
  authorizePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../lib/env', () => ({
  apiEnv: {
    landingRevalidateUrl: undefined,
    revalidateSecret: undefined,
  },
}))

vi.mock('../lib/logger', () => ({
  logger: {
    error: loggerError,
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('../infrastructure/storage', () => ({
  buildUploadUrl: vi.fn(),
  deleteFile: vi.fn(),
  ensureUploadStorageReady: vi.fn(),
  uploadFile: vi.fn(),
}))

vi.mock('../infrastructure/googleBusiness', () => ({
  fetchGoogleBusinessReviews: vi.fn(),
}))

vi.mock('../domain/metrics/service', () => ({
  buildCommercialLeadWhere: vi.fn(() => ({})),
}))

let contentRouter: typeof import('./content').contentRouter

beforeAll(async () => {
  const module = await import('./content')
  contentRouter = module.contentRouter
})

beforeEach(() => {
  vi.clearAllMocks()
  authenticated = false
  contentFindMany.mockResolvedValue([])
  contentFindUnique.mockResolvedValue(null)
  autoTemplateFindMany.mockResolvedValue([])
  autoTemplateUpsert.mockResolvedValue({
    templateId: 'auth_2fa',
    emailHtml: '<p>Olá</p>',
    whatsappText: null,
  })
})

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', contentRouter)
  app.use(errorHandler)
  return app
}

describe('GET / content', () => {
  it('sanitizes the public about bio before returning it', async () => {
    contentFindMany.mockResolvedValueOnce([
      {
        section: 'about',
        key: 'bio',
        value: '<p>Atendimento <strong>humano</strong></p><script>alert(1)</script><a href="javascript:alert(2)">link</a>',
      },
    ])

    const response = await request(createApp()).get('/')

    expect(response.status).toBe(200)
    expect(response.body.data.about.bio).toContain('<p>Atendimento <strong>humano</strong></p>')
    expect(response.body.data.about.bio).not.toContain('<script>')
    expect(response.body.data.about.bio).not.toContain('javascript:')
  })
})

describe('GET /:section/:key', () => {
  it('sanitizes the public about bio on the direct lookup route too', async () => {
    contentFindUnique.mockResolvedValueOnce({
      section: 'about',
      key: 'bio',
      value: '<p>Seguro</p><img src="https://attacker.invalid/x" onerror="alert(1)">',
    })

    const response = await request(createApp()).get('/about/bio')

    expect(response.status).toBe(200)
    expect(response.body.data).toBe('<p>Seguro</p>')
  })
})

describe('auto-templates', () => {
  it('returns a service error when template listing fails instead of an empty success', async () => {
    authenticated = true
    autoTemplateFindMany.mockRejectedValueOnce(new Error('database unavailable'))

    const response = await request(createApp()).get('/auto-templates')

    expect(response.status).toBe(500)
    expect(response.body).toMatchObject({
      success: false,
      error: 'database unavailable',
    })
    expect(loggerError).toHaveBeenCalledWith('Auto-template listing failed', {
      error: 'database unavailable',
    })
  })

  it('rejects unknown template ids before touching the database', async () => {
    authenticated = true

    const response = await request(createApp())
      .put('/auto-templates/unknown')
      .send({ emailHtml: '<p>Mensagem</p>' })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('templateId inválido')
    expect(autoTemplateUpsert).not.toHaveBeenCalled()
  })

  it('sanitizes HTML before persisting an automatic e-mail template', async () => {
    authenticated = true

    const response = await request(createApp())
      .put('/auto-templates/auth_2fa')
      .send({
        emailHtml: '<p>Olá</p><script>alert(1)</script><a href="javascript:alert(2)">link</a>',
        whatsappText: 'Código de acesso',
      })

    expect(response.status).toBe(200)
    expect(autoTemplateUpsert).toHaveBeenCalledWith({
      where: { templateId: 'auth_2fa' },
      update: {
        emailHtml: '<p>Olá</p><a>link</a>',
        whatsappText: 'Código de acesso',
      },
      create: {
        templateId: 'auth_2fa',
        emailHtml: '<p>Olá</p><a>link</a>',
        whatsappText: 'Código de acesso',
      },
    })
  })
})
