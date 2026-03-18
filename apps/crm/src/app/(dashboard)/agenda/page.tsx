'use client'

import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { AppointmentListItem, CreateAppointmentDto, Lead, ServiceType } from '@viviani/types'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/useAuth'
import { apiFetchJson, buildAuthHeaders } from '@/lib/api-client'

interface AppointmentsResponse {
  success: true
  data: AppointmentListItem[]
}

interface LeadsResponse {
  success: true
  data: Lead[]
}

const SERVICE_OPTIONS: Array<{ value: ServiceType; label: string }> = [
  { value: 'consultation', label: 'Consulta' },
  { value: 'coaching_individual', label: 'Sessao individual' },
  { value: 'coaching_group', label: 'Sessao em grupo' },
  { value: 'mentoring', label: 'Mentoria' },
  { value: 'workshop', label: 'Workshop' },
]

const DEFAULT_DURATION = 60
const FullCalendarView = FullCalendar as unknown as ComponentType<Record<string, unknown>>

function formatDateTimeLocal(value: string) {
  const date = new Date(value)
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function buildDefaultForm(): CreateAppointmentDto & { duration: number } {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(Math.max(9, now.getHours() + 1))

  return {
    leadId: '',
    date: formatDateTimeLocal(now.toISOString()),
    serviceType: 'consultation',
    notes: '',
    duration: DEFAULT_DURATION,
  }
}

export default function AgendaPage() {
  const { accessToken } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateAppointmentDto & { duration: number }>(buildDefaultForm())

  useEffect(() => {
    if (!accessToken) return

    let active = true
    setLoading(true)

    Promise.all([
      apiFetchJson<AppointmentsResponse>('/api/v1/appointments?limit=200', {
        headers: buildAuthHeaders(accessToken),
      }),
      apiFetchJson<LeadsResponse>('/api/v1/leads?limit=200', {
        headers: buildAuthHeaders(accessToken),
      }),
    ])
      .then(([appointmentsResponse, leadsResponse]) => {
        if (!active) return
        setAppointments(appointmentsResponse.data)
        setLeads(leadsResponse.data)
      })
      .catch((error) => {
        if (!active) return
        toast.error(error instanceof Error ? error.message : 'Nao foi possivel carregar a agenda.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken])

  const leadOptions = useMemo(() => {
    return leads.map((lead) => ({
      value: lead.id,
      label: `${lead.name} ${lead.email ? `- ${lead.email}` : ''}`,
    }))
  }, [leads])

  const events = useMemo(() => {
    return appointments.map((appointment) => ({
      id: appointment.id,
      title: appointment.leadName,
      start: appointment.startTime,
      end: appointment.endTime,
      color: appointment.status === 'cancelled' ? '#787878' : '#C9967A',
      extendedProps: appointment,
    }))
  }, [appointments])

  async function refreshAppointments() {
    if (!accessToken) return
    const response = await apiFetchJson<AppointmentsResponse>('/api/v1/appointments?limit=200', {
      headers: buildAuthHeaders(accessToken),
    })
    setAppointments(response.data)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return

    if (!form.leadId) {
      toast.error('Selecione um lead para criar o agendamento.')
      return
    }

    setSubmitting(true)
    try {
      await apiFetchJson('/api/v1/appointments', {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify({
          leadId: form.leadId,
          date: new Date(form.date).toISOString(),
          serviceType: form.serviceType,
          notes: form.notes?.trim() || undefined,
          duration: form.duration,
        }),
      })

      await refreshAppointments()
      setForm(buildDefaultForm())
      setShowModal(false)
      toast.success('Agendamento criado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar agendamento.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">Agenda</h1>
          <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-400">
            Agenda operacional baseada no modulo de leads e no contrato canonico de appointments.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-rose-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-gold-500"
        >
          <Plus size={16} />
          Novo agendamento
        </button>
      </div>

      <div className="card-dark p-4 shadow-sm">
        {loading ? (
          <div className="h-[640px] animate-pulse rounded-2xl bg-blush-100 dark:bg-charcoal-700/40" />
        ) : (
          <FullCalendarView
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale="pt-br"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{ today: 'Hoje', month: 'Mes', week: 'Semana', day: 'Dia' }}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            selectable
            height="auto"
            events={events}
            select={(info: { startStr: string }) => {
              setForm((current) => ({
                ...current,
                date: info.startStr.slice(0, 16),
              }))
              setShowModal(true)
            }}
            eventClick={(info: { event: { extendedProps: unknown } }) => {
              const appointment = info.event.extendedProps as AppointmentListItem
              toast.info(`${appointment.leadName} - ${appointment.serviceType} - ${appointment.status}`)
            }}
          />
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="card-dark w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between border-b border-blush-200 p-6 dark:border-charcoal-700">
              <h2 className="font-heading text-lg font-semibold text-charcoal dark:text-charcoal-50">Novo agendamento</h2>
              <button onClick={() => setShowModal(false)} className="text-charcoal-400 transition-colors hover:text-charcoal dark:hover:text-charcoal-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-400">Lead</label>
                <select
                  required
                  value={form.leadId}
                  onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))}
                  className="w-full rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-100"
                >
                  <option value="">Selecione um lead</option>
                  {leadOptions.map((lead) => (
                    <option key={lead.value} value={lead.value}>
                      {lead.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-400">Data e hora</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-400">Duracao</label>
                  <select
                    value={form.duration}
                    onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))}
                    className="w-full rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-100"
                  >
                    {[30, 60, 90, 120].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-400">Servico</label>
                <select
                  value={form.serviceType}
                  onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value as ServiceType }))}
                  className="w-full rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-100"
                >
                  {SERVICE_OPTIONS.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-400">Observacoes</label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-blush-300 px-4 py-2 text-sm text-charcoal-400 transition-colors hover:bg-blush dark:border-charcoal-600 dark:hover:bg-charcoal-700">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-rose-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-gold-500 disabled:opacity-60">
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
