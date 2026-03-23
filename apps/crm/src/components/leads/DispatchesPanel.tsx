'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ChevronDown,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { apiFetchJson, buildApiUrl, buildAuthHeaders } from '@/lib/api-client'
import { useAuth } from '@/lib/useAuth'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import {
  crmListBody,
  crmListCell,
  crmListEmpty,
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
} from '@/components/ui/listStyles'
import { EmptyState } from '@/components/ui/EmptyState'

type LeadStatusKey = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
type LeadSourceKey = 'organic' | 'instagram' | 'facebook' | 'google_ads' | 'referral' | 'whatsapp' | 'other'
type ActivityState = 'all' | 'active' | 'inactive'
type ToggleFilter = 'all' | 'yes' | 'no'

interface DispatchSettings {
  emailDailyLimit: number
  whatsappDailyLimit: number
  batchSize: number
  pacingMs: number
  inactiveAfterDays: number
}

interface DraftConfig {
  status: LeadStatusKey
  emailEnabled: boolean
  emailSubject: string
  emailBody: string
  whatsappEnabled: boolean
  whatsappBody: string
}

interface AudienceRow {
  id: string
  name: string
  email: string
  phone: string | null
  source: LeadSourceKey
  status: LeadStatusKey
  activityState: ActivityState
  emailReason: string
  whatsappReason: string
  whatsappE164: string | null
}

interface AudienceSummary {
  totalAudience: number
  reachableAnyChannel: number
  fullyIneligible: number
  sentToday: { email: number; whatsapp: number }
  statusCounts: Record<string, number>
  sourceCounts: Record<string, number>
  activityCounts: Record<string, number>
  email: {
    eligible: number
    ineligible: number
    reasons: Record<string, number>
    remainingToday: number
    providerConfigured: boolean
  }
  whatsapp: {
    eligible: number
    ineligible: number
    reasons: Record<string, number>
    remainingToday: number
    providerConfigured: boolean
  }
}

interface AudienceResponse {
  success: true
  data: {
    settings: DispatchSettings
    summary: AudienceSummary
    sample: AudienceRow[]
  }
}

interface HistoryResponse {
  success: true
  data: {
    campaigns: Array<Record<string, unknown>>
    reports: {
      bySource: Record<string, number>
      byStatus: Record<string, number>
      byEligibility: Record<string, number>
      byPeriod: Record<string, number>
      optOut: number
      inactive: number
    }
  }
}

const STATUS_TABS: Array<{ key: LeadStatusKey; label: string }> = [
  { key: 'new', label: 'Novos' },
  { key: 'contacted', label: 'Em contato' },
  { key: 'qualified', label: 'Qualificados' },
  { key: 'converted', label: 'Convertidos' },
  { key: 'lost', label: 'Perdidos' },
]

const SOURCE_LABELS: Record<LeadSourceKey, string> = {
  organic: 'Orgânico',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_ads: 'Google Ads',
  referral: 'Indicação',
  whatsapp: 'WhatsApp',
  other: 'Outro',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  converted: 'Convertido',
  lost: 'Perdido',
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

const REASON_LABELS: Record<string, string> = {
  eligible: 'Apto',
  missing_email: 'Sem e-mail',
  invalid_email: 'E-mail inválido',
  missing_number: 'Sem número',
  invalid_number: 'Número inválido',
  missing_consent: 'Consentimento ausente',
  opt_out: 'Opt-out / anonimizado',
  previous_bounce: 'Bounce prévio',
  daily_limit: 'Bloqueado por limite diário',
  provider_failed: 'Falha do provider',
  provider_unconfigured: 'Provider não configurado',
}

const EMAIL_VARIABLES = [
  { variable: '{nome}',     description: 'Nome completo' },
  { variable: '{email}',    description: 'E-mail' },
  { variable: '{telefone}', description: 'Telefone / WhatsApp' },
  { variable: '{servico}',  description: 'Serviço de interesse' },
  { variable: '{periodo}',  description: 'Período preferido' },
  { variable: '{origem}',   description: 'Canal de origem' },
  { variable: '{data}',     description: 'Data de hoje' },
]

function EmailVariablesLegend() {
  return (
    <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">Variáveis disponíveis</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {EMAIL_VARIABLES.map(({ variable, description }) => (
          <span key={variable} className="text-[11px] text-slate-400 dark:text-slate-400">
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-900 dark:bg-slate-800 dark:text-slate-100">{variable}</code>
            {' → '}
            {description}
          </span>
        ))}
      </div>
    </div>
  )
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dispatch-${Date.now()}`
}

export function DispatchesPanel() {
  const { accessToken, status, hasPermission } = useAuth()
  const canBroadcast = hasPermission('leads.broadcast')
  const canExport = hasPermission('leads.export')
  const canView = hasPermission('leads.view')
  const [activeStatus, setActiveStatus] = useState<LeadStatusKey>('new')
  const [settings, setSettings] = useState<DispatchSettings | null>(null)
  const [draft, setDraft] = useState<DraftConfig | null>(null)
  const [audience, setAudience] = useState<AudienceSummary | null>(null)
  const [sample, setSample] = useState<AudienceRow[]>([])
  const [history, setHistory] = useState<HistoryResponse['data'] | null>(null)
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [savingDraft, setSavingDraft] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey())
  const [filters, setFilters] = useState({
    source: '',
    from: '',
    to: '',
    activityState: 'all' as ActivityState,
    consented: 'all' as ToggleFilter,
    emailEligibility: 'all' as ToggleFilter,
    whatsappEligibility: 'all' as ToggleFilter,
    search: '',
  })

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('status', activeStatus)
    if (filters.source) params.set('source', filters.source)
    if (filters.from) params.set('from', new Date(`${filters.from}T00:00:00.000Z`).toISOString())
    if (filters.to) params.set('to', new Date(`${filters.to}T00:00:00.000Z`).toISOString())
    params.set('activityState', filters.activityState)
    params.set('consented', filters.consented)
    params.set('emailEligibility', filters.emailEligibility)
    params.set('whatsappEligibility', filters.whatsappEligibility)
    if (filters.search.trim()) params.set('search', filters.search.trim())
    return params.toString()
  }, [activeStatus, filters])

  // Separate query for tab counts — no status filter so all tabs show their real total
  const tabCountsQueryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.source) params.set('source', filters.source)
    if (filters.from) params.set('from', new Date(`${filters.from}T00:00:00.000Z`).toISOString())
    if (filters.to) params.set('to', new Date(`${filters.to}T00:00:00.000Z`).toISOString())
    params.set('activityState', filters.activityState)
    params.set('consented', filters.consented)
    params.set('emailEligibility', filters.emailEligibility)
    params.set('whatsappEligibility', filters.whatsappEligibility)
    if (filters.search.trim()) params.set('search', filters.search.trim())
    return params.toString()
  }, [filters])

  const loadDraft = useCallback(async () => {
    if (!accessToken) return
    const response = await apiFetchJson<{ success: true; data: DraftConfig }>(`/api/v1/dispatches/drafts/${activeStatus}`, {
      headers: buildAuthHeaders(accessToken),
    })
    setDraft(response.data)
  }, [accessToken, activeStatus])

  const loadAudience = useCallback(async () => {
    if (!accessToken) return
    const response = await apiFetchJson<AudienceResponse>(`/api/v1/dispatches/audience?${queryString}`, {
      headers: buildAuthHeaders(accessToken),
    })
    setSettings(response.data.settings)
    setAudience(response.data.summary)
    setSample(response.data.sample)
  }, [accessToken, queryString])

  const loadHistory = useCallback(async () => {
    if (!accessToken) return
    const response = await apiFetchJson<HistoryResponse>('/api/v1/dispatches/history', {
      headers: buildAuthHeaders(accessToken),
    })
    setHistory(response.data)
  }, [accessToken])

  const loadTabCounts = useCallback(async () => {
    if (!accessToken) return
    const response = await apiFetchJson<AudienceResponse>(`/api/v1/dispatches/audience?${tabCountsQueryString}`, {
      headers: buildAuthHeaders(accessToken),
    })
    setTabCounts(response.data.summary.statusCounts ?? {})
  }, [accessToken, tabCountsQueryString])

  useEffect(() => {
    if (status === 'loading' || !accessToken) return
    setLoading(true)
    Promise.all([loadDraft(), loadAudience(), loadHistory(), loadTabCounts()])
      .catch(() => toast.error('Erro ao carregar módulo de disparos'))
      .finally(() => setLoading(false))
  }, [accessToken, loadAudience, loadDraft, loadHistory, loadTabCounts, status])

  useEffect(() => {
    if (status === 'loading' || !accessToken) return
    loadDraft().catch(() => toast.error('Erro ao carregar rascunho'))
  }, [accessToken, activeStatus, loadDraft, status])

  useEffect(() => {
    if (status === 'loading' || !accessToken) return
    loadAudience().catch(() => toast.error('Erro ao recalcular audiência'))
  }, [accessToken, loadAudience, queryString, status])

  useEffect(() => {
    if (status === 'loading' || !accessToken) return
    loadTabCounts().catch(() => {})
  }, [accessToken, loadTabCounts, status])

  const handleSaveDraft = async () => {
    if (!accessToken || !draft || !canBroadcast) return
    setSavingDraft(true)
    try {
      await apiFetchJson(`/api/v1/dispatches/drafts/${activeStatus}`, {
        method: 'PUT',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify(draft),
      })
      toast.success('Rascunho salvo')
    } catch {
      toast.error('Erro ao salvar rascunho')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!accessToken || !settings || !canBroadcast) return
    setSavingSettings(true)
    try {
      await apiFetchJson('/api/v1/dispatches/settings', {
        method: 'PUT',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify(settings),
      })
      toast.success('Limites operacionais salvos')
      await loadAudience()
    } catch {
      toast.error('Erro ao salvar limites')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSend = async () => {
    if (!accessToken || !draft || !canBroadcast) return
    setSending(true)
    try {
      await apiFetchJson('/api/v1/dispatches/send', {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify({
          idempotencyKey,
          confirm: true,
          filters: {
            status: activeStatus,
            ...(filters.source ? { source: filters.source } : {}),
            ...(filters.from ? { from: new Date(`${filters.from}T00:00:00.000Z`).toISOString() } : {}),
            ...(filters.to ? { to: new Date(`${filters.to}T00:00:00.000Z`).toISOString() } : {}),
            activityState: filters.activityState,
            consented: filters.consented,
            emailEligibility: filters.emailEligibility,
            whatsappEligibility: filters.whatsappEligibility,
            ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
          },
          draft,
        }),
      })
      toast.success('Disparo operacional registrado')
      setShowConfirm(false)
      setIdempotencyKey(createIdempotencyKey())
      await Promise.all([loadAudience(), loadHistory()])
    } catch {
      toast.error('Erro ao disparar campanha')
    } finally {
      setSending(false)
    }
  }

  const handleExport = async () => {
    if (!accessToken || !canExport) return
    try {
      const response = await fetch(buildApiUrl(`/api/v1/dispatches/export?${queryString}`), {
        headers: buildAuthHeaders(accessToken),
      })
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `dispatch-audience-${activeStatus}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportado')
    } catch {
      toast.error('Erro ao exportar audiência')
    }
  }

  if (!canBroadcast && !canView) {
    return (
      <div className={`${crmListShell} p-8 text-sm text-slate-400 dark:text-slate-400`}>
        Este perfil não possui acesso ao módulo de disparos.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Disparos</h1>
        <Link href="/leads" className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400">
          Voltar para Leads
        </Link>
      </div>

      <div className={`${crmListToolbar} rounded-lg border border-slate-200/80 dark:border-slate-700`}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveStatus(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeStatus === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label} ({tabCounts[tab.key] ?? 0})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Audiência', value: audience?.totalAudience ?? 0, icon: Users, tone: 'text-blue-600 bg-blue-500/10' },
          { label: 'E-mail apto', value: audience?.email.eligible ?? 0, icon: Mail, tone: 'text-blue-500 bg-blue-500/10' },
          { label: 'WhatsApp apto', value: audience?.whatsapp.eligible ?? 0, icon: MessageCircle, tone: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Inelegíveis', value: audience?.fullyIneligible ?? 0, icon: ShieldAlert, tone: 'text-amber-500 bg-amber-500/10' },
        ].map((card) => (
          <div key={card.label} className="card-dark p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">{card.label}</p>
                <p className="mt-1 font-heading text-3xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${card.tone}`}>
                <card.icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={crmListShell}>
        <div className={crmListToolbar}>
          <div className={crmListSelectWrapper}>
            <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} className={crmListSelect}>
              <option value="">Todas as origens</option>
              {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <div className={crmListSelectWrapper}>
            <select value={filters.activityState} onChange={(event) => setFilters((current) => ({ ...current, activityState: event.target.value as ActivityState }))} className={crmListSelect}>
              <option value="all">Ativos e inativos</option>
              <option value="active">Somente ativos</option>
              <option value="inactive">Somente inativos</option>
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <div className={crmListSelectWrapper}>
            <select value={filters.consented} onChange={(event) => setFilters((current) => ({ ...current, consented: event.target.value as ToggleFilter }))} className={crmListSelect}>
              <option value="all">Consentimento: todos</option>
              <option value="yes">Com consentimento</option>
              <option value="no">Sem consentimento</option>
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <div className={crmListSelectWrapper}>
            <select value={filters.emailEligibility} onChange={(event) => setFilters((current) => ({ ...current, emailEligibility: event.target.value as ToggleFilter }))} className={crmListSelect}>
              <option value="all">E-mail: todos</option>
              <option value="yes">Com e-mail apto</option>
              <option value="no">Sem e-mail apto</option>
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <div className={crmListSelectWrapper}>
            <select value={filters.whatsappEligibility} onChange={(event) => setFilters((current) => ({ ...current, whatsappEligibility: event.target.value as ToggleFilter }))} className={crmListSelect}>
              <option value="all">WhatsApp: todos</option>
              <option value="yes">Com WhatsApp apto</option>
              <option value="no">Sem WhatsApp apto</option>
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="h-12 min-w-[170px] rounded-md border border-slate-200 bg-white/95 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
          <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="h-12 min-w-[170px] rounded-md border border-slate-200 bg-white/95 px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
          <div className={crmListSearchWrapper}>
            <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Buscar nome, e-mail ou observação" className={crmListSearchInput} />
          </div>
          <button type="button" onClick={() => void loadAudience()} className="rounded border border-slate-200 p-3 text-slate-400 transition-colors hover:text-blue-600 dark:border-slate-700" title="Atualizar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={handleExport} disabled={!canExport} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={14} />
            Exportar audiência
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={crmListShell}>
          <div className="border-b border-slate-200/90 px-5 py-4 dark:border-slate-700">
            <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Canais e mensagem</h2>
          </div>
          {draft ? (
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={draft.emailEnabled} onChange={(event) => setDraft((current) => current ? { ...current, emailEnabled: event.target.checked } : current)} />
                    Ativar disparo por e-mail
                  </label>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-400">
                    Restante hoje: {audience?.email.remainingToday ?? 0} / {settings?.emailDailyLimit ?? 0} · SMTP {audience?.email.providerConfigured ? 'ok' : 'não configurado'}
                  </p>
                  <input value={draft.emailSubject} onChange={(event) => setDraft((current) => current ? { ...current, emailSubject: event.target.value } : current)} placeholder="Assunto do e-mail" className="mt-4 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  <EmailVariablesLegend />
                  <div className="mt-3">
                    <RichTextEditor
                      value={draft.emailBody}
                      onChange={(html) => setDraft((current) => current ? { ...current, emailBody: html } : current)}
                      placeholder="Escreva a mensagem do e-mail..."
                    />
                  </div>
                  <EmailVariablesLegend />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={draft.whatsappEnabled} onChange={(event) => setDraft((current) => current ? { ...current, whatsappEnabled: event.target.checked } : current)} />
                    Ativar disparo por WhatsApp
                  </label>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-400">
                    Restante hoje: {audience?.whatsapp.remainingToday ?? 0} / {settings?.whatsappDailyLimit ?? 0} · Provider {audience?.whatsapp.providerConfigured ? 'ok' : 'pendente'}
                  </p>
                  <textarea rows={12} value={draft.whatsappBody} onChange={(event) => setDraft((current) => current ? { ...current, whatsappBody: event.target.value } : current)} placeholder="Mensagem operacional para WhatsApp" className="mt-4 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleSaveDraft} disabled={!canBroadcast || savingDraft} className="inline-flex items-center gap-2 rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400">
                  {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar rascunho
                </button>
                <button type="button" onClick={() => setShowConfirm(true)} disabled={!canBroadcast || sending || (!draft.emailEnabled && !draft.whatsappEnabled)} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send size={14} />
                  Disparar
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className={crmListShell}>
          <div className="border-b border-slate-200/90 px-5 py-4 dark:border-slate-700">
            <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Limites operacionais</h2>
          </div>
          {settings ? (
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Limite diário de e-mail</label>
                <input type="number" min={1} value={settings.emailDailyLimit} onChange={(event) => setSettings((current) => current ? { ...current, emailDailyLimit: Number(event.target.value) } : current)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Limite diário de WhatsApp</label>
                <input type="number" min={1} value={settings.whatsappDailyLimit} onChange={(event) => setSettings((current) => current ? { ...current, whatsappDailyLimit: Number(event.target.value) } : current)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Lote</label>
                  <input type="number" min={1} value={settings.batchSize} onChange={(event) => setSettings((current) => current ? { ...current, batchSize: Number(event.target.value) } : current)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Pacing (ms)</label>
                  <input type="number" min={0} value={settings.pacingMs} onChange={(event) => setSettings((current) => current ? { ...current, pacingMs: Number(event.target.value) } : current)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Dias para marcar como inativo</label>
                <input type="number" min={7} value={settings.inactiveAfterDays} onChange={(event) => setSettings((current) => current ? { ...current, inactiveAfterDays: Number(event.target.value) } : current)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <button type="button" onClick={handleSaveSettings} disabled={!canBroadcast || savingSettings} className="inline-flex items-center gap-2 rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400/60 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400">
                {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar limites
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={crmListShell}>
          <div className="border-b border-slate-200/90 px-5 py-4 dark:border-slate-700">
            <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Prévia da audiência</h2>
          </div>
          <div className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 md:grid-cols-2">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">E-mail</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(audience?.email.reasons ?? {}).map(([reason, count]) => (
                  <span key={reason} className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900">
                    {REASON_LABELS[reason] ?? reason}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">WhatsApp</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(audience?.whatsapp.reasons ?? {}).map(([reason, count]) => (
                  <span key={reason} className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900">
                    {REASON_LABELS[reason] ?? reason}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={crmListTableHead}>
                <tr>
                  {['Lead', 'Origem', 'Status', 'E-mail', 'WhatsApp'].map((header) => (
                    <th key={header} className={crmListHeaderCell}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={crmListBody}>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 size={20} className="mx-auto animate-spin text-blue-600" /></td></tr>
                ) : sample.length === 0 ? (
                  <tr><td colSpan={5} className="p-4"><EmptyState message="Nenhum lead encontrado para os filtros atuais." /></td></tr>
                ) : sample.map((lead) => (
                  <tr key={lead.id} className={crmListRow}>
                    <td className={crmListCell}>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{lead.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">{lead.email}</p>
                    </td>
                    <td className={crmListCell}>{SOURCE_LABELS[lead.source]}</td>
                    <td className={crmListCell}>{STATUS_LABELS[lead.status] ?? lead.status}</td>
                    <td className={crmListCell}>{REASON_LABELS[lead.emailReason] ?? lead.emailReason}</td>
                    <td className={crmListCell}>{REASON_LABELS[lead.whatsappReason] ?? lead.whatsappReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={crmListShell}>
          <div className="border-b border-slate-200/90 px-5 py-4 dark:border-slate-700">
            <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Histórico e relatórios</h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70">
                <p className="font-medium text-slate-900 dark:text-slate-100">Por origem</p>
                <div className="mt-2 space-y-1 text-slate-500 dark:text-slate-400">
                  {Object.entries(history?.reports.bySource ?? {}).map(([source, count]) => (
                    <p key={source}>{SOURCE_LABELS[source as LeadSourceKey] ?? source}: {count}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70">
                <p className="font-medium text-slate-900 dark:text-slate-100">Por status</p>
                <div className="mt-2 space-y-1 text-slate-500 dark:text-slate-400">
                  {Object.entries(history?.reports.byStatus ?? {}).map(([leadStatus, count]) => (
                    <p key={leadStatus}>{leadStatus}: {count}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70">
              <p className="font-medium text-slate-900 dark:text-slate-100">Elegibilidade operacional</p>
              <div className="mt-2 space-y-1 text-slate-500 dark:text-slate-400">
                {Object.entries(history?.reports.byEligibility ?? {}).map(([key, count]) => (
                  <p key={key}>{key}: {count}</p>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-400">
                Opt-out: {history?.reports.optOut ?? 0} · Inativos: {history?.reports.inactive ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70">
              <p className="font-medium text-slate-900 dark:text-slate-100">Por período</p>
              <div className="mt-2 space-y-1 text-slate-500 dark:text-slate-400">
                {Object.entries(history?.reports.byPeriod ?? {}).slice(0, 5).map(([period, count]) => (
                  <p key={period}>{period}: {count}</p>
                ))}
                {Object.keys(history?.reports.byPeriod ?? {}).length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-400">Sem registros no período auditado.</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70">
              <p className="font-medium text-slate-900 dark:text-slate-100">Últimos disparos</p>
              <div className="mt-2 space-y-2 text-slate-500 dark:text-slate-400">
                {(history?.campaigns ?? []).slice(0, 5).map((campaign, index) => (
                  <div key={String(campaign.campaignId ?? campaign.id ?? `campaign-${index}`)} className="rounded border border-slate-100 px-3 py-2 dark:border-slate-700">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{String(campaign.campaignId ?? campaign.id ?? 'campanha')}</p>
                    <p className="text-xs">
                      {String(campaign.createdAt ?? campaign.timestamp ?? '')} · audiência {String((campaign.totals as { totalAudience?: number } | undefined)?.totalAudience ?? 0)}
                    </p>
                  </div>
                ))}
                {(history?.campaigns ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-400">Nenhum disparo registrado nos últimos 180 dias.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && audience && draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && setShowConfirm(false)}>
          <div className="card-dark w-full max-w-xl shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Confirmar disparo</h2>
              <p className="mt-2 text-sm text-slate-400 dark:text-slate-400">
                Revise a audiência antes de confirmar. O módulo bloqueia double submit pelo idempotency key atual.
              </p>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm text-slate-500 dark:text-slate-400">
              <p>{draft.emailEnabled ? audience.email.eligible : 0} disparos de e-mail aptos</p>
              <p>{draft.whatsappEnabled ? audience.whatsapp.eligible : 0} disparos de WhatsApp aptos</p>
              <p>{audience.fullyIneligible} leads sem nenhum canal apto</p>
              <p>Limites restantes hoje: e-mail {audience.email.remainingToday} · WhatsApp {audience.whatsapp.remainingToday}</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleSend()} disabled={sending} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
                {sending ? 'Processando...' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
