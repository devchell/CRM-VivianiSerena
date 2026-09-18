import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const appointmentFindFirst = vi.fn()
const appointmentFindMany = vi.fn()
const appointmentUpdate = vi.fn()
const googleDeleteEvent = vi.fn()
const invalidateOperationalMetricCaches = vi.fn()
const auditLog = vi.fn()
const { loggerError } = vi.hoisted(() => ({ loggerError: vi.fn() }))

vi.mock('../lib/prisma', () => ({
  prisma: {
    appointment: {
      findFirst: appointmentFindFirst,
      findMany: appointmentFindMany,
      update: appointmentUpdate,
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

vi.mock('../infrastructure/googleCalendar', () => ({
  googleCalendar: { deleteEvent: googleDeleteEvent },
}))

vi.mock('../infrastructure/email', () => ({
  emailService: {},
}))

vi.mock('../lib/logger', () => ({
  logger: { warn: vi.fn(), error: loggerError, info: vi.fn() },
}))

vi.mock('../domain/metrics/cache', () => ({ invalidateOperationalMetricCaches }))

vi.mock('../infrastructure/security/AuditLogger', () => ({
  AuditLogger: { log: auditLog },
}))

let appointmentsRouter: typeof import('./appointments').appointmentsRouter

beforeAll(async () => {
  const module = await import('./appointments')
  appointmentsRouter = module.appointmentsRouter
})

beforeEach(() => {
  vi.clearAllMocks()
  appointmentFindFirst.mockResolvedValue({
    id: 'appointment_1',
    googleEventId: 'google_event_1',
    status: 'confirmed',
  })
  appointmentFindMany.mockResolvedValue([])
  appointmentUpdate.mockResolvedValue({ id: 'appointment_1', status: 'cancelled' })
  googleDeleteEvent.mockResolvedValue(undefined)
  invalidateOperationalMetricCaches.mockResolvedValue(undefined)
  auditLog.mockResolvedValue(undefined)
})

describe('DELETE /appointments/:id', () => {
  it('cancels the appointment, removes the calendar event and preserves the row', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', appointmentsRouter)
    app.use(errorHandler)

    const response = await request(app).delete('/appointment_1')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ success: true, message: 'Appointment cancelled' })
    expect(googleDeleteEvent).toHaveBeenCalledWith('google_event_1')
    expect(appointmentUpdate).toHaveBeenCalledWith({
      where: { id: 'appointment_1' },
      data: { status: 'cancelled', googleEventId: null },
    })
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'CANCEL',
      resource: 'Appointment',
    }))
  })
})

describe('GET /appointments', () => {
  it('returns a service error when the database query fails', async () => {
    const databaseError = new Error('database unavailable')
    appointmentFindMany.mockRejectedValueOnce(databaseError)

    const app = express()
    app.use(express.json())
    app.use('/', appointmentsRouter)
    app.use(errorHandler)

    const response = await request(app).get('/')

    expect(response.status).toBe(503)
    expect(response.body).toMatchObject({
      success: false,
      error: 'Agenda indisponivel temporariamente. Revise as migracoes do banco.',
    })
    expect(loggerError).toHaveBeenCalledWith('Appointment listing database query failed', {
      error: 'database unavailable',
    })
  })
})
