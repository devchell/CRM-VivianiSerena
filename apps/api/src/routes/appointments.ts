import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { googleCalendar } from '../infrastructure/googleCalendar'
import { emailService } from '../infrastructure/email'
import { invalidateOperationalMetricCaches } from '../domain/metrics/cache'

export const appointmentsRouter: Router = Router()
appointmentsRouter.use(authenticate)

const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60

const schema = z.object({
  leadId: z.string(),
  date: z.string().datetime(),
  serviceType: z.enum(['coaching_individual', 'coaching_group', 'workshop', 'mentoring', 'consultation']),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  notes: z.string().optional(),
})

appointmentsRouter.get('/', authorizePermission('agenda.view'), async (req, res, next) => {
  try {
    const { from, to, status } = req.query
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(String(from))
      if (to) (where.date as Record<string, unknown>).lte = new Date(String(to))
    }

    let appointments: Awaited<ReturnType<typeof prisma.appointment.findMany<{
      include: { lead: { select: { name: true; email: true; phone: true } } }
    }>>> = []

    try {
      appointments = await prisma.appointment.findMany({
        where,
        include: { lead: { select: { name: true, email: true, phone: true } } },
        orderBy: { date: 'asc' },
      })
    } catch (dbError) {
      console.error('[appointments/list] DB query failed:', dbError)
      throw new AppError(503, 'Agenda indisponivel temporariamente. Revise as migracoes do banco.')
    }

    res.json({
      success: true,
      data: appointments.map((appointment) => {
        const duration = (appointment as typeof appointment & { durationMinutes?: number }).durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES
        return {
          id: appointment.id,
          leadId: appointment.leadId,
          leadName: appointment.lead.name,
          leadEmail: appointment.lead.email,
          leadPhone: appointment.lead.phone,
          startTime: appointment.date.toISOString(),
          endTime: new Date(appointment.date.getTime() + duration * 60 * 1000).toISOString(),
          durationMinutes: duration,
          serviceType: appointment.serviceType,
          status: appointment.status,
          notes: appointment.notes,
        }
      }),
    })
  } catch (error) { next(error) }
})

appointmentsRouter.get('/availability', authorizePermission('agenda.view'), async (_req, res, next) => {
  try {
    const slots = await googleCalendar.getAvailableSlots(30)
    res.json({ success: true, data: slots })
  } catch (error) { next(error) }
})

appointmentsRouter.post('/', authorizePermission('agenda.create'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body)
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId }, select: { name: true, email: true } })
    if (!lead) throw new AppError(404, 'Lead not found')

    const duration = data.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES
    const startDate = new Date(data.date)
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000)

    const calEvent = await googleCalendar.createEvent({
      summary: data.serviceType.replace(/_/g, ' ') + ' - ' + lead.name,
      description: data.notes,
      start: startDate,
      end: endDate,
      attendeeEmail: lead.email,
    })

    const appointment = await prisma.appointment.create({
      data: { leadId: data.leadId, date: startDate, durationMinutes: duration, serviceType: data.serviceType, notes: data.notes, googleEventId: calEvent?.id ?? null },
    })

    emailService.appointmentConfirmation({ clientEmail: lead.email, clientName: lead.name, date: startDate, serviceType: data.serviceType }).catch(() => {})
    await invalidateOperationalMetricCaches()

    res.status(201).json({ success: true, data: appointment })
  } catch (error) { next(error) }
})

appointmentsRouter.patch('/:id', authorizePermission('agenda.update'), async (req, res, next) => {
  try {
    const appointmentId = String(req.params.id)
    const data = schema.partial().parse(req.body)
    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { lead: { select: { name: true, email: true } } },
    })
    if (!existing) throw new AppError(404, 'Appointment not found')

    const updateData: Record<string, unknown> = { ...data }
    if (data.date) updateData.date = new Date(data.date)
    delete updateData.leadId

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
    })

    const newStart = data.date ? new Date(data.date) : existing.date
    const duration = data.durationMinutes ?? existing.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES
    const newEnd = new Date(newStart.getTime() + duration * 60 * 1000)
    const summary = (data.serviceType ?? existing.serviceType).replace(/_/g, ' ') + ' - ' + existing.lead.name

    if (existing.googleEventId) {
      await googleCalendar.updateEvent(existing.googleEventId, {
        summary,
        start: newStart,
        end: newEnd,
        description: data.notes ?? existing.notes ?? undefined,
      })
    } else {
      const calEvent = await googleCalendar.createEvent({
        summary,
        description: data.notes ?? existing.notes ?? undefined,
        start: newStart,
        end: newEnd,
        attendeeEmail: existing.lead.email,
      })
      if (calEvent?.id) {
        await prisma.appointment.update({ where: { id: appointmentId }, data: { googleEventId: calEvent.id } })
      }
    }

    await invalidateOperationalMetricCaches()
    res.json({ success: true, data: appointment })
  } catch (error) { next(error) }
})

appointmentsRouter.delete('/:id', authorizePermission('agenda.delete'), async (req, res, next) => {
  try {
    const appointmentId = String(req.params.id)
    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId } })
    if (!existing) throw new AppError(404, 'Appointment not found')

    if (existing.googleEventId) {
      await googleCalendar.deleteEvent(existing.googleEventId)
    }

    await prisma.appointment.delete({ where: { id: appointmentId } })
    await invalidateOperationalMetricCaches()
    res.json({ success: true, message: 'Appointment deleted' })
  } catch (error) { next(error) }
})
