import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
const redisMocks = vi.hoisted(() => ({
  exists: vi.fn().mockResolvedValue(0),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(true),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
}))

vi.mock('../lib/redis', () => ({ redis: redisMocks }))

vi.mock('../lib/prisma', () => ({
  prisma: {
    securityEvent: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

vi.mock('../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { bruteForceCheck, sqlInjectionDetection } from './security'

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    body: {},
    params: {},
    path: '/api/v1/content',
    method: 'POST',
    ip: '127.0.0.1',
    ...overrides,
  } as Request
}

function createResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }

  return res as unknown as Response
}

describe('sqlInjectionDetection', () => {
  it('allows legitimate rich text and punctuation', () => {
    const req = createRequest({
      body: {
        title: 'Como selecionar melhor seus procedimentos;',
        content: 'Texto com SELECT como palavra, ponto e virgula; e comentarios comuns.',
      },
    })
    const res = createResponse()
    const next = vi.fn()

    sqlInjectionDetection(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('blocks high-confidence SQL injection payloads', () => {
    const req = createRequest({
      query: {
        search: "' OR 1=1 -- SELECT",
      },
    })
    const res = createResponse()
    const next = vi.fn()

    sqlInjectionDetection(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('blocks destructive statements chained with semicolon', () => {
    const req = createRequest({
      body: {
        filters: {
          term: "abc'; DROP TABLE users",
        },
      },
    })
    const res = createResponse()
    const next = vi.fn()

    sqlInjectionDetection(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('bruteForceCheck', () => {
  it('allows a request when the IP is not locked', async () => {
    redisMocks.exists.mockResolvedValueOnce(0)
    const res = createResponse()
    const next = vi.fn()

    await bruteForceCheck(createRequest(), res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('blocks a request while the Redis lock is active', async () => {
    redisMocks.exists.mockResolvedValueOnce(1)
    const res = createResponse()
    const next = vi.fn()

    await bruteForceCheck(createRequest(), res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(429)
  })
})
