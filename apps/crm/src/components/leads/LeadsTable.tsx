'use client'

import { Fragment, useState, useEffect, useCallback, useMemo, type FormEvent } from 'react'
import { useAuth } from '@/lib/useAuth'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Download, RefreshCw, ArrowUpDown, ChevronUp, ChevronDown, CircleDot, CheckCircle2, Phone, Star, Users, XCircle, Plus, Pencil, Loader2, FilterX, ChevronRight, CalendarClock, ShieldCheck, Trash2 } from 'lucide-react'
import { apiFetchJson, buildApiUrl, buildAuthHeaders } from '@/lib/api-client'
import {
  crmFieldSelect,
  crmFieldSelectIcon,
  crmFieldSelectWrapper,
  crmListBody,
  crmListCell,
  crmListEmpty,
  crmListFooter,
  crmListHeaderCell,
  crmListRow,
  crmListSearchInput,
  crmListSearchWrapper,
  crmListSelect,
  crmListSelectIcon,
  crmListSelectWrapper,
  crmListShell,
  crmListTableHead,
  crmListToolbar,
  crmSelectReset,
} from '@/components/ui/listStyles'
import { EmptyState } from '@/components/ui/EmptyState'

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  source: string
  status: string
  notes: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  consentedAt?: string | null
  createdAt: string
  convertedAt: string | null
}

interface LeadStats {
  total: number
  recent: number
  converted: number
  convertedInPeriod: number
  conversionRate: number
  byStatus: Array<{ status: string; count: number }>
  bySource: Array<{ source: string; count: number }>
  period: string
}

interface LeadDetail extends Lead {
  appointments: Array<{
    id: string
    date: string
    serviceType: string
    status: string
    notes: string | null
  }>
  sessions: Array<{
    id: string
    referrer: string | null
    pagesVisited: unknown
    createdAt: string
    analyticsEvents: Array<{
      id: string
      name: string
      category: string | null
      label: string | null
      page: string | null
      createdAt: string
    }>
  }>
  consentLogs: Array<{
    id: string
    channel: string
    policyVersion: string
    consentedAt: string
    ipAddress: string | null
  }>
  timeline: Array<{
    id: string
    type: string
    title: string
    description: string | null
    timestamp: string
  }>
}

interface LeadListResponse {
  success: true
  data: Lead[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface LeadStatsResponse {
  success: true
  data: LeadStats
}

interface LeadDetailResponse {
  success: true
  data: LeadDetail
}

interface LeadMutationResponse {
  success: true
  data: Lead
}

type LeadStatusKey = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
type LeadSourceKey = 'organic' | 'instagram' | 'facebook' | 'google_ads' | 'referral' | 'whatsapp' | 'other'

interface LeadFormState {
  name: string
  email: string
  phone: string
  source: LeadSourceKey
  sourceDetail: string
  status: LeadStatusKey
  notesService: string
  notesPeriod: string
  notesExtra: string
  consented: boolean
}

const ORIGEM_DETALHADA_OPTIONS = [
  { value: 'landing_form',   label: 'Formulário da Landing' },
  { value: 'instagram',      label: 'Instagram' },
  { value: 'facebook',       label: 'Facebook' },
  { value: 'google_ads',     label: 'Google Ads' },
  { value: 'whatsapp',       label: 'WhatsApp' },
  { value: 'indicacao',      label: 'Indicação de cliente' },
  { value: 'direct',         label: 'Acesso direto' },
  { value: 'email',          label: 'E-mail marketing' },
  { value: 'outro',          label: 'Outro' },
]

const NOTES_SERVICE_OPTIONS = [
  { value: 'sobrancelhas',            label: 'Sobrancelhas' },
  { value: 'labios_eyeliner',         label: 'Lábios & Eyeliner' },
  { value: 'capilar',                 label: 'Micropigmentação Capilar' },
  { value: 'tatuagens',               label: 'Remoção de Tatuagem' },
  { value: 'despigmentacao_labial',   label: 'Despigmentação Labial' },
]

const NOTES_PERIOD_OPTIONS = [
  { value: 'manha',  label: 'Manhã' },
  { value: 'tarde',  label: 'Tarde' },
  { value: 'noite',  label: 'Noite' },
]

function buildObservation(service: string, period: string, extra: string): string {
  const parts: string[] = []
  if (service) parts.push(`Serviço: ${service}`)
  if (period)  parts.push(`Período: ${period}`)
  if (extra.trim()) parts.push(extra.trim())
  return parts.join(' | ')
}

function parseObservation(notes: string | null | undefined) {
  const raw = notes ?? ''
  const service = raw.match(/Serviço:\s*([^|]+)/)?.[1]?.trim() ?? ''
  const period  = raw.match(/Período:\s*([^|]+)/)?.[1]?.trim() ?? ''
  const extra   = raw
    .replace(/Serviço:[^|]+(\|)?/i, '')
    .replace(/Período:[^|]+(\|)?/i, '')
    .replace(/^\||\|$/g, '')
    .trim()
  return { service, period, extra }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CircleDot }> = {
  new: { label: 'Novo', color: 'text-blue-400 bg-blue-500/10 dark:bg-blue-500/20', icon: CircleDot },
  contacted: { label: 'Contatado', color: 'text-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20', icon: Phone },
  qualified: { label: 'Qualificado', color: 'text-purple-400 bg-purple-500/10 dark:bg-purple-500/20', icon: Star },
  converted: { label: 'Convertido', color: 'text-green-400 bg-green-500/10 dark:bg-green-500/20', icon: CheckCircle2 },
  lost: { label: 'Perdido', color: 'text-red-400 bg-red-500/10 dark:bg-red-500/20', icon: XCircle },
}

const SOURCE_LABELS: Record<string, string> = {
  organic: 'Orgânico',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_ads: 'Google Ads',
  referral: 'Indicação',
  whatsapp: 'WhatsApp',
  other: 'Outro',
}

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG) as Array<[LeadStatusKey, { label: string; color: string; icon: typeof CircleDot }]>
const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS) as Array<[LeadSourceKey, string]>
const EMPTY_FORM: LeadFormState = {
  name: '',
  email: '',
  phone: '',
  source: 'organic',
  sourceDetail: '',
  status: 'new',
  notesService: '',
  notesPeriod: '',
  notesExtra: '',
  consented: false,
}

function getStatusCount(stats: LeadStats | null, status: LeadStatusKey) {
  return stats?.byStatus.find((item) => item.status === status)?.count ?? 0
}


function normalizeDateInput(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : ''
}


const ORIGIN_LABELS: Record<string, string> = {
  landing_form: 'Formulário da landing',
  manual_crm: 'CRM manual',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_ads: 'Google Ads',
  google: 'Google',
  whatsapp: 'WhatsApp',
  organic: 'Orgânico',
  referral: 'Indicação',
  direct: 'Acesso direto',
  email: 'E-mail',
  sms: 'SMS',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  other: 'Outro',
}

function fallbackHumanize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  phone: 'Telefone',
  landing_form: 'Formulário',
  manual_crm: 'CRM manual',
  instagram: 'Instagram',
  facebook: 'Facebook',
}

const SERVICE_LABELS_DETAIL: Record<string, string> = {
  sobrancelhas: 'Sobrancelhas',
  labios_eyeliner: 'Lábios / Eyeliner',
  capilar: 'Micropigmentação capilar',
  tatuagens: 'Tatuagens',
  nao_sei: 'Não sei ao certo',
}

const PERIOD_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  qualquer: 'Qualquer horário',
  nao_informado: 'Não informado',
}

function humanizeOrigin(utmSource?: string | null): string {
  if (!utmSource) return '-'
  return ORIGIN_LABELS[utmSource] ?? fallbackHumanize(utmSource)
}

function humanizeService(value?: string | null): string {
  if (!value) return '-'
  return SERVICE_LABELS_DETAIL[value] ?? value
}

function humanizePeriod(value?: string | null): string {
  if (!value) return '-'
  return PERIOD_LABELS[value] ?? value
}

function extractFromNotes(notes: string | null | undefined, key: 'service' | 'period'): string | null {
  if (!notes) return null
  const pattern = key === 'service' ? /Serviço:\s*([^|]+)/ : /Período:\s*([^|]+)/
  return notes.match(pattern)?.[1]?.trim() ?? null
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value || value === '-' || value === '—') return null
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-400">
        {label}
      </span>
      <span className="text-[13px] font-medium leading-snug text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  )
}

export function LeadsTable() {
  const { accessToken, status, hasPermission, updateSession } = useAuth()
  const canCreateLeads = hasPermission('leads.create')
  const canUpdateLeads = hasPermission('leads.update')
  const canExportLeads = hasPermission('leads.export')
  const canDeleteLeads = hasPermission('leads.delete')
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [consentFilter, setConsentFilter] = useState('')
  const [sourceDetailFilter, setSourceDetailFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [leadDetails, setLeadDetails] = useState<Record<string, LeadDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM)
  const [bulkStatusModal, setBulkStatusModal] = useState(false)
  const [bulkOriginModal, setBulkOriginModal] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<LeadStatusKey>('new')
  const [bulkOrigin, setBulkOrigin] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const buildLeadParams = useCallback((mode: 'list' | 'stats' | 'export' = 'list') => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (sourceFilter) params.set('source', sourceFilter)
    if (consentFilter) params.set('consented', consentFilter)
    if (sourceDetailFilter.trim()) params.set('sourceDetail', sourceDetailFilter.trim())
    if (searchFilter.trim()) params.set('search', searchFilter.trim())
    if (fromFilter) params.set('from', normalizeDateInput(fromFilter))
    if (toFilter) params.set('to', normalizeDateInput(toFilter))
    if (mode === 'list') params.set('limit', '100')
    if (mode === 'stats' && !params.has('from') && !params.has('to')) {
      params.set('from', '1970-01-01T00:00:00.000Z')
    }
    return params
  }, [consentFilter, fromFilter, searchFilter, sourceDetailFilter, sourceFilter, statusFilter, toFilter])

  const fetchLeads = useCallback(async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [listResponse, statsResponse] = await Promise.all([
        apiFetchJson<LeadListResponse>(`/api/v1/leads?${buildLeadParams('list').toString()}`, {
          headers: buildAuthHeaders(accessToken),
        }),
        apiFetchJson<LeadStatsResponse>(`/api/v1/leads/stats?${buildLeadParams('stats').toString()}`, {
          headers: buildAuthHeaders(accessToken),
        }),
      ])
      setLeads(listResponse.data ?? [])
      setLeadStats(statsResponse.data)
    } catch (error) {
      if (error instanceof Error && error.message === 'HTTP 401') {
        updateSession()
      } else {
        toast.error('Erro ao carregar operação de leads')
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken, buildLeadParams, updateSession])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchLeads()
  }, [fetchLeads, status])

  const fetchLeadDetail = useCallback(async (leadId: string) => {
    if (!accessToken) return
    setDetailLoadingId(leadId)
    try {
      const response = await apiFetchJson<LeadDetailResponse>(`/api/v1/leads/${leadId}`, {
        headers: buildAuthHeaders(accessToken),
      })
      setLeadDetails((current) => ({ ...current, [leadId]: response.data }))
    } catch {
      toast.error('Erro ao carregar detalhes do lead')
    } finally {
      setDetailLoadingId(null)
    }
  }, [accessToken])

  const openCreateModal = useCallback(() => {
    setEditingLead(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }, [])

  const openEditModal = useCallback((lead: Lead) => {
    setEditingLead(lead)
    const parsed = parseObservation(lead.notes)
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? '',
      source: (SOURCE_OPTIONS.some(([value]) => value === lead.source) ? lead.source : 'other') as LeadSourceKey,
      sourceDetail: lead.utmSource ?? '',
      status: (STATUS_OPTIONS.some(([value]) => value === lead.status) ? lead.status : 'new') as LeadStatusKey,
      notesService: parsed.service,
      notesPeriod: parsed.period,
      notesExtra: parsed.extra,
      consented: Boolean(lead.consentedAt),
    })
    setShowModal(true)
  }, [])

  const handleExpandLead = useCallback(async (leadId: string) => {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null)
      return
    }
    setExpandedLeadId(leadId)
    if (!leadDetails[leadId]) {
      await fetchLeadDetail(leadId)
    }
  }, [expandedLeadId, fetchLeadDetail, leadDetails])

  const leadHighlights = useMemo(() => {
    return [
      {
        label: 'Leads ativos',
        value: leadStats?.total ?? 0,
        tone: 'bg-rose-50 text-rose-700 ring-rose-100',
        icon: Users,
      },
      {
        label: 'Em contato',
        value: getStatusCount(leadStats, 'contacted'),
        tone: 'bg-amber-50 text-amber-700 ring-amber-100',
        icon: Phone,
      },
      {
        label: 'Qualificados',
        value: getStatusCount(leadStats, 'qualified'),
        tone: 'bg-violet-50 text-violet-700 ring-violet-100',
        icon: Star,
      },
      {
        label: 'Convertidos',
        value: getStatusCount(leadStats, 'converted'),
        tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        icon: CheckCircle2,
      },
    ]
  }, [leadStats])

  const handleStatusChange = async (id: string, status: string) => {
    if (!accessToken || !canUpdateLeads) return
    try {
      await apiFetchJson<LeadMutationResponse>(`/api/v1/leads/${id}`, {
        method: 'PATCH',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify({ status }),
      })
      toast.success('Status atualizado')
      await fetchLeads()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleExport = async () => {
    if (!accessToken || !canExportLeads) return
    try {
      const res = await fetch(buildApiUrl(`/api/v1/leads/export?${buildLeadParams('export').toString()}`), {
        headers: buildAuthHeaders(accessToken),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  const handleResetFilters = useCallback(() => {
    setStatusFilter('')
    setSourceFilter('')
    setConsentFilter('')
    setSourceDetailFilter('')
    setSearchFilter('')
    setFromFilter('')
    setToFilter('')
  }, [])

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken) return

    setSubmitting(true)
    try {
      const builtNotes = buildObservation(form.notesService, form.notesPeriod, form.notesExtra)
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        source: form.source,
        sourceDetail: form.sourceDetail.trim() || undefined,
        status: form.status,
        notes: builtNotes || undefined,
        ...(editingLead
          ? { consentedAt: form.consented ? (editingLead.consentedAt ?? new Date().toISOString()) : null }
          : { consented: form.consented }),
      }

      await apiFetchJson<LeadMutationResponse>(editingLead ? `/api/v1/leads/${editingLead.id}` : '/api/v1/leads/manual', {
        method: editingLead ? 'PATCH' : 'POST',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify(payload),
      })

      toast.success(editingLead ? 'Lead atualizada' : 'Lead criada manualmente')
      setShowModal(false)
      setEditingLead(null)
      setForm(EMPTY_FORM)
      await fetchLeads()
      if (editingLead) {
        await fetchLeadDetail(editingLead.id)
      }
    } catch {
      toast.error(editingLead ? 'Erro ao atualizar lead' : 'Erro ao criar lead')
    } finally {
      setSubmitting(false)
    }
  }, [accessToken, editingLead, fetchLeadDetail, fetchLeads, form])

  const columns: ColumnDef<Lead>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} className="rounded accent-rose-gold" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="rounded accent-rose-gold" />
      ),
      size: 40,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          Nome {column.getIsSorted() === 'asc' ? <ChevronUp size={13} /> : column.getIsSorted() === 'desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-40" />}
        </button>
      ),
      cell: info => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{info.getValue() as string}</p>
          <p className="text-xs text-slate-400 dark:text-slate-400">{info.row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Telefone',
      cell: info => {
        const phone = info.getValue() as string | null
        if (!phone) return <span className="text-sm text-slate-400 dark:text-slate-400">-</span>
        return (
          <a href={`https://wa.me/55${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-rose-gold hover:underline">
            {phone}
          </a>
        )
      },
    },
    {
      accessorKey: 'source',
      header: 'Origem',
      cell: info => <span className="text-sm text-slate-500 dark:text-slate-400">{SOURCE_LABELS[info.getValue() as string] ?? info.getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: info => {
        const status = info.getValue() as string
        const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new
        return (
          <div className="relative">
            <select
              value={status}
              onChange={e => handleStatusChange(info.row.original.id, e.target.value)}
              disabled={!canUpdateLeads}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border border-transparent outline-none cursor-pointer shadow-[0_8px_20px_-18px_rgba(0,0,0,0.6)] backdrop-blur pr-7 transition-all duration-150 ${crmSelectReset} ${cfg.color}`}
            >
              {STATUS_OPTIONS.map(([k, v]) => (
                <option key={k} value={k} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                  {v.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-70" />
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          Criado {column.getIsSorted() === 'asc' ? <ChevronUp size={13} /> : column.getIsSorted() === 'desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-40" />}
        </button>
      ),
      cell: info => (
        <span className="text-xs text-slate-400 dark:text-slate-400">
          {formatDistanceToNow(new Date(info.getValue() as string), { locale: ptBR, addSuffix: true })}
        </span>
      ),
      sortingFn: 'datetime',
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => {
        const isExpanded = expandedLeadId === row.original.id

        return (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void handleExpandLead(row.original.id)}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"
            >
              <ChevronRight size={14} className={isExpanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
              Detalhes
            </button>
            <button
              type="button"
              onClick={() => openEditModal(row.original)}
              disabled={!canUpdateLeads}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400"
            >
              <Pencil size={14} />
              Editar
            </button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    getRowId: row => row.id,
  })

  const selectedCount = table.getSelectedRowModel().rows.length

  const handleBulkStatus = useCallback(async () => {
    if (!accessToken || !canUpdateLeads) return
    const ids = table.getSelectedRowModel().rows.map(r => r.original.id)
    if (!ids.length) return
    setBulkSubmitting(true)
    try {
      await apiFetchJson<{ success: true; updated: number }>('/api/v1/leads/bulk', {
        method: 'PATCH',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify({ ids, updates: { status: bulkStatus } }),
      })
      toast.success(`Status atualizado em ${ids.length} lead${ids.length > 1 ? 's' : ''}`)
      setBulkStatusModal(false)
      setRowSelection({})
      await fetchLeads()
    } catch {
      toast.error('Erro ao atualizar status em massa')
    } finally {
      setBulkSubmitting(false)
    }
  }, [accessToken, canUpdateLeads, bulkStatus, fetchLeads, table])

  const handleBulkOrigin = useCallback(async () => {
    if (!accessToken || !canUpdateLeads) return
    const ids = table.getSelectedRowModel().rows.map(r => r.original.id)
    if (!ids.length) return
    setBulkSubmitting(true)
    try {
      await apiFetchJson<{ success: true; updated: number }>('/api/v1/leads/bulk', {
        method: 'PATCH',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify({ ids, updates: { source: bulkOrigin } }),
      })
      toast.success(`Origem atualizada em ${ids.length} lead${ids.length > 1 ? 's' : ''}`)
      setBulkOriginModal(false)
      setRowSelection({})
      await fetchLeads()
    } catch {
      toast.error('Erro ao atualizar origem em massa')
    } finally {
      setBulkSubmitting(false)
    }
  }, [accessToken, canUpdateLeads, bulkOrigin, fetchLeads, table])

  const handleBulkExportSelected = useCallback(() => {
    const selectedLeads = table.getSelectedRowModel().rows.map(r => r.original)
    if (!selectedLeads.length) return
    const headers = ['Nome', 'Email', 'Telefone', 'Origem', 'Status', 'Criado em']
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const rows = selectedLeads.map(l => [
      l.name, l.email, l.phone ?? '', SOURCE_LABELS[l.source] ?? l.source,
      STATUS_CONFIG[l.status]?.label ?? l.status, l.createdAt,
    ])
    const csv = [headers, ...rows].map(r => r.map(c => escape(String(c))).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-selecionados-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''} exportado${selectedLeads.length > 1 ? 's' : ''}`)
  }, [table])

  const handleBulkDelete = useCallback(async () => {
    if (!accessToken || !canDeleteLeads) return
    const ids = table.getSelectedRowModel().rows.map(r => r.original.id)
    if (!ids.length) return
    setBulkSubmitting(true)
    try {
      await apiFetchJson<{ success: true; deleted: number }>('/api/v1/leads/bulk', {
        method: 'DELETE',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify({ ids }),
      })
      toast.success(`${ids.length} lead${ids.length > 1 ? 's' : ''} excluído${ids.length > 1 ? 's' : ''}`)
      setBulkDeleteConfirm(false)
      setRowSelection({})
      await fetchLeads()
    } catch {
      toast.error('Erro ao excluir leads em massa')
    } finally {
      setBulkSubmitting(false)
    }
  }, [accessToken, canDeleteLeads, fetchLeads, table])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {leadHighlights.map((item) => {
          const Icon = item.icon

          return (
            <div key={item.label} className="card-dark rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 font-heading text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {item.value}
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ring-1 ${item.tone}`}>
                  <Icon size={18} aria-hidden="true" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className={crmListShell}>
        <div className={crmListToolbar}>
          <div className={crmListSearchWrapper}>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Buscar por nome, email, telefone ou observação"
              className={crmListSearchInput}
            />
          </div>
          <div className={crmListSelectWrapper}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={crmListSelect}
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <div className={crmListSelectWrapper}>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className={crmListSelect}
            >
              <option value="">Todas as origens</option>
              {SOURCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <div className={crmListSelectWrapper}>
            <select
              value={consentFilter}
              onChange={e => setConsentFilter(e.target.value)}
              className={crmListSelect}
            >
              <option value="">Consentimento: todos</option>
              <option value="true">Com consentimento</option>
              <option value="false">Sem consentimento</option>
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <input
            value={sourceDetailFilter}
            onChange={e => setSourceDetailFilter(e.target.value)}
            placeholder="Origem detalhada / campanha"
            className="h-12 min-w-[220px] rounded-lg border border-slate-200 bg-white/95 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="date"
            value={fromFilter}
            onChange={e => setFromFilter(e.target.value)}
            className="h-12 min-w-[170px] rounded-lg border border-slate-200 bg-white/95 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="date"
            value={toFilter}
            onChange={e => setToFilter(e.target.value)}
            className="h-12 min-w-[170px] rounded-lg border border-slate-200 bg-white/95 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"
          >
            <FilterX size={14} />
            Limpar
          </button>
          <button onClick={fetchLeads} className="rounded-lg border border-slate-200 p-3 text-slate-400 transition-colors hover:text-blue-600 dark:border-slate-700" title="Atualizar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canCreateLeads}
            className="inline-flex items-center gap-2 rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400"
          >
            <Plus size={14} />
            Novo lead
          </button>
          <button
            onClick={handleExport}
            disabled={!canExportLeads}
            className="inline-flex items-center gap-2 rounded bg-rose-gold px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-[0_4px_16px_rgba(45,35,20,0.12)] animate-[slideDown_0.2s_ease] dark:border-slate-700 dark:bg-slate-900">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {selectedCount} lead{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </span>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={() => setBulkStatusModal(true)}
            disabled={!canUpdateLeads}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400"
          >
            Alterar status
          </button>
          <button
            type="button"
            onClick={() => setBulkOriginModal(true)}
            disabled={!canUpdateLeads}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400"
          >
            Alterar origem
          </button>
          <button
            type="button"
            onClick={handleBulkExportSelected}
            disabled={!canExportLeads}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400"
          >
            <Download size={12} />
            Exportar selecionados
          </button>
          <button
            type="button"
            onClick={() => setBulkDeleteConfirm(true)}
            disabled={!canDeleteLeads}
            className="inline-flex items-center gap-1.5 rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-400 hover:text-red-700 disabled:opacity-50 dark:border-red-900/40 dark:text-red-400"
          >
            <Trash2 size={12} />
            Excluir selecionados
          </button>
          <button
            type="button"
            onClick={() => setRowSelection({})}
            className="ml-auto inline-flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-900 dark:border-slate-700 dark:text-slate-400"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className={crmListShell}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={crmListTableHead}>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} className={crmListHeaderCell}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className={crmListBody}>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center">
                    <div className="flex justify-center"><div className="w-6 h-6 border-2 border-rose-gold border-t-transparent rounded-full animate-spin" /></div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-4">
                    <EmptyState message="Nenhum lead encontrado." />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const detail = leadDetails[row.original.id]
                  const isExpanded = expandedLeadId === row.original.id
                  const isDetailLoading = detailLoadingId === row.original.id

                  return (
                    <Fragment key={row.id}>
                      <tr className={crmListRow}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className={crmListCell}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-slate-50 dark:bg-slate-900/35">
                          <td colSpan={columns.length} className="px-4 py-5">
                            {isDetailLoading ? (
                              <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-400">
                                <Loader2 size={16} className="animate-spin" />
                                Carregando rastreabilidade do lead...
                              </div>
                            ) : detail ? (
                              <div className="space-y-4">
                                <div className="rounded-lg border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                                  <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                                    <ShieldCheck size={15} className="text-slate-900 dark:text-slate-100" />
                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Captura e consentimento</span>
                                  </div>
                                  <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                                    <InfoItem label="Origem" value={SOURCE_LABELS[detail.source] ?? detail.source} />
                                    <InfoItem label="Canal" value={humanizeOrigin(detail.utmSource)} />
                                    <InfoItem label="Serviço de interesse" value={humanizeService(extractFromNotes(detail.notes, 'service'))} />
                                    <InfoItem label="Período preferido" value={humanizePeriod(extractFromNotes(detail.notes, 'period'))} />
                                    <InfoItem label="Consentido em" value={detail.consentedAt ? new Date(detail.consentedAt).toLocaleString('pt-BR') : undefined} />
                                  </div>
                                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                                    {detail.consentLogs.length > 0 ? detail.consentLogs.map((log) => (
                                      <span key={log.id} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                        {CHANNEL_LABELS[log.channel] ?? fallbackHumanize(log.channel)} · {new Date(log.consentedAt).toLocaleDateString('pt-BR')}
                                      </span>
                                    )) : detail.utmSource ? (
                                      <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        {humanizeOrigin(detail.utmSource)}{detail.consentedAt ? ` · ${new Date(detail.consentedAt).toLocaleDateString('pt-BR')}` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400 dark:text-slate-400">Sem log adicional de consentimento.</span>
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    <CalendarClock size={16} />
                                    Agenda e atividade
                                  </div>
                                  <div className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                                    {detail.appointments.length > 0 ? detail.appointments.map((appointment) => (
                                      <div key={appointment.id} className="rounded border border-slate-100 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                                        {humanizeService(appointment.serviceType)} · {appointment.status} · {new Date(appointment.date).toLocaleString('pt-BR')}
                                      </div>
                                    )) : (
                                      <p>Nenhum agendamento vinculado.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 dark:text-slate-400">Nenhum detalhe disponível para este lead.</p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className={crmListFooter}>
          <span>{leads.length} leads carregados</span>
          <span>{table.getSelectedRowModel().rows.length} selecionados</span>
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="card-dark w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-700">
              <div>
                <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {editingLead ? 'Editar lead' : 'Cadastrar lead manualmente'}
                </h2>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                  Edite as informações do lead. As alterações ficam registradas no histórico.
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Nome *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">E-mail *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Telefone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Status</label>
                  <div className={crmFieldSelectWrapper}>
                    <select
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LeadStatusKey }))}
                      className={crmFieldSelect}
                    >
                      {STATUS_OPTIONS.map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                    </select>
                    <ChevronDown size={16} className={crmFieldSelectIcon} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Origem</label>
                  <div className={crmFieldSelectWrapper}>
                    <select
                      value={form.source}
                      onChange={(event) => setForm((current) => ({ ...current, source: event.target.value as LeadSourceKey }))}
                      className={crmFieldSelect}
                    >
                      {SOURCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <ChevronDown size={16} className={crmFieldSelectIcon} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Origem detalhada</label>
                  <div className={crmFieldSelectWrapper}>
                    <select
                      value={form.sourceDetail}
                      onChange={(event) => setForm((current) => ({ ...current, sourceDetail: event.target.value }))}
                      className={crmFieldSelect}
                    >
                      <option value="">Não informada</option>
                      {ORIGEM_DETALHADA_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className={crmFieldSelectIcon} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Serviço de interesse</label>
                  <div className={crmFieldSelectWrapper}>
                    <select
                      value={form.notesService}
                      onChange={(event) => setForm((current) => ({ ...current, notesService: event.target.value }))}
                      className={crmFieldSelect}
                    >
                      <option value="">Não informado</option>
                      {NOTES_SERVICE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className={crmFieldSelectIcon} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Período preferido</label>
                  <div className={crmFieldSelectWrapper}>
                    <select
                      value={form.notesPeriod}
                      onChange={(event) => setForm((current) => ({ ...current, notesPeriod: event.target.value }))}
                      className={crmFieldSelect}
                    >
                      <option value="">Não informado</option>
                      {NOTES_PERIOD_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className={crmFieldSelectIcon} />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Observação adicional (opcional)</label>
                <textarea
                  rows={3}
                  value={form.notesExtra}
                  onChange={(event) => setForm((current) => ({ ...current, notesExtra: event.target.value }))}
                  placeholder="Alguma informação extra sobre o lead..."
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={form.consented}
                  onChange={(event) => setForm((current) => ({ ...current, consented: event.target.checked }))}
                />
                Consentimento de contato registrado
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded border border-slate-200 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="flex-1 rounded bg-rose-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-gold-500 disabled:opacity-60">
                  {submitting ? 'Salvando...' : editingLead ? 'Salvar alterações' : 'Criar lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {bulkStatusModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setBulkStatusModal(false)}>
          <div className="card-dark w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
              <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">Alterar status em massa</h2>
              <button type="button" onClick={() => setBulkStatusModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"><XCircle size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Aplicar a {selectedCount} lead{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}.</p>
              <div className={crmFieldSelectWrapper}>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as LeadStatusKey)} className={crmFieldSelect}>
                  {STATUS_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <ChevronDown size={16} className={crmFieldSelectIcon} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setBulkStatusModal(false)} className="flex-1 rounded border border-slate-200 px-4 py-2 text-sm text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
                <button type="button" onClick={() => void handleBulkStatus()} disabled={bulkSubmitting} className="flex-1 rounded bg-rose-gold px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-500 disabled:opacity-60">
                  {bulkSubmitting ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {bulkOriginModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setBulkOriginModal(false)}>
          <div className="card-dark w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
              <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">Alterar origem em massa</h2>
              <button type="button" onClick={() => setBulkOriginModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"><XCircle size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Aplicar a {selectedCount} lead{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}.</p>
              <div className={crmFieldSelectWrapper}>
                <select value={bulkOrigin} onChange={e => setBulkOrigin(e.target.value)} className={crmFieldSelect}>
                  <option value="">Selecionar origem...</option>
                  {SOURCE_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <ChevronDown size={16} className={crmFieldSelectIcon} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setBulkOriginModal(false)} className="flex-1 rounded border border-slate-200 px-4 py-2 text-sm text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
                <button type="button" onClick={() => void handleBulkOrigin()} disabled={bulkSubmitting || !bulkOrigin} className="flex-1 rounded bg-rose-gold px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-500 disabled:opacity-60">
                  {bulkSubmitting ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {bulkDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setBulkDeleteConfirm(false)}>
          <div className="card-dark w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
              <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">Confirmar exclusão</h2>
              <button type="button" onClick={() => setBulkDeleteConfirm(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"><XCircle size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tem certeza que deseja excluir <strong className="text-slate-900 dark:text-slate-100">{selectedCount} lead{selectedCount > 1 ? 's' : ''}</strong>? Esta ação é irreversível.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setBulkDeleteConfirm(false)} className="flex-1 rounded border border-slate-200 px-4 py-2 text-sm text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
                <button type="button" onClick={() => void handleBulkDelete()} disabled={bulkSubmitting} className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                  {bulkSubmitting ? 'Excluindo...' : `Excluir ${selectedCount} lead${selectedCount > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
