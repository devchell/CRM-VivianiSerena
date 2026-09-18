import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const financialFindFirst = vi.fn()
const financialCreate = vi.fn()
const financialUpdate = vi.fn()
const financialTransaction = vi.fn()
const deleteCache = vi.fn()
const invalidateOperationalMetricCaches = vi.fn()
const auditLog = vi.fn()

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: financialTransaction,
    financial: {
      create: financialCreate,
      findFirst: financialFindFirst,
      update: financialUpdate,
    },
  },
}))

vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: express.Request & { user?: { sub: string } }, _res: express.Response, next: express.NextFunction) => {
    req.user = { sub: 'user_1' }
    next()
  },
  authorizePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../lib/redis', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
  deleteCache,
  CACHE_TTL: { MEDIUM: 60, LONG: 300 },
}))

vi.mock('../domain/metrics/service', () => ({
  getFinancialCharts: vi.fn(),
  getFinancialSummary: vi.fn(),
}))

vi.mock('../domain/metrics/cache', () => ({ invalidateOperationalMetricCaches }))

vi.mock('../infrastructure/security/AuditLogger', () => ({
  AuditLogger: { log: auditLog },
}))

let financialsRouter: typeof import('./financials').financialsRouter

beforeAll(async () => {
  const module = await import('./financials')
  financialsRouter = module.financialsRouter
})

beforeEach(() => {
  vi.clearAllMocks()
  financialFindFirst.mockResolvedValue({
    id: 'financial_1',
    type: 'income',
    category: 'coaching_revenue',
    amount: 100,
    description: 'Sessão',
    date: new Date('2026-09-01T12:00:00.000Z'),
    recurring: false,
    tags: [],
    deletedAt: null,
  })
  financialCreate.mockResolvedValue({ id: 'financial_2', deletedAt: null })
  financialUpdate.mockResolvedValue({ id: 'financial_1', deletedAt: new Date() })
  financialTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    financial: {
      create: financialCreate,
      update: financialUpdate,
    },
  }))
  deleteCache.mockResolvedValue(undefined)
  invalidateOperationalMetricCaches.mockResolvedValue(undefined)
  auditLog.mockResolvedValue(undefined)
})

describe('DELETE /financials/:id', () => {
  it('archives the financial record and invalidates operational caches', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', financialsRouter)
    app.use(errorHandler)

    const response = await request(app).delete('/financial_1')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ success: true, message: 'Financial record archived' })
    expect(financialUpdate).toHaveBeenCalledWith({
      where: { id: 'financial_1' },
      data: { deletedAt: expect.any(Date) },
    })
    expect(deleteCache).toHaveBeenCalledWith('financial:summary')
    expect(deleteCache).toHaveBeenCalledWith('financial:charts')
  })
})

describe('PATCH /financials/:id', () => {
  it('creates a replacement and archives the original record', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', financialsRouter)
    app.use(errorHandler)

    const response = await request(app)
      .patch('/financial_1')
      .send({ amount: 125 })

    expect(response.status).toBe(200)
    expect(financialCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'income',
        category: 'coaching_revenue',
        amount: 125,
        description: 'Sessão',
      }),
    })
    expect(financialUpdate).toHaveBeenCalledWith({
      where: { id: 'financial_1' },
      data: { deletedAt: expect.any(Date) },
    })
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'Financial',
      details: expect.objectContaining({ mode: 'versioned_replacement' }),
    }))
  })
})
