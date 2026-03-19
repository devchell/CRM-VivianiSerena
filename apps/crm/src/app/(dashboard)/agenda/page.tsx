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
  Clock3,
  Dot,
  Plus,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
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
    badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-consultation',
  },
  {
    value: 'coaching_individual',
    label: 'Sessao individual',
    shortLabel: 'Individual',
    badgeClassName: 'bg-rose-50 text-rose-700 border-rose-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-individual',
  },
  {
    value: 'coaching_group',
    label: 'Sessao em grupo',
    shortLabel: 'Grupo',
    badgeClassName: 'bg-sky-50 text-sky-700 border-sky-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-group',
  },
  {
    value: 'mentoring',
    label: 'Mentoria',
    shortLabel: 'Mentoria',
    badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    eventClassName: 'crm-calendar-event crm-calendar-event-mentoring',
  },
  {
    value: 'workshop',
    label: 'Workshop',
    shortLabel: 'Workshop',
    badgeClassName: 'bg-violet-50 text-violet-700 border-violet-200',
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
    label: 'Concluido',
    badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClassName: 'bg-stone-100 text-stone-600 border-stone-200',
  },
  no_show: {
    label: 'Nao compareceu',
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
  const { accessToken } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateAppointmentDto>(buildDefaultForm())

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
          serviceBadgeClassName: service?.badgeClassName ?? 'bg-stone-100 text-stone-700 border-stone-200',
          statusMeta: STATUS_META[appointment.status],
        },
      }
    })
  }, [appointments])

  async function refreshAppointments() {
    if (!accessToken) return
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
      await apiFetchJson('/api/v1/appointments', {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify({
          leadId: form.leadId,
          date: new Date(form.date).toISOString(),
          serviceType: form.serviceType,
          notes: form.notes?.trim() || undefined,
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

  function handleSelect(info: CalendarSelectArg) {
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
      <div className="min-w-0 overflow-hidden rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(252,247,242,0.96)_100%)] shadow-[0_16px_28px_-24px_rgba(66,46,31,0.55)] backdrop-blur-sm">
        <div className="h-1.5 w-full bg-[linear-gradient(90deg,rgba(201,150,122,0.98),rgba(232,180,154,0.78))]" />
        <div className="px-2.5 py-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-gold" />
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${serviceBadgeClassName}`}>
                {serviceShortLabel}
              </span>
            </div>
            <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${statusMeta.badgeClassName}`}>
              {statusMeta.label}
            </span>
          </div>

          <p className="truncate text-xs font-semibold text-charcoal">{appointment.leadName}</p>
          <p className="mt-1 truncate text-[11px] text-charcoal-500">
            {info.timeText || formatDateLabel(appointment.startTime)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-blush-200 bg-[radial-gradient(circle_at_top_left,_rgba(201,150,122,0.16),_transparent_38%),linear-gradient(135deg,#fffdfb_0%,#fff7f1_52%,#fffdfb_100%)] px-6 py-6 shadow-[0_28px_80px_-42px_rgba(97,73,54,0.35)] dark:border-charcoal-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(201,150,122,0.18),_transparent_34%),linear-gradient(135deg,#171412_0%,#1e1a17_52%,#161311_100%)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-gold">Agenda viva</p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">
              Calendario elegante, leitura imediata e operacao suave.
            </h1>
            <p className="mt-3 text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">
              A agenda agora prioriza contexto visual, contraste suave e leitura rapida por tipo de atendimento, status e janela de horario.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur dark:border-charcoal-700 dark:bg-charcoal-800/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-400 dark:text-charcoal-500">Carga atual</p>
              <p className="mt-1 font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">{totalDuration} min</p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-gold px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-rose-gold-500 hover:shadow-md"
            >
              <Plus size={16} />
              Novo agendamento
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                label: 'Agendamentos totais',
                value: summary.total,
                icon: CalendarDays,
                tone: 'bg-rose-50 text-rose-700 ring-rose-100',
              },
              {
                label: 'Proximos atendimentos',
                value: summary.upcoming,
                icon: Clock3,
                tone: 'bg-sky-50 text-sky-700 ring-sky-100',
              },
              {
                label: 'Leads disponiveis',
                value: summary.leadsReady,
                icon: UserRound,
                tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="card-dark rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-charcoal-400">
                        {item.label}
                      </p>
                      <p className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">
                        {item.value}
                      </p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${item.tone}`}>
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card-dark overflow-hidden rounded-[32px] p-4 shadow-sm">
            {loading ? (
              <div className="h-[760px] animate-pulse rounded-[26px] bg-blush-100 dark:bg-charcoal-700/40" />
            ) : (
              <div className="crm-calendar rounded-[26px] border border-blush-100 bg-[linear-gradient(180deg,#fffdfa_0%,#fffaf7_100%)] p-3 dark:border-charcoal-700 dark:bg-[linear-gradient(180deg,#181513_0%,#141110_100%)]">
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
                  slotDuration="00:30:00"
                  allDaySlot={false}
                  selectable
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
          <div className="card-dark rounded-[32px] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-rose-gold" />
              <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-50">
                Legenda visual
              </h2>
            </div>

            <div className="space-y-3">
              {SERVICE_OPTIONS.map((service) => (
                <div key={service.value} className="flex items-center justify-between gap-3 rounded-2xl border border-blush-200 bg-cream/70 px-3 py-3 dark:border-charcoal-700 dark:bg-charcoal-800/70">
                  <div>
                    <p className="text-sm font-medium text-charcoal dark:text-charcoal-100">{service.label}</p>
                    <p className="text-xs text-charcoal-400 dark:text-charcoal-500">Categoria do atendimento</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${service.badgeClassName}`}>
                    {service.shortLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-dark rounded-[32px] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-50">
                  Proximos atendimentos
                </h2>
                <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-500">
                  Janela operacional mais imediata da agenda.
                </p>
              </div>
              <span className="rounded-full bg-rose-gold/10 px-2.5 py-1 text-[11px] font-semibold text-rose-gold">
                {upcomingAppointments.length}
              </span>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-blush-200 px-4 py-8 text-center text-sm text-charcoal-400 dark:border-charcoal-700 dark:text-charcoal-500">
                Nenhum atendimento futuro por enquanto.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => {
                  const service = SERVICE_OPTIONS.find((option) => option.value === appointment.serviceType)
                  const status = STATUS_META[appointment.status]

                  return (
                    <div
                      key={appointment.id}
                      className="rounded-2xl border border-blush-200 bg-cream/60 px-4 py-3 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-charcoal dark:text-charcoal-100">
                            {appointment.leadName}
                          </p>
                          <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-500">
                            {formatDateLabel(appointment.startTime)}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badgeClassName}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${service?.badgeClassName ?? 'bg-stone-100 text-stone-700 border-stone-200'}`}>
                          {service?.label ?? appointment.serviceType}
                        </span>
                        {appointment.notes ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] text-charcoal-500 dark:bg-charcoal-700 dark:text-charcoal-400">
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

          <div className="card-dark rounded-[32px] p-5 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-50">
              Ritmo da agenda
            </h2>
            <div className="mt-4 space-y-3 text-sm text-charcoal-500 dark:text-charcoal-400">
              <p>Selecione direto no calendario para abrir um agendamento no horario exato.</p>
              <p>Clique em qualquer bloco para ler rapidamente cliente, servico, status e observacoes.</p>
              <p>As cores foram separadas por tipo de atendimento para bater o olho e entender a semana.</p>
            </div>
          </div>
        </aside>
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/25 p-4 backdrop-blur-md"
          onClick={(event) => event.target === event.currentTarget && setShowModal(false)}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_80px_-35px_rgba(27,22,18,0.35)] dark:border-charcoal-700 dark:bg-charcoal-800">
            <div className="border-b border-blush-200 bg-gradient-to-r from-white via-cream to-blush/70 p-6 dark:border-charcoal-700 dark:from-charcoal-800 dark:via-charcoal-800 dark:to-charcoal-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-gold">Agenda</p>
                  <h2 className="mt-1 font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">
                    Novo agendamento
                  </h2>
                  <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-400">
                    Preencha os detalhes do atendimento e mantenha o calendario consistente com o CRM.
                  </p>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-xl p-2 text-charcoal-400 transition-colors hover:bg-white hover:text-charcoal dark:hover:bg-charcoal-700 dark:hover:text-charcoal-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-charcoal-400 dark:text-charcoal-400">
                  Lead
                </label>
                <select
                  required
                  value={form.leadId}
                  onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))}
                  className="w-full rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30 dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-100"
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
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-charcoal-400 dark:text-charcoal-400">
                    Data e hora
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30 dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-charcoal-400 dark:text-charcoal-400">
                    Duracao
                  </label>
                  <div className="flex h-[50px] items-center rounded-2xl border border-blush-300 bg-blush-50 px-4 text-sm font-medium text-charcoal-500 shadow-sm dark:border-charcoal-600 dark:bg-charcoal-700/60 dark:text-charcoal-300">
                    60 min padrao
                  </div>
                  <p className="mt-1 text-[11px] text-charcoal-400 dark:text-charcoal-500">
                    A duracao operacional atual do CRM e fixa em 1 hora por agendamento.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-charcoal-400 dark:text-charcoal-400">
                  Servico
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((service) => {
                    const active = form.serviceType === service.value
                    return (
                      <button
                        key={service.value}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, serviceType: service.value }))}
                        className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                          active
                            ? 'border-rose-gold bg-rose-gold/8 shadow-sm'
                            : 'border-blush-200 bg-white hover:border-rose-gold/40 hover:bg-blush/50 dark:border-charcoal-600 dark:bg-charcoal-700 dark:hover:border-rose-gold/40 dark:hover:bg-charcoal-700/80'
                        }`}
                      >
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${service.badgeClassName}`}>
                          {service.shortLabel}
                        </span>
                        <p className="mt-2 text-sm font-medium text-charcoal dark:text-charcoal-100">{service.label}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-charcoal-400 dark:text-charcoal-400">
                  Observacoes
                </label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30 dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-100"
                  placeholder="Ex.: primeira avaliacao, retorno, observacoes clinicas..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-2xl border border-blush-300 px-4 py-3 text-sm font-medium text-charcoal-500 transition-colors hover:bg-blush dark:border-charcoal-600 dark:text-charcoal-300 dark:hover:bg-charcoal-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-2xl bg-rose-gold px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-gold-500 disabled:opacity-60"
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
