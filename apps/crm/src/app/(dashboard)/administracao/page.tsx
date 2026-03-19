'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
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
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        ok
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-700'
      }`}
    >
      {ok ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
      {label}
    </span>
  )
}

function VisibilityToggle(props: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
        props.active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-blush-200 bg-white text-charcoal-500 hover:bg-blush dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-300 dark:hover:bg-charcoal-700'
      }`}
    >
      {props.active ? <Eye size={14} /> : <EyeOff size={14} />}
      {props.label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-6.9 0-.7-.1-1.4-.2-2H12z" />
      <path fill="#34A853" d="M12 21c2.6 0 4.8-.9 6.4-2.3l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.4-4H3.4v2.5C5 18.9 8.2 21 12 21z" />
      <path fill="#4A90E2" d="M6.6 13.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V6.7H3.4C2.8 8 2.5 9.5 2.5 11.2S2.8 14.4 3.4 15.7l3.2-2.5z" />
      <path fill="#FBBC05" d="M12 5.1c1.4 0 2.7.5 3.7 1.5l2.8-2.8C16.8 2.2 14.6 1.2 12 1.2c-3.8 0-7 2.1-8.6 5.5l3.2 2.5c.7-2.3 2.9-4.1 5.4-4.1z" />
    </svg>
  )
}

function InfoCard(props: {
  label: string
  value: string
  breakAll?: boolean
}) {
  return (
    <div className="rounded-2xl border border-blush-200 bg-cream/70 px-4 py-3 dark:border-charcoal-700 dark:bg-charcoal-800/70">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-400">{props.label}</p>
      <p className={`mt-2 text-sm font-medium text-charcoal dark:text-charcoal-100 ${props.breakAll ? 'break-all' : ''}`}>
        {props.value}
      </p>
    </div>
  )
}

function SectionCard(props: {
  eyebrow: string
  title: string
  description?: string
  visible: boolean
  onToggleVisibility: () => void
  status?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="card-dark rounded-[32px] p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-gold">{props.eyebrow}</p>
          <h2 className="mt-2 font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">
            {props.title}
          </h2>
          {props.description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">
              {props.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {props.status}
          <VisibilityToggle
            label={props.visible ? 'Ocultar dados' : 'Exibir dados'}
            active={props.visible}
            onClick={props.onToggleVisibility}
          />
        </div>
      </div>

      <div className="mt-5">{props.children}</div>
    </div>
  )
}

export default function AdministracaoPage() {
  const { accessToken, isAdmin } = useAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [googleBusy, setGoogleBusy] = useState<'connect' | 'disconnect' | null>(null)
  const [emailSaving, setEmailSaving] = useState(false)
  const [visibility, setVisibility] = useState<VisibilityState>({
    google: false,
    email: false,
    environment: false,
  })
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

  const headers = useMemo(() => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }), [accessToken])

  const allVisible = useMemo(
    () => Object.values(visibility).every(Boolean),
    [visibility]
  )

  const loadOverview = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const payload = await response.json() as { success: boolean; data?: AdminOverview; message?: string }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? 'Erro ao carregar administracao')
      }

      setOverview(payload.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar administracao')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    const googleStatus = searchParams.get('google')
    if (googleStatus === 'connected') {
      toast.success('Google Calendar conectado com sucesso')
      void loadOverview()
    }
    if (googleStatus === 'error') {
      toast.error('Nao foi possivel concluir a conexao com o Google Calendar')
      void loadOverview()
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

  function toggleSectionVisibility(section: VisibilitySection) {
    setVisibility((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  function toggleAllVisibility() {
    const nextValue = !allVisible
    setVisibility({
      google: nextValue,
      email: nextValue,
      environment: nextValue,
    })
  }

  function updateEmailField<K extends keyof EmailFormState>(field: K, value: EmailFormState[K]) {
    setEmailForm((current) => ({ ...current, [field]: value }))
  }

  function maskValue(value: string | null | undefined, visible: boolean) {
    if (!value) return 'Nao configurado'
    if (visible) return value

    if (value.length <= 8) {
      return '••••••••'
    }

    return `${value.slice(0, 3)}••••••${value.slice(-3)}`
  }

  async function handleGoogleConnect() {
    setGoogleBusy('connect')
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const payload = await response.json() as { success: boolean; data?: { authUrl: string }; message?: string }

      if (!response.ok || !payload.success || !payload.data?.authUrl) {
        throw new Error(payload.message ?? 'Nao foi possivel iniciar a conexao com o Google')
      }

      window.location.href = payload.data.authUrl
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao conectar Google Calendar')
      setGoogleBusy(null)
    }
  }

  async function handleGoogleDisconnect() {
    setGoogleBusy('disconnect')
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'DELETE',
        headers,
      })
      const payload = await response.json() as { success: boolean; message?: string }

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Erro ao desconectar Google Calendar')
      }

      toast.success(payload.message ?? 'Google Calendar desconectado')
      await loadOverview()
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

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Erro ao salvar dados de e-mail')
      }

      toast.success(payload.message ?? 'Dados de e-mail salvos com sucesso')
      setEmailForm((current) => ({ ...current, password: '' }))
      await loadOverview()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar dados de e-mail')
    } finally {
      setEmailSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <ShieldAlert size={34} className="mx-auto text-charcoal-300" />
          <p className="mt-3 text-sm text-charcoal-400">Acesso restrito a administradores.</p>
        </div>
      </div>
    )
  }

  if (loading || !overview) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-rose-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-blush-200 bg-[radial-gradient(circle_at_top_left,_rgba(201,150,122,0.16),_transparent_36%),linear-gradient(135deg,#fffdfb_0%,#fff7f1_52%,#fffdfb_100%)] px-6 py-6 shadow-[0_28px_80px_-42px_rgba(97,73,54,0.35)] dark:border-charcoal-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(201,150,122,0.18),_transparent_34%),linear-gradient(135deg,#171412_0%,#1e1a17_52%,#161311_100%)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-gold">Administracao</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">
            Integracoes, credenciais e configuracoes criticas.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">
            O painel foi reorganizado para concentrar conexoes externas, dados de e-mail e ambiente com controles de visualizacao por bloco.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => toggleAllVisibility()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-blush dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700"
          >
            {allVisible ? <EyeOff size={15} /> : <Eye size={15} />}
            {allVisible ? 'Ocultar tudo' : 'Mostrar tudo'}
          </button>
          <button
            onClick={() => void loadOverview()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-blush dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700"
          >
            <RefreshCw size={15} />
            Atualizar painel
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-dark rounded-[28px] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Banco</p>
              <p className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">
                {overview.infrastructure.database ? 'OK' : 'Falha'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Database size={18} />
            </div>
          </div>
        </div>

        <div className="card-dark rounded-[28px] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Redis</p>
              <p className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">
                {overview.infrastructure.redis ? 'OK' : 'Falha'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
              <Server size={18} />
            </div>
          </div>
        </div>

        <div className="card-dark rounded-[28px] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Uploads</p>
              <p className="mt-2 font-heading text-3xl font-bold text-charcoal dark:text-charcoal-50">
                {overview.infrastructure.uploads ? 'OK' : 'Falha'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
              <ExternalLink size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-blush-200 bg-white/80 p-5 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-900/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-gold">Visualizacao</p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">
              Controle rapido dos dados exibidos
            </h2>
            <p className="mt-2 text-sm text-charcoal-500 dark:text-charcoal-400">
              Cada area tem seu proprio controle, e voce tambem pode abrir ou fechar tudo de uma vez.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <VisibilityToggle
              label={visibility.google ? 'Google visivel' : 'Google oculto'}
              active={visibility.google}
              onClick={() => toggleSectionVisibility('google')}
            />
            <VisibilityToggle
              label={visibility.email ? 'E-mail visivel' : 'E-mail oculto'}
              active={visibility.email}
              onClick={() => toggleSectionVisibility('email')}
            />
            <VisibilityToggle
              label={visibility.environment ? 'Ambiente visivel' : 'Ambiente oculto'}
              active={visibility.environment}
              onClick={() => toggleSectionVisibility('environment')}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="space-y-4">
          <SectionCard
            eyebrow="Google Calendar"
            title="Sincronizacao da agenda externa"
            description={overview.integrations.googleCalendar.connected
              ? `Conectado. ${overview.integrations.googleCalendar.expiresAt ? `Expiracao atual: ${new Date(overview.integrations.googleCalendar.expiresAt).toLocaleString('pt-BR')}.` : 'Sem expiracao exposta pelo token atual.'}`
              : 'Use o acesso abaixo para entrar com sua conta Google e autorizar a sincronizacao do calendario e de futuras integracoes Google do sistema.'}
            visible={visibility.google}
            onToggleVisibility={() => toggleSectionVisibility('google')}
            status={(
              <>
                <StatusPill ok={overview.integrations.googleCalendar.configured} label={overview.integrations.googleCalendar.configured ? 'OAuth configurado' : 'OAuth pendente'} />
                <StatusPill ok={overview.integrations.googleCalendar.connected} label={overview.integrations.googleCalendar.connected ? 'Conta conectada' : 'Sem conexao'} />
              </>
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard
                label="Calendar ID"
                value={maskValue(overview.integrations.googleCalendar.calendarId, visibility.google)}
              />
              <InfoCard
                label="Refresh token"
                value={overview.integrations.googleCalendar.hasRefreshToken ? 'Disponivel' : 'Nao disponivel'}
              />
              <div className="md:col-span-2">
                <InfoCard
                  label="Redirect URI"
                  value={maskValue(overview.environment.googleRedirectUri, visibility.google)}
                  breakAll
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => void handleGoogleConnect()}
                disabled={googleBusy !== null || !overview.integrations.googleCalendar.configured}
                className="inline-flex items-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-blush disabled:opacity-60 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700"
              >
                {googleBusy === 'connect' ? <Loader2 size={15} className="animate-spin" /> : <GoogleIcon />}
                Acessar com sua conta Google
                <ExternalLink size={14} className="opacity-60" />
              </button>
              <button
                onClick={() => void handleGoogleDisconnect()}
                disabled={googleBusy !== null || !overview.integrations.googleCalendar.connected}
                className="inline-flex items-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-blush disabled:opacity-60 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700"
              >
                {googleBusy === 'disconnect' ? <Loader2 size={15} className="animate-spin" /> : <Unlink2 size={15} />}
                Desconectar Google
              </button>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Dados de e-mail"
            title="SMTP, remetente e notificacoes"
            description="As credenciais de envio ficam organizadas em um unico bloco, com leitura do banco e atualizacao imediata apos salvar."
            visible={visibility.email}
            onToggleVisibility={() => toggleSectionVisibility('email')}
            status={(
              <>
                <StatusPill ok={overview.integrations.email.configured} label={overview.integrations.email.configured ? 'SMTP pronto' : 'SMTP pendente'} />
                <StatusPill ok={overview.integrations.email.source === 'database'} label={overview.integrations.email.source === 'database' ? 'Editavel no painel' : 'Lendo do ambiente'} />
              </>
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard label="Provider" value={overview.integrations.email.provider} />
              <InfoCard
                label="Senha SMTP"
                value={overview.integrations.email.passwordConfigured ? 'Configurada' : 'Nao configurada'}
              />
            </div>

            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-charcoal dark:text-charcoal-100">Host SMTP</span>
                  <input
                    value={emailForm.host}
                    onChange={(event) => updateEmailField('host', event.target.value)}
                    className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"
                    placeholder={maskValue(overview.integrations.email.host, visibility.email)}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-charcoal dark:text-charcoal-100">Porta SMTP</span>
                  <input
                    value={emailForm.port}
                    onChange={(event) => updateEmailField('port', event.target.value)}
                    className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"
                    placeholder="587"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-charcoal dark:text-charcoal-100">Usuario SMTP</span>
                  <input
                    value={emailForm.user}
                    onChange={(event) => updateEmailField('user', event.target.value)}
                    className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"
                    placeholder={maskValue(overview.integrations.email.user, visibility.email)}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-charcoal dark:text-charcoal-100">Seguranca</span>
                  <select
                    value={emailForm.secure ? 'true' : 'false'}
                    onChange={(event) => updateEmailField('secure', event.target.value === 'true')}
                    className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"
                  >
                    <option value="false">STARTTLS / porta 587</option>
                    <option value="true">SSL/TLS / porta 465</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-charcoal dark:text-charcoal-100">Senha SMTP</span>
                <input
                  type="password"
                  value={emailForm.password}
                  onChange={(event) => updateEmailField('password', event.target.value)}
                  className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"
                  placeholder={overview.integrations.email.passwordConfigured
                    ? (visibility.email ? 'Deixe em branco para manter a atual' : '•••••••• senha configurada')
                    : 'Digite a senha SMTP'}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-charcoal dark:text-charcoal-100">E-mail remetente</span>
                  <input
                    value={emailForm.from}
                    onChange={(event) => updateEmailField('from', event.target.value)}
                    className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"
                    placeholder={maskValue(overview.integrations.email.from, visibility.email)}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-charcoal dark:text-charcoal-100">Nome do remetente</span>
                  <input
                    value={emailForm.fromName}
                    onChange={(event) => updateEmailField('fromName', event.target.value)}
                    className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"
                    placeholder={maskValue(overview.integrations.email.fromName, visibility.email)}
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-charcoal dark:text-charcoal-100">E-mail administrativo</span>
                <input
                  value={emailForm.adminEmail}
                  onChange={(event) => updateEmailField('adminEmail', event.target.value)}
                  className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-rose-gold dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-100"
                  placeholder={maskValue(overview.integrations.email.adminEmail, visibility.email)}
                />
              </label>
            </div>

            <p className="mt-4 text-xs leading-6 text-charcoal-400">
              Ao salvar aqui, o sistema passa a usar estes dados imediatamente. Se o campo de senha ficar vazio, a senha SMTP atual sera preservada.
            </p>

            <div className="mt-4">
              <button
                onClick={() => void handleEmailSave()}
                disabled={emailSaving}
                className="inline-flex items-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-blush disabled:opacity-60 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700"
              >
                {emailSaving ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                Salvar dados de e-mail
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            eyebrow="Ambiente"
            title="Configuracoes sensiveis"
            description="URLs, origem de CORS e driver de storage ficam consolidados em um unico resumo tecnico."
            visible={visibility.environment}
            onToggleVisibility={() => toggleSectionVisibility('environment')}
          >
            <div className="grid gap-3">
              <InfoCard
                label="API"
                value={maskValue(overview.environment.apiBaseUrl, visibility.environment)}
                breakAll
              />
              <InfoCard
                label="CRM"
                value={maskValue(overview.environment.crmUrl, visibility.environment)}
                breakAll
              />
              <InfoCard
                label="Storage"
                value={overview.infrastructure.storageDriver}
              />
              <InfoCard
                label="CORS liberado"
                value={`${overview.environment.corsOrigins.length} origem(ns)`}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
