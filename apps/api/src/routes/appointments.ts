import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, authorizeModule } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { googleCalendar } from '../infrastructure/googleCalendar'
import { emailService } from '../infrastructure/email'
import { invalidateOperationalMetricCaches } from '../domain/metrics/cache'

export const appointmentsRouter: Router = Router()
appointmentsRouter.use(authenticate)
appointmentsRouter.use(authorizeModule('agenda'))

const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60

const schema = z.object({
  leadId: z.string(),
  date: z.string().datetime(),
  serviceType: z.enum(['coaching_individual', 'coaching_group', 'workshop', 'mentoring', 'consultation']),
  notes: z.string().optional(),
})

appointmentsRouter.get('/', async (req, res, next) => {
  try {
    const { from, to, status } = req.query
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(String(from))
      if (to) (where.date as Record<string, unknown>).lte = new Date(String(to))
    }
    const appointments = await prisma.appointment.findMany({
      where,
      include: { lead: { select: { name: true, email: true, phone: true } } },
      orderBy: { date: 'asc' },
    })
    res.json({
      success: true,
      data: appointments.map((appointment) => ({
        id: appointment.id,
        leadId: appointment.leadId,
        leadName: appointment.lead.name,
        leadEmail: appointment.lead.email,
        leadPhone: appointment.lead.phone,
        startTime: appointment.date.toISOString(),
        endTime: new Date(
          appointment.date.getTime() + DEFAULT_APPOINTMENT_DURATION_MINUTES * 60 * 1000
        ).toISOString(),
        serviceType: appointment.serviceType,
        status: appointment.status,
        notes: appointment.notes,
      })),
    })
  } catch (error) { next(error) }
})

appointmentsRouter.get('/availability', async (_req, res, next) => {
  try {
    const slots = await googleCalendar.getAvailableSlots(30)
    res.json({ success: true, data: slots })
  } catch (error) { next(error) }
})

appointmentsRouter.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId }, select: { name: true, email: true } })
    if (!lead) throw new AppError(404, 'Lead not found')

    const startDate = new Date(data.date)
    const endDate = new Date(
      startDate.getTime() + DEFAULT_APPOINTMENT_DURATION_MINUTES * 60 * 1000
    )

    const calEvent = await googleCalendar.createEvent({
      summary: data.serviceType.replace(/_/g, ' ') + ' - ' + lead.name,
      description: data.notes,
      start: startDate,
      end: endDate,
      attendeeEmail: lead.email,
    })

    const appointment = await prisma.appointment.create({
      data: { leadId: data.leadId, date: startDate, serviceType: data.serviceType, notes: data.notes, googleEventId: calEvent?.id ?? null },
    })

    emailService.appointmentConfirmation({ clientEmail: lead.email, clientName: lead.name, date: startDate, serviceType: data.serviceType }).catch(() => {})
    await invalidateOperationalMetricCaches()

    res.status(201).json({ success: true, data: appointment })
  } catch (error) { next(error) }
})

appointmentsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body)
    const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new AppError(404, 'Appointment not found')

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: data.date ? { ...data, date: new Date(data.date) } : data,
    })

    if (existing.googleEventId && data.date) {
      await googleCalendar.updateEvent(existing.googleEventId, { start: new Date(data.date), description: data.notes })
    }

    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: appointment })
  } catch (error) { next(error) }
})

appointmentsRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new AppError(404, 'Appointment not found')

    if (existing.googleEventId) {
      await googleCalendar.deleteEvent(existing.googleEventId)
    }

    await prisma.appointment.delete({ where: { id: req.params.id } })
    await invalidateOperationalMetricCaches()
    res.json({ success: true, message: 'Appointment deleted' })
  } catch (error) { next(error) }
})
