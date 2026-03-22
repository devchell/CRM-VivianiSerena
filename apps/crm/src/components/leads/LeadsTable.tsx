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
import { Search, Download, RefreshCw, ArrowUpDown, ChevronUp, ChevronDown, CircleDot, CheckCircle2, Phone, Star, Users, XCircle, Plus, Pencil, Loader2, FilterX, ChevronRight, CalendarClock, ShieldCheck } from 'lucide-react'
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
  notes: string
  consented: boolean
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
  notes: '',
  consented: false,
}

function getStatusCount(stats: LeadStats | null, status: LeadStatusKey) {
  return stats?.byStatus.find((item) => item.status === status)?.count ?? 0
}

function getSourceCount(stats: LeadStats | null, source: LeadSourceKey) {
  return stats?.bySource.find((item) => item.source === source)?.count ?? 0
}

function normalizeDateInput(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : ''
}

function parsePagesVisited(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

export function LeadsTable() {
  const { accessToken, status, hasPermission } = useAuth()
  const canCreateLeads = hasPermission('leads.create')
  const canUpdateLeads = hasPermission('leads.update')
  const canExportLeads = hasPermission('leads.export')
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
  const [showModal, setShowModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM)

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
    } catch {
      toast.error('Erro ao carregar operação de leads')
    } finally {
      setLoading(false)
    }
  }, [accessToken, buildLeadParams])

  useEffect(() => {
    if (status === 'loading') return
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
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? '',
      source: (SOURCE_OPTIONS.some(([value]) => value === lead.source) ? lead.source : 'other') as LeadSourceKey,
      sourceDetail: lead.utmSource ?? '',
      status: (STATUS_OPTIONS.some(([value]) => value === lead.status) ? lead.status : 'new') as LeadStatusKey,
      notes: lead.notes ?? '',
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
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        source: form.source,
        sourceDetail: form.sourceDetail.trim() || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
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
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 hover:text-rose-gold transition-colors">
          Nome {column.getIsSorted() === 'asc' ? <ChevronUp size={13} /> : column.getIsSorted() === 'desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-40" />}
        </button>
      ),
      cell: info => (
        <div>
          <p className="font-medium text-charcoal dark:text-charcoal-100">{info.getValue() as string}</p>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-300">{info.row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Telefone',
      cell: info => {
        const phone = info.getValue() as string | null
        if (!phone) return <span className="text-sm text-charcoal-400 dark:text-charcoal-300">-</span>
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
      cell: info => <span className="text-sm text-charcoal-500 dark:text-charcoal-300">{SOURCE_LABELS[info.getValue() as string] ?? info.getValue() as string}</span>,
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
                <option key={k} value={k} className="bg-white dark:bg-[#111110] text-charcoal dark:text-charcoal-100">
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
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 hover:text-rose-gold transition-colors">
          Criado {column.getIsSorted() === 'asc' ? <ChevronUp size={13} /> : column.getIsSorted() === 'desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-40" />}
        </button>
      ),
      cell: info => (
        <span className="text-xs text-charcoal-400 dark:text-charcoal-300">
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
              className="inline-flex items-center gap-1 rounded border border-blush-300 px-3 py-2 text-xs font-medium text-charcoal-500 transition-colors hover:border-rose-gold/40 hover:text-rose-gold dark:border-[#3a3835] dark:text-charcoal-300"
            >
              <ChevronRight size={14} className={isExpanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
              Detalhes
            </button>
            <button
              type="button"
              onClick={() => openEditModal(row.original)}
              disabled={!canUpdateLeads}
              className="inline-flex items-center gap-1 rounded border border-blush-300 px-3 py-2 text-xs font-medium text-charcoal-500 transition-colors hover:border-rose-gold/40 hover:text-rose-gold disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3a3835] dark:text-charcoal-300"
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {leadHighlights.map((item) => {
          const Icon = item.icon

          return (
            <div key={item.label} className="card-dark rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-400 dark:text-charcoal-300">
                    {item.label}
                  </p>
                  <p className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">
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
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
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
            className="h-12 min-w-[220px] rounded-lg border border-blush-300 bg-white/95 px-4 text-sm text-charcoal shadow-sm outline-none transition focus:border-rose-gold/40 focus:ring-2 focus:ring-rose-gold/20 dark:border-[#3a3835] dark:bg-[#1c1b1a] dark:text-charcoal-100"
          />
          <input
            type="date"
            value={fromFilter}
            onChange={e => setFromFilter(e.target.value)}
            className="h-12 min-w-[170px] rounded-lg border border-blush-300 bg-white/95 px-4 text-sm text-charcoal shadow-sm outline-none transition focus:border-rose-gold/40 focus:ring-2 focus:ring-rose-gold/20 dark:border-[#3a3835] dark:bg-[#1c1b1a] dark:text-charcoal-100"
          />
          <input
            type="date"
            value={toFilter}
            onChange={e => setToFilter(e.target.value)}
            className="h-12 min-w-[170px] rounded-lg border border-blush-300 bg-white/95 px-4 text-sm text-charcoal shadow-sm outline-none transition focus:border-rose-gold/40 focus:ring-2 focus:ring-rose-gold/20 dark:border-[#3a3835] dark:bg-[#1c1b1a] dark:text-charcoal-100"
          />
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded border border-blush-300 px-4 py-3 text-sm font-medium text-charcoal-500 transition-colors hover:border-rose-gold/40 hover:text-rose-gold dark:border-[#3a3835] dark:text-charcoal-300"
          >
            <FilterX size={14} />
            Limpar
          </button>
          <button onClick={fetchLeads} className="rounded-lg border border-blush-300 p-3 text-charcoal-400 transition-colors hover:text-rose-gold dark:border-[#3a3835]" title="Atualizar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canCreateLeads}
            className="inline-flex items-center gap-2 rounded border border-blush-300 px-4 py-3 text-sm font-medium text-charcoal-500 transition-colors hover:border-rose-gold/40 hover:text-rose-gold disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3a3835] dark:text-charcoal-300"
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
        <div className="grid gap-3 border-t border-blush-100 bg-white/70 px-5 py-4 text-xs text-charcoal-400 dark:border-[#3a3835] dark:bg-[#1c1b1a]/40 dark:text-charcoal-300 md:grid-cols-3">
          <div>
            <span className="font-semibold uppercase tracking-[0.16em] text-charcoal-500 dark:text-charcoal-300">Fonte de verdade</span>
            <p className="mt-1">Cards e contadores usam `/api/v1/leads/stats`; tabela e export usam os mesmos filtros de `/api/v1/leads`.</p>
          </div>
          <div>
            <span className="font-semibold uppercase tracking-[0.16em] text-charcoal-500 dark:text-charcoal-300">Origens</span>
            <p className="mt-1">Instagram {getSourceCount(leadStats, 'instagram')} · Google Ads {getSourceCount(leadStats, 'google_ads')} · WhatsApp {getSourceCount(leadStats, 'whatsapp')}</p>
          </div>
          <div>
            <span className="font-semibold uppercase tracking-[0.16em] text-charcoal-500 dark:text-charcoal-300">Conversao</span>
            <p className="mt-1">{leadStats?.conversionRate ?? 0}% · {leadStats?.converted ?? 0} convertidos · periodo {leadStats?.period ?? 'all'}</p>
          </div>
        </div>
      </div>

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
                        <tr className="bg-blush/35 dark:bg-[#1c1b1a]/35">
                          <td colSpan={columns.length} className="px-4 py-5">
                            {isDetailLoading ? (
                              <div className="flex items-center gap-2 text-sm text-charcoal-400 dark:text-charcoal-300">
                                <Loader2 size={16} className="animate-spin" />
                                Carregando rastreabilidade do lead...
                              </div>
                            ) : detail ? (
                              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                                <div className="space-y-4">
                                  <div className="rounded-lg border border-blush-200 bg-white/80 p-4 dark:border-[#3a3835] dark:bg-[#1c1b1a]/70">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-charcoal-100">
                                      <ShieldCheck size={16} />
                                      Captura e consentimento
                                    </div>
                                    <dl className="mt-3 grid gap-2 text-sm text-charcoal-500 dark:text-charcoal-300 md:grid-cols-2">
                                      <div><dt className="text-xs uppercase tracking-[0.16em]">Origem</dt><dd className="mt-1">{SOURCE_LABELS[detail.source] ?? detail.source}</dd></div>
                                      <div><dt className="text-xs uppercase tracking-[0.16em]">Origem detalhada</dt><dd className="mt-1">{detail.utmSource ?? '-'}</dd></div>
                                      <div><dt className="text-xs uppercase tracking-[0.16em]">UTM medium</dt><dd className="mt-1">{detail.utmMedium ?? '-'}</dd></div>
                                      <div><dt className="text-xs uppercase tracking-[0.16em]">UTM campaign</dt><dd className="mt-1">{detail.utmCampaign ?? '-'}</dd></div>
                                      <div><dt className="text-xs uppercase tracking-[0.16em]">Consentido em</dt><dd className="mt-1">{detail.consentedAt ? new Date(detail.consentedAt).toLocaleString('pt-BR') : 'Não'}</dd></div>
                                      <div><dt className="text-xs uppercase tracking-[0.16em]">Observação</dt><dd className="mt-1">{detail.notes ?? '-'}</dd></div>
                                    </dl>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {detail.consentLogs.length > 0 ? detail.consentLogs.map((log) => (
                                        <span key={log.id} className="inline-flex items-center rounded-full border border-blush-200 bg-white px-3 py-1 text-[11px] font-medium text-charcoal-500 dark:border-[#3a3835] dark:bg-[#1c1b1a] dark:text-charcoal-300">
                                          {log.channel} · {new Date(log.consentedAt).toLocaleDateString('pt-BR')}
                                        </span>
                                      )) : (
                                        <span className="text-xs text-charcoal-400 dark:text-charcoal-300">Sem log adicional de consentimento.</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-blush-200 bg-white/80 p-4 dark:border-[#3a3835] dark:bg-[#1c1b1a]/70">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-charcoal-100">
                                      <CalendarClock size={16} />
                                      Agenda e atividade
                                    </div>
                                    <div className="mt-3 space-y-2 text-sm text-charcoal-500 dark:text-charcoal-300">
                                      {detail.appointments.length > 0 ? detail.appointments.map((appointment) => (
                                        <div key={appointment.id} className="rounded border border-blush-100 bg-white/80 px-3 py-2 dark:border-[#3a3835] dark:bg-[#1c1b1a]">
                                          {appointment.serviceType} · {appointment.status} · {new Date(appointment.date).toLocaleString('pt-BR')}
                                        </div>
                                      )) : (
                                        <p>Nenhum agendamento vinculado.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="rounded-lg border border-blush-200 bg-white/80 p-4 dark:border-[#3a3835] dark:bg-[#1c1b1a]/70">
                                    <div className="text-sm font-semibold text-charcoal dark:text-charcoal-100">Sessão e entrada</div>
                                    <div className="mt-3 space-y-3 text-sm text-charcoal-500 dark:text-charcoal-300">
                                      {detail.sessions.length > 0 ? detail.sessions.map((session) => (
                                        <div key={session.id} className="rounded border border-blush-100 bg-white/80 px-3 py-3 dark:border-[#3a3835] dark:bg-[#1c1b1a]">
                                          <p>Referrer: {session.referrer ?? '-'}</p>
                                          <p className="mt-1">Páginas: {parsePagesVisited(session.pagesVisited).join(', ') || '-'}</p>
                                          <p className="mt-1">Eventos: {session.analyticsEvents.length}</p>
                                        </div>
                                      )) : (
                                        <p>Nenhuma sessão vinculada.</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-blush-200 bg-white/80 p-4 dark:border-[#3a3835] dark:bg-[#1c1b1a]/70">
                                    <div className="text-sm font-semibold text-charcoal dark:text-charcoal-100">Timeline</div>
                                    <div className="mt-3 space-y-2 text-sm text-charcoal-500 dark:text-charcoal-300">
                                      {detail.timeline.length > 0 ? detail.timeline.slice(0, 8).map((item) => (
                                        <div key={item.id} className="rounded border border-blush-100 bg-white/80 px-3 py-2 dark:border-[#3a3835] dark:bg-[#1c1b1a]">
                                          <p className="font-medium text-charcoal dark:text-charcoal-100">{item.title}</p>
                                          <p className="mt-1">{item.description ?? '-'}</p>
                                          <p className="mt-1 text-xs">{new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                                        </div>
                                      )) : (
                                        <p>Sem eventos adicionais.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-charcoal-400 dark:text-charcoal-300">Nenhum detalhe disponível para este lead.</p>
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
            <div className="flex items-center justify-between border-b border-blush-200 p-6 dark:border-[#3a3835]">
              <div>
                <h2 className="font-heading text-lg font-semibold text-charcoal dark:text-charcoal-50">
                  {editingLead ? 'Editar lead' : 'Cadastrar lead manualmente'}
                </h2>
                <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-300">
                  Operação manual usa o mesmo modelo de lead da captura pública, com origem e consentimento rastreáveis.
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-charcoal-400 transition-colors hover:text-charcoal dark:hover:text-charcoal-100">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-400">Nome *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-md border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-400">E-mail *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-md border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-400">Telefone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full rounded-md border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-400">Status</label>
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
                  <label className="mb-1 block text-xs font-medium text-charcoal-400">Origem</label>
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
                  <label className="mb-1 block text-xs font-medium text-charcoal-400">Origem detalhada</label>
                  <input
                    value={form.sourceDetail}
                    onChange={(event) => setForm((current) => ({ ...current, sourceDetail: event.target.value }))}
                    placeholder="utm_source, campanha ou anotação"
                    className="w-full rounded-md border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-400">Observação / necessidade</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-md border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-charcoal-500 dark:text-charcoal-300">
                <input
                  type="checkbox"
                  checked={form.consented}
                  onChange={(event) => setForm((current) => ({ ...current, consented: event.target.checked }))}
                />
                Consentimento de contato registrado
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded border border-blush-300 px-4 py-2 text-sm text-charcoal-400 transition-colors hover:bg-blush dark:border-[#3a3835] dark:hover:bg-[#252423]">
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
    </div>
  )
}
