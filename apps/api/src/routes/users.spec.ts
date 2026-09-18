import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const {
  bcryptHash,
  userFindUnique,
  userCreate,
  userUpdate,
  auditLogCreate,
  notificationReadDeleteMany,
  transaction,
  sendCollaboratorInvite,
} = vi.hoisted(() => ({
  bcryptHash: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
  notificationReadDeleteMany: vi.fn(),
  transaction: vi.fn(),
  sendCollaboratorInvite: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: bcryptHash,
  },
}))

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      create: userCreate,
      update: userUpdate,
    },
    auditLog: {
      create: auditLogCreate,
    },
    notificationRead: {
      deleteMany: notificationReadDeleteMany,
    },
    $transaction: transaction,
  },
}))

vi.mock('../infrastructure/email', () => ({
  emailService: {
    sendCollaboratorInvite,
  },
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request & { user?: { sub: string } }, _res: express.Response, next: express.NextFunction) => {
    req.user = { sub: 'admin_1' }
    next()
  },
  authorizePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../middleware/rateLimiter', () => ({
  emailRateLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../lib/env', () => ({
  apiEnv: {
    crmUrl: 'https://crm.example.com',
  },
}))

let usersRouter: typeof import('./users').usersRouter

beforeAll(async () => {
  const module = await import('./users')
  usersRouter = module.usersRouter
})

beforeEach(() => {
  vi.clearAllMocks()
  bcryptHash.mockResolvedValue('temporary-password-hash')
  userFindUnique.mockResolvedValue(null)
  userCreate.mockResolvedValue({
    id: 'user_2',
    name: 'Colaborador QA',
    email: 'qa@example.com',
    phone: null,
    role: 'MANAGER',
    allowedModules: ['leads'],
    mustChangePassword: true,
    lastLogin: null,
  })
  userUpdate.mockResolvedValue({
    id: 'user_2',
    name: 'Colaborador QA',
    email: 'qa@example.com',
    phone: null,
    role: 'MANAGER',
    allowedModules: ['leads'],
    mustChangePassword: true,
    lastLogin: null,
  })
  auditLogCreate.mockResolvedValue({ id: 'audit_1' })
  notificationReadDeleteMany.mockResolvedValue({ count: 0 })
  transaction.mockImplementation(async (operations: unknown[]) => operations)
  sendCollaboratorInvite.mockResolvedValue(false)
})

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', usersRouter)
  app.use(errorHandler)
  return app
}

describe('POST /users', () => {
  it('creates the account but never returns the temporary password', async () => {
    const response = await request(createApp())
      .post('/')
      .send({
        name: 'Colaborador QA',
        email: 'qa@example.com',
        profile: 'COLLABORATOR',
        allowedModules: ['leads'],
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: 'user_2',
        mustChangePassword: true,
        profile: 'COLLABORATOR',
      },
      meta: {
        inviteEmailSent: false,
        manualDeliveryRequired: true,
      },
    })
    expect(response.body).not.toHaveProperty('data.tempPassword')
    expect(response.body).not.toHaveProperty('meta.tempPassword')
    expect(sendCollaboratorInvite).toHaveBeenCalledWith(expect.objectContaining({
      to: 'qa@example.com',
      tempPassword: expect.any(String),
    }))
  })
})

describe('POST /users/:id/reset-temp-password', () => {
  it('rotates the password without exposing it in the response', async () => {
    userFindUnique.mockResolvedValueOnce({
      id: 'user_2',
      name: 'Colaborador QA',
      email: 'qa@example.com',
      phone: null,
      role: 'MANAGER',
      allowedModules: ['leads'],
      mustChangePassword: false,
      lastLogin: null,
    })

    const response = await request(createApp())
      .post('/user_2/reset-temp-password')
      .send({ sendEmail: true })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
      data: { id: 'user_2', mustChangePassword: true },
      meta: { inviteEmailSent: false },
    })
    expect(response.body).not.toHaveProperty('data.tempPassword')
    expect(response.body).not.toHaveProperty('meta.tempPassword')
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user_2' },
      data: expect.objectContaining({
        passwordHash: 'temporary-password-hash',
        mustChangePassword: true,
      }),
    }))
  })
})

describe('DELETE /users/:id', () => {
  it('prevents an administrator from deleting their own account', async () => {
    const response = await request(createApp()).delete('/admin_1')

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('proprio usuario')
    expect(userFindUnique).not.toHaveBeenCalled()
    expect(notificationReadDeleteMany).not.toHaveBeenCalled()
  })
})
