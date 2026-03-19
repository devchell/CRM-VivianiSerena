'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  Globe2,
  Layers3,
  Loader2,
  Mail,
  RefreshCw,
  Server,
  ShieldAlert,
  Unlink2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/useAuth'
import { crmPublicEnv } from '@/lib/public-env'

const API_URL = `${crmPublicEnv.apiBaseUrl}/api/v1`

type AdminOverview = {
  integrations: {
    googleCalendar: {
      configured: boolean
      connected: boolean
      calendarId: string
      expiresAt: string | null
      hasRefreshToken: boolean
    }
    email: {
      configured: boolean
      provider: string
      host: string | null
      port: string | null
      secure: boolean
      user: string | null
      from: string | null
      fromName: string | null
      adminEmail: string | null
      source: 'database' | 'environment'
      passwordConfigured: boolean
    }
  }
  infrastructure: {
    database: boolean
    redis: boolean
    uploads: boolean
    storageDriver: string
  }
  environment: {
    apiBaseUrl: string
    crmUrl: string
    corsOrigins: string[]
    googleRedirectUri: string | null
    googleClientConfigured: boolean
    calendarId: string
  }
}

type EmailFormState = {
  host: string
  port: string
  secure: boolean
  user: string
  password: string
  from: string
  fromName: string
  adminEmail: string
}

type VisibilitySection = 'google' | 'email' | 'environment'
type VisibilityState = Record<VisibilitySection, boolean>

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {ok ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
      {label}
    </span>
  )
}

function SummaryCard(props: { label: string; value: string; note: string; icon: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-blush-200 bg-white/90 p-5 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-900/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">{props.label}</p>
          <p className="mt-2 font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">{props.value}</p>
          <p className="mt-2 text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">{props.note}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream text-rose-gold ring-1 ring-blush-200 dark:bg-charcoal-800 dark:ring-charcoal-700">
          {props.icon}
        </div>
      </div>
    </div>
  )
}

function VisibilityToggle(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${props.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blush-200 bg-white text-charcoal-500 hover:bg-blush dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-300 dark:hover:bg-charcoal-700'}`}
    >
      {props.active ? <Eye size={14} /> : <EyeOff size={14} />}
      {props.label}
    </button>
  )
}

function InfoCard(props: { label: string; value: string; breakAll?: boolean; note?: string }) {
  return (
    <div className="rounded-2xl border border-blush-200 bg-white px-4 py-3 dark:border-charcoal-700 dark:bg-charcoal-800/70">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-400">{props.label}</p>
      <p className={`mt-2 text-sm font-medium text-charcoal dark:text-charcoal-100 ${props.breakAll ? 'break-all' : ''}`}>{props.value}</p>
      {props.note ? <p className="mt-2 text-xs leading-5 text-charcoal-400 dark:text-charcoal-500">{props.note}</p> : null}
    </div>
  )
}

function SectionCard(props: {
  eyebrow: string
  title: string
  description: string
  visible: boolean
  onToggle: () => void
  status?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[32px] border border-blush-200 bg-white/90 p-6 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-900/70">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-gold">{props.eyebrow}</p>
          <h2 className="mt-2 font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">{props.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">{props.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {props.status}
          <VisibilityToggle label={props.visible ? 'Ocultar dados' : 'Exibir dados'} active={props.visible} onClick={props.onToggle} />
        </div>
      </div>
      <div className="mt-5">{props.children}</div>
    </section>
  )
}

export default function AdministracaoPage() {
  const { accessToken, isAdmin } = useAuth()
  const searchParams = useSearchParams()
  const hasLoadedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [googleBusy, setGoogleBusy] = useState<'connect' | 'disconnect' | null>(null)
  const [emailSaving, setEmailSaving] = useState(false)
  const [visibility, setVisibility] = useState<VisibilityState>({ google: false, email: false, environment: false })
  const [emailForm, setEmailForm] = useState<EmailFormState>({
    host: '',
    port: '587',
    secure: false,
    user: '',
    password: '',
    from: '',
    fromName: '',
    adminEmail: '',
  })

  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }), [accessToken])
  const allVisible = useMemo(() => Object.values(visibility).every(Boolean), [visibility])
  const visibleCount = useMemo(() => Object.values(visibility).filter(Boolean).length, [visibility])

  const loadOverview = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (!accessToken) return
    const fullLoad = mode === 'initial' || !hasLoadedRef.current
    if (fullLoad) setLoading(true)
    else setRefreshing(true)

    try {
      setLoadError(null)
      const response = await fetch(`${API_URL}/admin/overview`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const payload = await response.json() as { success: boolean; data?: AdminOverview; message?: string }
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? 'Erro ao carregar administracao')
      hasLoadedRef.current = true
      setOverview(payload.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar administracao'
      setLoadError(message)
      toast.error(message)
    } finally {
      if (fullLoad) setLoading(false)
      else setRefreshing(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadOverview('initial')
  }, [loadOverview])

  useEffect(() => {
    const googleStatus = searchParams.get('google')
    if (googleStatus === 'connected') {
      toast.success('Google Calendar conectado com sucesso')
      void loadOverview('refresh')
    }
    if (googleStatus === 'error') {
      toast.error('Não foi possível concluir a conexão com o Google Calendar')
      void loadOverview('refresh')
    }
  }, [loadOverview, searchParams])

  useEffect(() => {
    if (!overview) return
    setEmailForm({
      host: overview.integrations.email.host ?? '',
      port: overview.integrations.email.port ?? '587',
      secure: overview.integrations.email.secure,
      user: overview.integrations.email.user ?? '',
      password: '',
      from: overview.integrations.email.from ?? '',
      fromName: overview.integrations.email.fromName ?? '',
      adminEmail: overview.integrations.email.adminEmail ?? '',
    })
  }, [overview])

  function toggleSection(section: VisibilitySection) {
    setVisibility((current) => ({ ...current, [section]: !current[section] }))
  }

  function toggleAll() {
    const nextValue = !allVisible
    setVisibility({ google: nextValue, email: nextValue, environment: nextValue })
  }

  function updateEmailField<K extends keyof EmailFormState>(field: K, value: EmailFormState[K]) {
    setEmailForm((current) => ({ ...current, [field]: value }))
  }

  function maskValue(value: string | null | undefined, visible: boolean) {
    if (!value) return 'Não configurado'
    if (visible) return value
    if (value.length <= 8) return '********'
    return `${value.slice(0, 3)}******${value.slice(-3)}`
  }

  async function handleGoogleConnect() {
    setGoogleBusy('connect')
    try {
      const response = await fetch(`${API_URL}/auth/google`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const payload = await response.json() as { success: boolean; data?: { authUrl: string }; message?: string }
      if (!response.ok || !payload.success || !payload.data?.authUrl) throw new Error(payload.message ?? 'Não foi possível iniciar a conexão com o Google')
      window.location.href = payload.data.authUrl
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao conectar Google Calendar')
      setGoogleBusy(null)
    }
  }

  async function handleGoogleDisconnect() {
    setGoogleBusy('disconnect')
    try {
      const response = await fetch(`${API_URL}/auth/google`, { method: 'DELETE', headers })
      const payload = await response.json() as { success: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message ?? 'Erro ao desconectar Google Calendar')
      toast.success(payload.message ?? 'Google Calendar desconectado')
      await loadOverview('refresh')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desconectar Google Calendar')
    } finally {
      setGoogleBusy(null)
    }
  }

  async function handleEmailSave() {
    setEmailSaving(true)
    try {
      const response = await fetch(`${API_URL}/admin/email-settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          host: emailForm.host.trim(),
          port: Number(emailForm.port),
          secure: emailForm.secure,
          user: emailForm.user.trim(),
          password: emailForm.password.trim() || undefined,
          from: emailForm.from.trim(),
          fromName: emailForm.fromName.trim(),
          adminEmail: emailForm.adminEmail.trim(),
        }),
      })
      const payload = await response.json() as { success: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message ?? 'Erro ao salvar dados de e-mail')
      toast.success(payload.message ?? 'Dados de e-mail salvos com sucesso')
      setEmailForm((current) => ({ ...current, password: '' }))
      await loadOverview('refresh')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar dados de e-mail')
    } finally {
      setEmailSaving(false)
    }
  }

  if (!isAdmin) {
    return <div className="flex min-h-[320px] items-center justify-center text-sm text-charcoal-400">Acesso restrito a administradores.</div>
  }

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 size={28} className="animate-spin text-rose-gold" /></div>
  }

  if (!overview) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
        <p className="font-semibold">Não foi possível carregar o painel.</p>
        <p className="mt-1">{loadError ?? 'Erro inesperado.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-blush-200 bg-[radial-gradient(circle_at_top_left,_rgba(201,150,122,0.16),_transparent_36%),linear-gradient(135deg,#fffdfb_0%,#fff7f1_52%,#fffdfb_100%)] px-6 py-6 shadow-[0_28px_80px_-42px_rgba(97,73,54,0.35)] dark:border-charcoal-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(201,150,122,0.18),_transparent_34%),linear-gradient(135deg,#171412_0%,#1e1a17_52%,#161311_100%)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-gold">Administracao</p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">Integracoes, credenciais e ambiente sob controle.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">Refinei a hierarquia visual do painel para separar melhor os dados sensíveis e deixar cada bloco mais fácil de operar.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={toggleAll} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-blush dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700">
              {allVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              {allVisible ? 'Ocultar tudo' : 'Mostrar tudo'}
            </button>
            <button type="button" onClick={() => void loadOverview('refresh')} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-blush disabled:opacity-60 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700">
              {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Atualizar painel
            </button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <StatusPill ok={overview.infrastructure.database} label={overview.infrastructure.database ? 'Banco OK' : 'Banco com falha'} />
          <StatusPill ok={overview.infrastructure.redis} label={overview.infrastructure.redis ? 'Redis OK' : 'Redis com falha'} />
          <StatusPill ok={overview.integrations.email.source === 'database'} label={overview.integrations.email.source === 'database' ? 'SMTP no banco' : 'SMTP via ambiente'} />
          <StatusPill ok={overview.integrations.googleCalendar.connected} label={overview.integrations.googleCalendar.connected ? 'Google conectado' : 'Google pendente'} />
        </div>
      </section>

      {loadError ? <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">{loadError}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <SummaryCard label="Banco" value={overview.infrastructure.database ? 'OK' : 'Falha'} note="Disponibilidade do banco principal." icon={<Database size={18} />} />
        <SummaryCard label="Redis" value={overview.infrastructure.redis ? 'OK' : 'Falha'} note="Cache e filas auxiliares." icon={<Server size={18} />} />
        <SummaryCard label="Uploads" value={overview.infrastructure.uploads ? 'OK' : 'Falha'} note={`Driver atual: ${overview.infrastructure.storageDriver}.`} icon={<ExternalLink size={18} />} />
        <SummaryCard label="Google" value={overview.integrations.googleCalendar.connected ? 'Conectado' : 'Pendente'} note={overview.integrations.googleCalendar.configured ? 'OAuth configurado.' : 'Credenciais OAuth pendentes.'} icon={<Globe2 size={18} />} />
        <SummaryCard label="Visibilidade" value={`${visibleCount}/3`} note="Blocos com dados visíveis." icon={<Layers3 size={18} />} />
      </div>

      <section className="rounded-[32px] border border-blush-200 bg-white/90 p-6 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-900/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-gold">Visibilidade</p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">Controle rapido por area</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">Cada seção agora tem um controle mais claro para exibição pontual. O botão global continua no topo para abrir ou fechar tudo.</p>
          </div>
          <div className="rounded-2xl border border-blush-200 bg-cream/80 px-4 py-3 text-sm text-charcoal-600 dark:border-charcoal-700 dark:bg-charcoal-800/70 dark:text-charcoal-300">{visibleCount} de 3 blocos visíveis.</div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <VisibilityToggle label={visibility.google ? 'Google visivel' : 'Google oculto'} active={visibility.google} onClick={() => toggleSection('google')} />
          <VisibilityToggle label={visibility.email ? 'E-mail visivel' : 'E-mail oculto'} active={visibility.email} onClick={() => toggleSection('email')} />
          <VisibilityToggle label={visibility.environment ? 'Ambiente visivel' : 'Ambiente oculto'} active={visibility.environment} onClick={() => toggleSection('environment')} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="space-y-4">
          <SectionCard eyebrow="Google Calendar" title="Sincronização da agenda externa" description={overview.integrations.googleCalendar.connected ? (overview.integrations.googleCalendar.expiresAt ? `Conta conectada. Expiração atual: ${new Date(overview.integrations.googleCalendar.expiresAt).toLocaleString('pt-BR')}.` : 'Conta conectada. O token atual não expõe expiração neste retorno.') : 'Use o acesso abaixo para autorizar sua conta Google e preparar a sincronização do calendário.'} visible={visibility.google} onToggle={() => toggleSection('google')} status={<><StatusPill ok={overview.integrations.googleCalendar.configured} label={overview.integrations.googleCalendar.configured ? 'OAuth configurado' : 'OAuth pendente'} /><StatusPill ok={overview.integrations.googleCalendar.connected} label={overview.integrations.googleCalendar.connected ? 'Conta conectada' : 'Sem conexão'} /></>}>
            {!overview.integrations.googleCalendar.configured ? <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">O botão de conexão só habilita quando a API tiver client id, secret e redirect URI válidos.</div> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard label="Calendar ID" value={maskValue(overview.integrations.googleCalendar.calendarId, visibility.google)} note="Identificador usado para sincronizar eventos." />
              <InfoCard label="Refresh token" value={overview.integrations.googleCalendar.hasRefreshToken ? 'Disponível' : 'Não disponível'} note="Indica se o ambiente consegue renovar a autorização." />
              <div className="md:col-span-2">
                <InfoCard label="Redirect URI" value={maskValue(overview.environment.googleRedirectUri, visibility.google)} breakAll note="URL usada no retorno do OAuth do Google." />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleGoogleConnect()} disabled={googleBusy !== null || !overview.integrations.googleCalendar.configured} className="inline-flex items-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-blush disabled:opacity-60 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700">
                {googleBusy === 'connect' ? <Loader2 size={15} className="animate-spin" /> : <Globe2 size={15} />}
                Acessar com sua conta Google
                <ExternalLink size={14} className="opacity-60" />
              </button>
              <button type="button" onClick={() => void handleGoogleDisconnect()} disabled={googleBusy !== null || !overview.integrations.googleCalendar.connected} className="inline-flex items-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-blush disabled:opacity-60 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700">
                {googleBusy === 'disconnect' ? <Loader2 size={15} className="animate-spin" /> : <Unlink2 size={15} />}
                Desconectar Google
              </button>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Dados de e-mail" title="SMTP, remetente e notificacoes" description="As credenciais de envio ficam agrupadas em um unico fluxo de manutencao, com leitura do banco e atualizacao imediata apos salvar." visible={visibility.email} onToggle={() => toggleSection('email')} status={<><StatusPill ok={overview.integrations.email.configured} label={overview.integrations.email.configured ? 'SMTP pronto' : 'SMTP pendente'} /><StatusPill ok={overview.integrations.email.source === 'database'} label={overview.integrations.email.source === 'database' ? 'Editavel no painel' : 'Lendo do ambiente'} /></>}>
            <div className="grid gap-3 md:grid-cols-3">
              <InfoCard label="Provider" value={overview.integrations.email.provider} />
              <InfoCard label="Origem" value={overview.integrations.email.source === 'database' ? 'Banco de dados' : 'Variaveis de ambiente'} />
              <InfoCard label="Senha SMTP" value={overview.integrations.email.passwordConfigured ? 'Configurada' : 'Não configurada'} />
            </div>
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm"><span className="font-medium text-charcoal dark:text-charcoal-100">Host SMTP</span><input value={emailForm.host} onChange={(event) => updateEmailField('host', event.target.value)} className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100" placeholder={maskValue(overview.integrations.email.host, visibility.email)} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-charcoal dark:text-charcoal-100">Porta SMTP</span><input value={emailForm.port} onChange={(event) => updateEmailField('port', event.target.value)} className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100" placeholder="587" /></label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm"><span className="font-medium text-charcoal dark:text-charcoal-100">Usuário SMTP</span><input value={emailForm.user} onChange={(event) => updateEmailField('user', event.target.value)} className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100" placeholder={maskValue(overview.integrations.email.user, visibility.email)} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-charcoal dark:text-charcoal-100">Seguranca</span><select value={emailForm.secure ? 'true' : 'false'} onChange={(event) => updateEmailField('secure', event.target.value === 'true')} className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"><option value="false">STARTTLS / porta 587</option><option value="true">SSL/TLS / porta 465</option></select></label>
              </div>
              <label className="space-y-2 text-sm"><span className="font-medium text-charcoal dark:text-charcoal-100">Senha SMTP</span><input type="password" value={emailForm.password} onChange={(event) => updateEmailField('password', event.target.value)} className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100" placeholder={overview.integrations.email.passwordConfigured ? (visibility.email ? 'Deixe em branco para manter a atual' : '****** senha configurada') : 'Digite a senha SMTP'} /></label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm"><span className="font-medium text-charcoal dark:text-charcoal-100">E-mail remetente</span><input value={emailForm.from} onChange={(event) => updateEmailField('from', event.target.value)} className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100" placeholder={maskValue(overview.integrations.email.from, visibility.email)} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-charcoal dark:text-charcoal-100">Nome do remetente</span><input value={emailForm.fromName} onChange={(event) => updateEmailField('fromName', event.target.value)} className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100" placeholder={maskValue(overview.integrations.email.fromName, visibility.email)} /></label>
              </div>
              <label className="space-y-2 text-sm"><span className="font-medium text-charcoal dark:text-charcoal-100">E-mail administrativo</span><input value={emailForm.adminEmail} onChange={(event) => updateEmailField('adminEmail', event.target.value)} className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100" placeholder={maskValue(overview.integrations.email.adminEmail, visibility.email)} /></label>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs leading-6 text-charcoal-400 dark:text-charcoal-500">Se a senha ficar vazia, o valor atual sera preservado. As alteracoes entram em uso assim que forem salvas.</p>
              <button type="button" onClick={() => void handleEmailSave()} disabled={emailSaving} className="inline-flex items-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-blush disabled:opacity-60 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700">
                {emailSaving ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                Salvar dados de e-mail
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard eyebrow="Ambiente" title="Configurações sensíveis" description="URLs, CORS e storage ficam concentrados em um resumo técnico mais direto." visible={visibility.environment} onToggle={() => toggleSection('environment')} status={<StatusPill ok={overview.environment.googleClientConfigured} label={overview.environment.googleClientConfigured ? 'Google client ativo' : 'Google client pendente'} />}>
            <div className="grid gap-3">
              <InfoCard label="API" value={maskValue(overview.environment.apiBaseUrl, visibility.environment)} breakAll />
              <InfoCard label="CRM" value={maskValue(overview.environment.crmUrl, visibility.environment)} breakAll />
              <InfoCard label="Google redirect URI" value={maskValue(overview.environment.googleRedirectUri, visibility.environment)} breakAll />
              <InfoCard label="Storage" value={overview.infrastructure.storageDriver} note="Driver atual usado para uploads." />
            </div>
            <div className="mt-5 rounded-3xl border border-blush-200 bg-cream/70 p-4 dark:border-charcoal-700 dark:bg-charcoal-800/60">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-charcoal dark:text-charcoal-50">Origens liberadas em CORS</p>
                  <p className="mt-1 text-xs leading-5 text-charcoal-500 dark:text-charcoal-400">{overview.environment.corsOrigins.length} origem(ns) configurada(s).</p>
                </div>
                <StatusPill ok={visibility.environment} label={visibility.environment ? 'Lista visivel' : 'Lista oculta'} />
              </div>
              <div className="mt-4 space-y-2">
                {visibility.environment ? overview.environment.corsOrigins.map((origin) => (
                  <div key={origin} className="rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm font-medium text-charcoal break-all dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-charcoal-100">{origin}</div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-blush-300 bg-white px-4 py-3 text-sm text-charcoal-500 dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-charcoal-400">A lista de origens está oculta. Abra a seção para exibir os valores completos.</div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
