'use client'

import type { ComponentType, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { AppointmentListItem, CreateAppointmentDto, Lead, ServiceType } from '@viviani/types'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Dot,
  Plus,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/useAuth'
import { apiFetchJson, buildApiUrl, buildAuthHeaders, invalidateApiCache } from '@/lib/api-client'
import {
  crmFieldSelect,
  crmFieldSelectIcon,
  crmFieldSelectWrapper,
} from '@/components/ui/listStyles'
import { EmptyState } from '@/components/ui/EmptyState'

interface AppointmentsResponse {
  success: true
  data: AppointmentListItem[]
}

interface LeadsResponse {
  success: true
  data: Lead[]
}

const DURATION_OPTIONS = [
  { value: 30,  label: '30 minutos' },
  { value: 45,  label: '45 minutos' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1h 30min' },
  { value: 120, label: '2 horas' },
]

const SERVICE_OPTIONS: Array<{
  value: ServiceType
  label: string
  shortLabel: string
  badgeClassName: string
  eventClassName: string
}> = [
  {
    value: 'consultation',
    label: 'Consulta',
    shortLabel: 'Consulta',
    badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-consultation',
  },
  {
    value: 'coaching_individual',
    label: 'Sessão individual',
    shortLabel: 'Individual',
    badgeClassName: 'bg-green-50 text-green-700 border-green-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-individual',
  },
  {
    value: 'coaching_group',
    label: 'Sessão em grupo',
    shortLabel: 'Grupo',
    badgeClassName: 'bg-purple-50 text-purple-700 border-purple-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-group',
  },
  {
    value: 'mentoring',
    label: 'Mentoria',
    shortLabel: 'Mentoria',
    badgeClassName: 'bg-orange-50 text-orange-700 border-orange-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-mentoring',
  },
  {
    value: 'workshop',
    label: 'Workshop',
    shortLabel: 'Workshop',
    badgeClassName: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-workshop',
  },
]

const STATUS_META = {
  scheduled: {
    label: 'Agendado',
    badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  confirmed: {
    label: 'Confirmado',
    badgeClassName: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  completed: {
    label: 'Concluído',
    badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClassName: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  no_show: {
    label: 'Não compareceu',
    badgeClassName: 'bg-orange-50 text-orange-700 border-orange-200',
  },
} as const

const FullCalendarView = FullCalendar as unknown as ComponentType<Record<string, unknown>>

interface CalendarSelectArg {
  startStr: string
}

interface CalendarEventClickArg {
  event: {
    extendedProps: Record<string, unknown>
  }
}

interface CalendarEventContentArg {
  event: {
    extendedProps: Record<string, unknown>
  }
  timeText: string
}

function formatDateTimeLocal(value: string) {
  const date = new Date(value)
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function buildDefaultForm(): CreateAppointmentDto {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(Math.max(9, now.getHours() + 1))

  return {
    leadId: '',
    date: formatDateTimeLocal(now.toISOString()),
    serviceType: 'consultation',
    notes: '',
  }
}

export default function AgendaPage() {
  const { accessToken, hasPermission, updateSession } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateAppointmentDto>(buildDefaultForm())
  const [duration, setDuration] = useState(60)

  const canViewLeads = hasPermission('leads.view')
  const canCreateAppointments = hasPermission('agenda.create') && canViewLeads

  useEffect(() => {
    if (!accessToken) return

    let active = true
    setLoading(true)

    const requests: [Promise<AppointmentsResponse>, Promise<LeadsResponse | { success: true; data: Lead[] }>] = [
      apiFetchJson<AppointmentsResponse>('/api/v1/appointments?limit=200', {
        headers: buildAuthHeaders(accessToken),
      }),
      canViewLeads
        ? apiFetchJson<LeadsResponse>('/api/v1/leads?limit=200', {
            headers: buildAuthHeaders(accessToken),
          })
        : Promise.resolve({ success: true as const, data: [] }),
    ]

    Promise.all(requests)
      .then(([appointmentsResponse, leadsResponse]) => {
        if (!active) return
        setAppointments(appointmentsResponse.data)
        setLeads(leadsResponse.data)
      })
      .catch((error) => {
        if (!active) return
        toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a agenda.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, canViewLeads])

  const leadOptions = useMemo(() => {
    return leads.map((lead) => ({
      value: lead.id,
      label: `${lead.name} ${lead.email ? `- ${lead.email}` : ''}`,
    }))
  }, [leads])

  const summary = useMemo(() => {
    const now = new Date()
    const upcoming = appointments.filter((appointment) => {
      return appointment.status !== 'cancelled' && new Date(appointment.startTime) >= now
    }).length

    return {
      total: appointments.length,
      upcoming,
      leadsReady: leads.length,
    }
  }, [appointments, leads])

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.status !== 'cancelled' && new Date(appointment.startTime) >= new Date())
      .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
      .slice(0, 5)
  }, [appointments])

  const totalDuration = useMemo(() => {
    return appointments.reduce((acc, appointment) => {
      const start = new Date(appointment.startTime).getTime()
      const end = new Date(appointment.endTime).getTime()
      return acc + Math.max(0, Math.round((end - start) / 60000))
    }, 0)
  }, [appointments])

  const events = useMemo(() => {
    return appointments.map((appointment) => {
      const service = SERVICE_OPTIONS.find((option) => option.value === appointment.serviceType)
      return {
        id: appointment.id,
        title: appointment.leadName,
        start: appointment.startTime,
        end: appointment.endTime,
        classNames: [service?.eventClassName ?? 'crm-calendar-event'],
        extendedProps: {
          appointment,
          serviceLabel: service?.label ?? appointment.serviceType,
          serviceShortLabel: service?.shortLabel ?? appointment.serviceType,
          serviceBadgeClassName: service?.badgeClassName ?? 'bg-slate-100 text-slate-600 border-slate-200',
          statusMeta: STATUS_META[appointment.status],
        },
      }
    })
  }, [appointments])

  async function refreshAppointments() {
    if (!accessToken || !canCreateAppointments) return
    const response = await apiFetchJson<AppointmentsResponse>('/api/v1/appointments?limit=200', {
      headers: buildAuthHeaders(accessToken),
    })
    setAppointments(response.data)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return

    if (!form.leadId) {
      toast.error('Selecione um lead para criar o agendamento.')
      return
    }

    setSubmitting(true)
    try {
      const payload = JSON.stringify({
        leadId: form.leadId,
        date: new Date(form.date).toISOString(),
        serviceType: form.serviceType,
        durationMinutes: duration,
        notes: form.notes?.trim() || undefined,
      })

      const doPost = (token: string) => fetch(buildApiUrl('/api/v1/appointments'), {
        method: 'POST',
        headers: buildAuthHeaders(token, 'application/json'),
        body: payload,
      })

      let res = await doPost(accessToken)
      if (res.status === 401) {
        const refreshed = await updateSession()
        const nextToken = (refreshed as { accessToken?: string } | null)?.accessToken ?? ''
        if (nextToken) res = await doPost(nextToken)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      invalidateApiCache('/appointments')
      await refreshAppointments()
      setForm(buildDefaultForm())
      setDuration(60)
      setShowModal(false)
      toast.success('Agendamento criado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar agendamento.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSelect(info: CalendarSelectArg) {
    if (!canCreateAppointments) return
    setForm((current) => ({
      ...current,
      date: info.startStr.slice(0, 16),
    }))
    setShowModal(true)
  }

  function handleEventClick(info: CalendarEventClickArg) {
    const appointment = info.event.extendedProps.appointment as AppointmentListItem
    const service = SERVICE_OPTIONS.find((option) => option.value === appointment.serviceType)
    const status = STATUS_META[appointment.status]

    toast.info(`${appointment.leadName} · ${service?.label ?? appointment.serviceType} · ${status.label}`, {
      description: `${formatDateLabel(appointment.startTime)}${appointment.notes ? ` · ${appointment.notes}` : ''}`,
    })
  }

  function renderEventContent(info: CalendarEventContentArg): ReactNode {
    const appointment = info.event.extendedProps.appointment as AppointmentListItem
    const serviceShortLabel = info.event.extendedProps.serviceShortLabel as string
    const serviceBadgeClassName = info.event.extendedProps.serviceBadgeClassName as string
    const statusMeta = info.event.extendedProps.statusMeta as (typeof STATUS_META)[keyof typeof STATUS_META]

    return (
      <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="h-1.5 w-full bg-blue-400" />
        <div className="px-2.5 py-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${serviceBadgeClassName}`}>
                {serviceShortLabel}
              </span>
            </div>
            <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${statusMeta.badgeClassName}`}>
              {statusMeta.label}
            </span>
          </div>

          <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{appointment.leadName}</p>
          <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {info.timeText || formatDateLabel(appointment.startTime)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Agenda</h1>
          <span className="text-sm text-slate-400 dark:text-slate-500">{totalDuration} min</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!canCreateAppointments}
          className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Novo agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                label: 'Agendamentos totais',
                value: summary.total,
                icon: CalendarDays,
                tone: 'bg-blue-50 text-blue-700 ring-blue-100',
              },
              {
                label: 'Próximos atendimentos',
                value: summary.upcoming,
                icon: Clock3,
                tone: 'bg-sky-50 text-sky-700 ring-sky-100',
              },
              {
                label: 'Leads disponíveis',
                value: summary.leadsReady,
                icon: UserRound,
                tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="card-dark rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {item.value}
                      </p>
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${item.tone}`}>
                      <Icon size={16} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card-dark overflow-hidden rounded-lg p-3 shadow-sm">
            {loading ? (
              <div className="h-[680px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/40" />
            ) : (
              <div className="crm-calendar rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                <FullCalendarView
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  locale="pt-br"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                  }}
                  buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
                  slotMinTime="08:00:00"
                  slotMaxTime="20:00:00"
                  slotDuration="00:30:00"
                  allDaySlot={false}
                  selectable={canCreateAppointments}
                  nowIndicator
                  height={720}
                  dayMaxEventRows={3}
                  eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
                  slotLabelFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
                  events={events}
                  select={handleSelect}
                  eventClick={handleEventClick}
                  eventContent={renderEventContent}
                />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card-dark rounded-lg p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
                Legenda visual
              </h2>
            </div>

            <div className="space-y-3">
              {SERVICE_OPTIONS.map((service) => (
                <div key={service.value} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{service.label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Categoria do atendimento</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${service.badgeClassName}`}>
                    {service.shortLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-dark rounded-lg p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
                  Próximos atendimentos
                </h2>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Janela operacional mais imediata da agenda.
                </p>
              </div>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
                {upcomingAppointments.length}
              </span>
            </div>

            {upcomingAppointments.length === 0 ? (
              <EmptyState message="Nenhum atendimento futuro por enquanto." />
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => {
                  const service = SERVICE_OPTIONS.find((option) => option.value === appointment.serviceType)
                  const status = STATUS_META[appointment.status]

                  return (
                    <div
                      key={appointment.id}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {appointment.leadName}
                          </p>
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            {formatDateLabel(appointment.startTime)}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badgeClassName}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${service?.badgeClassName ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {service?.label ?? appointment.serviceType}
                        </span>
                        {appointment.notes ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <Dot size={14} className="-mx-1" />
                            {appointment.notes}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card-dark rounded-lg p-5 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
              Ritmo da agenda
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <p>Selecione direto no calendário para abrir um agendamento no horário exato.</p>
              <p>Clique em qualquer bloco para ler rapidamente cliente, serviço, status e observações.</p>
              <p>As cores foram separadas por tipo de atendimento para bater o olho e entender a semana.</p>
            </div>
          </div>
        </aside>
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-md"
          onClick={(event) => event.target === event.currentTarget && setShowModal(false)}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.30)] dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Agenda</p>
                  <h2 className="mt-1 font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Novo agendamento
                  </h2>
                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                    Preencha os detalhes do atendimento e mantenha o calendário consistente com o CRM.
                  </p>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Lead
                </label>
                <div className={crmFieldSelectWrapper}>
                  <select
                    required
                    value={form.leadId}
                    onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))}
                    className={crmFieldSelect}
                  >
                    <option value="">Selecione um lead</option>
                    {leadOptions.map((lead) => (
                      <option key={lead.value} value={lead.value}>
                        {lead.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className={crmFieldSelectIcon} />
                </div>
                {!canViewLeads ? (
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Este perfil precisa de acesso a leads para criar agendamentos.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    Data e hora
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    Duração
                  </label>
                  <div className={crmFieldSelectWrapper}>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className={crmFieldSelect}
                    >
                      {DURATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className={crmFieldSelectIcon} />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Serviço
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((service) => {
                    const active = form.serviceType === service.value
                    return (
                      <button
                        key={service.value}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, serviceType: service.value }))}
                        className={`rounded border px-3 py-3 text-left transition-all ${
                          active
                            ? 'border-blue-400 bg-blue-50/60 shadow-sm dark:border-blue-500 dark:bg-blue-950/30'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500/40 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${service.badgeClassName}`}>
                          {service.shortLabel}
                        </span>
                        <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{service.label}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Observações
                </label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  className="w-full resize-none rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Ex.: primeira avaliação, retorno, observações clínicas..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canCreateAppointments}
                  className="flex-1 rounded bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? 'Salvando...' : 'Salvar agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
