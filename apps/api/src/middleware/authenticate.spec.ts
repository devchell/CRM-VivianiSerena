import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import type { AuthTokenPayload } from '@viviani/types'

type AuthModule = typeof import('./authenticate')

let authorize: AuthModule['authorize']
let authorizeModule: AuthModule['authorizeModule']
let authorizePermission: AuthModule['authorizePermission']

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@db.example.com:5432/app?schema=public'
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://redis.example.com:6379'
  process.env.API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.example.com'
  process.env.CRM_URL = process.env.CRM_URL ?? 'https://crm.example.com'
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'https://crm.example.com'
  process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY ?? '-----BEGIN RSA PRIVATE KEY-----\nplaceholder\n-----END RSA PRIVATE KEY-----'
  process.env.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY ?? '-----BEGIN PUBLIC KEY-----\nplaceholder\n-----END PUBLIC KEY-----'
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'test-secret'
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? '12345678901234567890123456789012'
  process.env.ANONYMIZATION_SALT = process.env.ANONYMIZATION_SALT ?? 'test-anon-salt'

  const module = await import('./authenticate')
  authorize = module.authorize
  authorizeModule = module.authorizeModule
  authorizePermission = module.authorizePermission
})

function createNext() {
  return vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>
}

function createRequest(user?: AuthTokenPayload): Request {
  return { user } as Request
}

function createResponse(): Response {
  return {} as Response
}

describe('authorize', () => {
  it('blocks non-admin access to admin-only routes', () => {
    const next = createNext()
    const middleware = authorize('ADMIN')

    middleware(createRequest({
      sub: 'manager',
      email: 'manager@example.com',
      role: 'MANAGER',
      iat: 0,
      exp: 0,
    }), createResponse(), next)

    expect(next).toHaveBeenCalledTimes(1)
    const [error] = next.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('Insufficient permissions')
  })
})

describe('authorizeModule', () => {
  it('allows legacy module grants for backward compatibility', () => {
    const next = createNext()
    const middleware = authorizeModule('financeiro')

    middleware(createRequest({
      sub: 'viewer',
      email: 'viewer@example.com',
      role: 'VIEWER',
      allowedModules: ['financeiro'],
      iat: 0,
      exp: 0,
    }), createResponse(), next)

    expect(next).toHaveBeenCalledWith()
  })

  it('blocks users without module access', () => {
    const next = createNext()
    const middleware = authorizeModule('seguranca')

    middleware(createRequest({
      sub: 'viewer',
      email: 'viewer@example.com',
      role: 'VIEWER',
      permissions: ['dashboard.view'],
      allowedModules: ['dashboard'],
      iat: 0,
      exp: 0,
    }), createResponse(), next)

    expect(next).toHaveBeenCalledTimes(1)
    const [error] = next.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('Module access denied')
  })
})

describe('authorizePermission', () => {
  it('allows explicit permission grants', () => {
    const next = createNext()
    const middleware = authorizePermission('financeiro.update')

    middleware(createRequest({
      sub: 'operator',
      email: 'operator@example.com',
      role: 'VIEWER',
      profile: 'OPERATOR',
      permissions: ['financeiro.view', 'financeiro.update'],
      allowedModules: ['financeiro'],
      iat: 0,
      exp: 0,
    }), createResponse(), next)

    expect(next).toHaveBeenCalledWith()
  })

  it('blocks readonly users from write actions', () => {
    const next = createNext()
    const middleware = authorizePermission('financeiro.update')

    middleware(createRequest({
      sub: 'readonly',
      email: 'readonly@example.com',
      role: 'VIEWER',
      profile: 'READONLY',
      permissions: ['financeiro.view'],
      allowedModules: ['financeiro'],
      iat: 0,
      exp: 0,
    }), createResponse(), next)

    expect(next).toHaveBeenCalledTimes(1)
    const [error] = next.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('Permission denied')
  })
})
