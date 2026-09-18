import { EventEmitter } from 'node:events'
import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { realtimeMutation } from './realtime'

type TestResponse = EventEmitter & { statusCode: number }

function createResponse(statusCode: number): TestResponse {
  const response = new EventEmitter() as TestResponse
  response.statusCode = statusCode
  return response
}

function createRequest(method: string, path: string, emit: ReturnType<typeof vi.fn>): Request {
  const to = vi.fn(() => ({ emit }))
  const request = {
    method,
    path,
    app: { get: vi.fn(() => ({ to })) },
  }
  return request as unknown as Request
}

describe('realtimeMutation', () => {
  it('emite uma invalidação para uma mutação bem-sucedida', () => {
    const emit = vi.fn()
    const request = createRequest('PATCH', '/leads/lead-1', emit)
    const response = createResponse(200)
    const next = vi.fn()

    realtimeMutation(request, response as unknown as Response, next)
    response.emit('finish')

    expect(next).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledWith('data_changed', expect.objectContaining({
      resource: 'leads',
      method: 'PATCH',
    }))
  })

  it('não emite para leitura, falha HTTP ou autenticação', () => {
    for (const [method, path, statusCode] of [
      ['GET', '/leads', 200],
      ['DELETE', '/leads/lead-1', 400],
      ['POST', '/auth/change-password', 200],
    ] as const) {
      const emit = vi.fn()
      const request = createRequest(method, path, emit)
      const response = createResponse(statusCode)

      realtimeMutation(request, response as unknown as Response, vi.fn())
      response.emit('finish')

      expect(emit).not.toHaveBeenCalled()
    }
  })
})
