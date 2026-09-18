'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  Globe2,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Server,
  ShieldAlert,
  Unlink2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/useAuth'
import { useRealtimeRefresh } from '@/lib/realtime'
import { crmPublicEnv } from '@/lib/public-env'
import {
  crmFieldSelect,
  crmFieldSelectIcon,
  crmFieldSelectWrapper,
} from '@/components/ui/listStyles'


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
    whatsapp: {
      configured: boolean
      connected: boolean
      missingConfiguration: string[]
      graphApiVersion: string
      webhookPath: string
      embeddedSignupReady: boolean
      displayPhoneNumber: string | null
      verifiedName: string | null
      qualityRating: string | null
      codeVerificationStatus: string | null
      nameStatus: string | null
      phoneNumberId: string | null
      businessAccountId: string | null
      wabaId: string | null
      webhookSubscribed: boolean
      connectedAt: string | null
      disconnectedAt: string | null
      lastError: string | null
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
    whatsappAppId: string | null
    whatsappEmbeddedSignupConfigId: string | null
    whatsappWebhookPath: string
    whatsappGraphApiVersion: string
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

type VisibilitySection = 'google' | 'email' | 'environment' | 'whatsapp'
type VisibilityState = Record<VisibilitySection, boolean>

type WhatsAppSignupMessage = {
  type?: string
  event?: string
  data?: {
    phone_number_id?: string
    waba_id?: string
    business_account_id?: string
    app_scoped_user_id?: string
  }
}

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

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
    <div className="rounded-lg border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{props.label}</p>
          <p className="mt-2 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">{props.value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{props.note}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 text-blue-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${props.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'}`}
    >
      {props.active ? <Eye size={14} /> : <EyeOff size={14} />}
      {props.label}
    </button>
  )
}

function InfoCard(props: { label: string; value: string; breakAll?: boolean; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{props.label}</p>
      <p className={`mt-2 text-sm font-medium text-slate-900 dark:text-slate-100 ${props.breakAll ? 'break-all' : ''}`}>{props.value}</p>
      {props.note ? <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-slate-400">{props.note}</p> : null}
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
    <section className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">{props.eyebrow}</p>
          <h2 className="mt-2 font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">{props.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{props.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {props.status}
          <VisibilityToggle label={props.visible ? 'Ocultar dados' : 'Exibir dados'} active={props.visible} onClick={props.onToggle} />
        </div>
      </div>
      {props.visible && <div className="mt-5">{props.children}</div>}
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
  const [whatsappBusy, setWhatsappBusy] = useState<'connect' | 'disconnect' | null>(null)
  const [metaSdkReady, setMetaSdkReady] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [emailTestTo, setEmailTestTo] = useState('')
  const [visibility, setVisibility] = useState<VisibilityState>({ google: false, email: false, environment: false, whatsapp: false })
  const whatsappSignupRef = useRef<Record<string, string | undefined> | null>(null)
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

  const loadOverview = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (!accessToken) return
    const fullLoad = mode === 'initial' || !hasLoadedRef.current
    if (fullLoad) setLoading(true)
    else setRefreshing(true)

    try {
      setLoadError(null)
      const response = await fetch(`${API_URL}/admin/overview`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const payload = await response.json() as { success: boolean; data?: AdminOverview; message?: string }
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? 'Erro ao carregar administração')
      hasLoadedRef.current = true
      setOverview(payload.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar administração'
      setLoadError(message)
      toast.error(message)
    } finally {
      if (fullLoad) setLoading(false)
      else setRefreshing(false)
    }
  }, [accessToken])

  const refreshRealtime = useCallback(() => loadOverview('refresh'), [loadOverview])
  useRealtimeRefresh(refreshRealtime, ['admin', 'users', 'whatsapp'])

  useEffect(() => {
    void loadOverview('initial')
  }, [loadOverview])

  useEffect(() => {
    if (!overview?.environment.whatsappAppId || !overview.environment.whatsappEmbeddedSignupConfigId) {
      setMetaSdkReady(false)
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
        return
      }

      let payload: WhatsAppSignupMessage | null = null
      if (typeof event.data === 'string') {
        try {
          payload = JSON.parse(event.data) as WhatsAppSignupMessage
        } catch {
          payload = null
        }
      } else if (typeof event.data === 'object' && event.data !== null) {
        payload = event.data as WhatsAppSignupMessage
      }

      if (payload?.type === 'WA_EMBEDDED_SIGNUP' && payload.event === 'FINISH') {
        whatsappSignupRef.current = (payload.data as Record<string, string | undefined> | undefined) ?? null
      }
    }

    const existing = document.getElementById('meta-facebook-jssdk') as HTMLScriptElement | null
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'meta-facebook-jssdk'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      document.body.appendChild(script)
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: overview.environment.whatsappAppId,
        version: overview.environment.whatsappGraphApiVersion,
        xfbml: false,
      })
      setMetaSdkReady(true)
    }

    if (window.FB) {
      window.fbAsyncInit()
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [overview])

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
    setVisibility({ google: nextValue, whatsapp: nextValue, email: nextValue, environment: nextValue })
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

  async function handleWhatsappConnect() {
    if (!overview?.integrations.whatsapp.configured) {
      toast.error('Configure APP ID, APP SECRET, CONFIG ID e webhook do WhatsApp Business antes de conectar o canal')
      return
    }

    if (!metaSdkReady || !window.FB) {
      toast.error('SDK oficial da Meta ainda não carregou')
      return
    }

    setWhatsappBusy('connect')
    whatsappSignupRef.current = null

    try {
      const code = await new Promise<string>((resolve, reject) => {
        window.FB?.login((response) => {
          const authCode = response.authResponse?.code
          if (!authCode) {
            reject(new Error('Meta não retornou o código de autorização do canal'))
            return
          }
          resolve(authCode)
        }, {
          config_id: overview.environment.whatsappEmbeddedSignupConfigId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            featureType: 'whatsapp_embedded_signup',
            sessionInfoVersion: 3,
          },
        })
      })
      const signupData: Record<string, string | undefined> = whatsappSignupRef.current ?? {}

      const response = await fetch(`${API_URL}/admin/whatsapp/connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code,
          phoneNumberId: signupData['phone_number_id'],
          wabaId: signupData['waba_id'],
          businessAccountId: signupData['business_account_id'],
          appScopedUserId: signupData['app_scoped_user_id'],
        }),
      })
      const payload = await response.json() as { success: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message ?? 'Não foi possível conectar o canal oficial do WhatsApp')
      toast.success(payload.message ?? 'Canal oficial do WhatsApp conectado')
      await loadOverview('refresh')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao conectar WhatsApp Business')
    } finally {
      setWhatsappBusy(null)
    }
  }

  async function handleWhatsappDisconnect() {
    setWhatsappBusy('disconnect')
    try {
      const response = await fetch(`${API_URL}/admin/whatsapp/connect`, {
        method: 'DELETE',
        headers,
      })
      const payload = await response.json() as { success: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message ?? 'Erro ao desconectar canal do WhatsApp')
      toast.success(payload.message ?? 'Canal oficial do WhatsApp desconectado')
      await loadOverview('refresh')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desconectar WhatsApp Business')
    } finally {
      setWhatsappBusy(null)
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

  async function handleEmailTest() {
    setEmailTesting(true)
    try {
      const response = await fetch(`${API_URL}/admin/email-settings/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to: emailTestTo.trim() || undefined }),
      })
      const payload = await response.json() as { success: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message ?? 'Erro ao enviar e-mail de teste')
      toast.success(payload.message ?? 'E-mail de teste enviado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar e-mail de teste')
    } finally {
      setEmailTesting(false)
    }
  }

  if (!isAdmin) {
    return <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-400">Acesso restrito a administradores.</div>
  }

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
  }

  if (!overview) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
        <p className="font-semibold">Não foi possível carregar o painel.</p>
        <p className="mt-1">{loadError ?? 'Erro inesperado.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Administração</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={toggleAll} className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            {allVisible ? <EyeOff size={15} /> : <Eye size={15} />}
            {allVisible ? 'Ocultar tudo' : 'Mostrar tudo'}
          </button>
          <button type="button" onClick={() => void loadOverview('refresh')} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Atualizar painel
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill ok={overview.infrastructure.database} label={overview.infrastructure.database ? 'Banco OK' : 'Banco com falha'} />
        <StatusPill ok={overview.infrastructure.redis} label={overview.infrastructure.redis ? 'Redis OK' : 'Redis com falha'} />
        <StatusPill ok={overview.integrations.email.source === 'database'} label={overview.integrations.email.source === 'database' ? 'SMTP no banco' : 'SMTP via ambiente'} />
        <StatusPill ok={overview.integrations.googleCalendar.connected} label={overview.integrations.googleCalendar.connected ? 'Google conectado' : 'Google pendente'} />
        <StatusPill ok={overview.integrations.whatsapp.connected} label={overview.integrations.whatsapp.connected ? 'WhatsApp conectado' : 'WhatsApp pendente'} />
      </div>

      {loadError ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">{loadError}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-6">
        <SummaryCard label="Banco" value={overview.infrastructure.database ? 'OK' : 'Falha'} note="Disponibilidade do banco principal." icon={<Database size={18} />} />
        <SummaryCard label="Redis" value={overview.infrastructure.redis ? 'OK' : 'Falha'} note="Cache e filas auxiliares." icon={<Server size={18} />} />
        <SummaryCard label="Uploads" value={overview.infrastructure.uploads ? 'OK' : 'Falha'} note={`Driver atual: ${overview.infrastructure.storageDriver}.`} icon={<ExternalLink size={18} />} />
        <SummaryCard label="Google" value={overview.integrations.googleCalendar.connected ? 'Conectado' : 'Pendente'} note={overview.integrations.googleCalendar.configured ? 'OAuth configurado.' : 'Credenciais OAuth pendentes.'} icon={<Globe2 size={18} />} />
        <SummaryCard label="WhatsApp" value={overview.integrations.whatsapp.connected ? 'Conectado' : 'Pendente'} note={overview.integrations.whatsapp.configured ? 'Canal oficial pronto para conexão.' : 'App, segredo ou webhook pendentes.'} icon={<MessageCircle size={18} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="space-y-4">
          <SectionCard eyebrow="Google Calendar" title="Sincronização da agenda externa" description={overview.integrations.googleCalendar.connected ? (overview.integrations.googleCalendar.expiresAt ? `Conta conectada. Expiração atual: ${new Date(overview.integrations.googleCalendar.expiresAt).toLocaleString('pt-BR')}.` : 'Conta conectada. O token atual não expõe expiração neste retorno.') : 'Use o acesso abaixo para autorizar sua conta Google e preparar a sincronização do calendário.'} visible={visibility.google} onToggle={() => toggleSection('google')} status={<><StatusPill ok={overview.integrations.googleCalendar.configured} label={overview.integrations.googleCalendar.configured ? 'OAuth configurado' : 'OAuth pendente'} /><StatusPill ok={overview.integrations.googleCalendar.connected} label={overview.integrations.googleCalendar.connected ? 'Conta conectada' : 'Sem conexão'} /></>}>
            {!overview.integrations.googleCalendar.configured ? <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">O botão de conexão só habilita quando a API tiver client id, secret e redirect URI válidos.</div> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard label="Calendar ID" value={maskValue(overview.integrations.googleCalendar.calendarId, visibility.google)} note="Identificador usado para sincronizar eventos." />
              <InfoCard label="Refresh token" value={overview.integrations.googleCalendar.hasRefreshToken ? 'Disponível' : 'Não disponível'} note="Indica se o ambiente consegue renovar a autorização." />
              <div className="md:col-span-2">
                <InfoCard label="Redirect URI" value={maskValue(overview.environment.googleRedirectUri, visibility.google)} breakAll note="URL usada no retorno do OAuth do Google." />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleGoogleConnect()} disabled={googleBusy !== null || !overview.integrations.googleCalendar.configured} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                {googleBusy === 'connect' ? <Loader2 size={15} className="animate-spin" /> : <Globe2 size={15} />}
                Acessar com sua conta Google
                <ExternalLink size={14} className="opacity-60" />
              </button>
              <button type="button" onClick={() => void handleGoogleDisconnect()} disabled={googleBusy !== null || !overview.integrations.googleCalendar.connected} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                {googleBusy === 'disconnect' ? <Loader2 size={15} className="animate-spin" /> : <Unlink2 size={15} />}
                Desconectar Google
              </button>
            </div>
          </SectionCard>

          <SectionCard eyebrow="WhatsApp Business" title="Canal oficial para disparos e status reais" description={overview.integrations.whatsapp.connected ? `Canal conectado no número ${overview.integrations.whatsapp.displayPhoneNumber ?? 'comercial'} para uso pelo backend/API.` : 'Conecte o número comercial pelo Embedded Signup oficial da Meta. O CRM não usa WhatsApp Web nem sessão local.'} visible={visibility.whatsapp} onToggle={() => toggleSection('whatsapp')} status={<><StatusPill ok={overview.integrations.whatsapp.configured} label={overview.integrations.whatsapp.configured ? 'App configurado' : 'App pendente'} /><StatusPill ok={overview.integrations.whatsapp.connected} label={overview.integrations.whatsapp.connected ? 'Canal conectado' : 'Sem conexão'} /></>}>
            {!overview.integrations.whatsapp.configured ? (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                Faltam variáveis para o canal oficial: {overview.integrations.whatsapp.missingConfiguration.join(', ')}.
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard label="Número comercial" value={maskValue(overview.integrations.whatsapp.displayPhoneNumber, visibility.whatsapp)} note="Número empresarial conectado ao backend." />
              <InfoCard label="Nome verificado" value={maskValue(overview.integrations.whatsapp.verifiedName, visibility.whatsapp)} note="Identidade retornada pela Meta para o número." />
              <InfoCard label="Phone number ID" value={maskValue(overview.integrations.whatsapp.phoneNumberId, visibility.whatsapp)} breakAll note="Identificador oficial usado para envios pela API." />
              <InfoCard label="Business account ID" value={maskValue(overview.integrations.whatsapp.businessAccountId, visibility.whatsapp)} breakAll note="Conta empresarial/WABA vinculada no Embedded Signup." />
              <InfoCard label="Webhook" value={overview.integrations.whatsapp.webhookSubscribed ? 'Inscrito' : 'Pendente'} note={maskValue(overview.environment.whatsappWebhookPath, visibility.whatsapp)} />
              <InfoCard label="Graph API" value={overview.environment.whatsappGraphApiVersion} note={overview.integrations.whatsapp.qualityRating ? `Qualidade atual: ${overview.integrations.whatsapp.qualityRating}` : 'Versão usada para conexão e envio.'} />
            </div>
            {overview.integrations.whatsapp.lastError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
                Último erro: {overview.integrations.whatsapp.lastError}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleWhatsappConnect()} disabled={whatsappBusy !== null || !overview.integrations.whatsapp.configured} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                {whatsappBusy === 'connect' ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                Conectar canal oficial
                <ExternalLink size={14} className="opacity-60" />
              </button>
              <button type="button" onClick={() => void handleWhatsappDisconnect()} disabled={whatsappBusy !== null || !overview.integrations.whatsapp.connected} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                {whatsappBusy === 'disconnect' ? <Loader2 size={15} className="animate-spin" /> : <Unlink2 size={15} />}
                Desconectar canal
              </button>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Dados de e-mail" title="SMTP, remetente e notificações" description="As credenciais de envio ficam agrupadas em um único fluxo de manutenção, com leitura do banco e atualização imediata após salvar." visible={visibility.email} onToggle={() => toggleSection('email')} status={<><StatusPill ok={overview.integrations.email.configured} label={overview.integrations.email.configured ? 'SMTP pronto' : 'SMTP pendente'} /><StatusPill ok={overview.integrations.email.source === 'database'} label={overview.integrations.email.source === 'database' ? 'Editável no painel' : 'Lendo do ambiente'} /></>}>
            <div className="grid gap-3 md:grid-cols-3">
              <InfoCard label="Provider" value={overview.integrations.email.provider} />
              <InfoCard label="Origem" value={overview.integrations.email.source === 'database' ? 'Banco de dados' : 'Variáveis de ambiente'} />
              <InfoCard label="Senha SMTP" value={overview.integrations.email.passwordConfigured ? 'Configurada' : 'Não configurada'} />
            </div>
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm"><span className="font-medium text-slate-900 dark:text-slate-100">Host SMTP</span><input value={emailForm.host} onChange={(event) => updateEmailField('host', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder={maskValue(overview.integrations.email.host, visibility.email)} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-slate-900 dark:text-slate-100">Porta SMTP</span><input value={emailForm.port} onChange={(event) => updateEmailField('port', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="587" /></label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm"><span className="font-medium text-slate-900 dark:text-slate-100">Usuário SMTP</span><input value={emailForm.user} onChange={(event) => updateEmailField('user', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder={maskValue(overview.integrations.email.user, visibility.email)} /></label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Segurança</span>
                  <div className={crmFieldSelectWrapper}>
                    <select value={emailForm.secure ? 'true' : 'false'} onChange={(event) => updateEmailField('secure', event.target.value === 'true')} className={crmFieldSelect}>
                      <option value="false">STARTTLS / porta 587</option>
                      <option value="true">SSL/TLS / porta 465</option>
                    </select>
                    <ChevronDown size={16} className={crmFieldSelectIcon} />
                  </div>
                </label>
              </div>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-slate-100">Senha SMTP</span>
                <p style={{ fontSize: 11, color: 'var(--muted-foreground, #A09890)', margin: '2px 0 0', lineHeight: 1.4, fontWeight: 400 }}>Vazio preserva a senha atual</p>
                <input type="password" value={emailForm.password} onChange={(event) => updateEmailField('password', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder={overview.integrations.email.passwordConfigured ? (visibility.email ? 'Deixe em branco para manter a atual' : '****** senha configurada') : 'Digite a senha SMTP'} />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm"><span className="font-medium text-slate-900 dark:text-slate-100">E-mail remetente</span><input value={emailForm.from} onChange={(event) => updateEmailField('from', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder={maskValue(overview.integrations.email.from, visibility.email)} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-slate-900 dark:text-slate-100">Nome do remetente</span><input value={emailForm.fromName} onChange={(event) => updateEmailField('fromName', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder={maskValue(overview.integrations.email.fromName, visibility.email)} /></label>
              </div>
              <label className="space-y-2 text-sm"><span className="font-medium text-slate-900 dark:text-slate-100">E-mail administrativo</span><input value={emailForm.adminEmail} onChange={(event) => updateEmailField('adminEmail', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder={maskValue(overview.integrations.email.adminEmail, visibility.email)} /></label>
            </div>
             <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
               <button type="button" onClick={() => void handleEmailSave()} disabled={emailSaving} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                 {emailSaving ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                 Salvar dados de e-mail
               </button>
             </div>
             <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
               <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                 <label className="min-w-0 flex-1 space-y-2 text-sm">
                   <span className="font-medium text-slate-900 dark:text-slate-100">Destinatário do teste</span>
                   <input type="email" value={emailTestTo} onChange={(event) => setEmailTestTo(event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder={overview.integrations.email.adminEmail ?? 'usa o e-mail administrativo'} />
                   <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Deixe vazio para enviar ao e-mail administrativo configurado.</p>
                 </label>
                 <button type="button" onClick={() => void handleEmailTest()} disabled={emailTesting || !overview.integrations.email.configured} className="inline-flex items-center justify-center gap-2 rounded border border-[var(--primary)] bg-[var(--primary)] px-4 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60">
                   {emailTesting ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                   Enviar e-mail de teste
                 </button>
               </div>
             </div>
           </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard eyebrow="Ambiente" title="Configurações sensíveis" description="URLs, CORS e storage ficam concentrados em um resumo técnico mais direto." visible={visibility.environment} onToggle={() => toggleSection('environment')} status={<StatusPill ok={overview.environment.googleClientConfigured} label={overview.environment.googleClientConfigured ? 'Google client ativo' : 'Google client pendente'} />}>
            <div className="grid gap-3">
              <InfoCard label="API" value={maskValue(overview.environment.apiBaseUrl, visibility.environment)} breakAll />
              <InfoCard label="CRM" value={maskValue(overview.environment.crmUrl, visibility.environment)} breakAll />
              <InfoCard label="Google redirect URI" value={maskValue(overview.environment.googleRedirectUri, visibility.environment)} breakAll />
              <InfoCard label="WhatsApp App ID" value={maskValue(overview.environment.whatsappAppId, visibility.environment)} breakAll />
              <InfoCard label="WhatsApp Config ID" value={maskValue(overview.environment.whatsappEmbeddedSignupConfigId, visibility.environment)} breakAll />
              <InfoCard label="Storage" value={overview.infrastructure.storageDriver} note="Driver atual usado para uploads." />
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Origens liberadas em CORS</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{overview.environment.corsOrigins.length} origem(ns) configurada(s).</p>
                </div>
                <StatusPill ok={visibility.environment} label={visibility.environment ? 'Lista visível' : 'Lista oculta'} />
              </div>
              <div className="mt-4 space-y-2">
                {visibility.environment ? overview.environment.corsOrigins.map((origin) => (
                  <div key={origin} className="rounded border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 break-all dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{origin}</div>
                )) : (
                  <div className="rounded border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">A lista de origens está oculta. Abra a seção para exibir os valores completos.</div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
