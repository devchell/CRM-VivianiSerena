'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  Database,
  ExternalLink,
  Link2,
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
      from: string | null
      fromName: string | null
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

export default function AdministracaoPage() {
  const { accessToken, isAdmin } = useAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [googleBusy, setGoogleBusy] = useState<'connect' | 'disconnect' | null>(null)

  const headers = useMemo(() => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }), [accessToken])

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
            Integracoes, conexoes e configuracoes criticas do ambiente.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-charcoal-500 dark:text-charcoal-400">
            Esta area concentra o que somente o admin deve alterar: Google Calendar, status do e-mail transacional e leitura das dependencias do ambiente.
          </p>
        </div>

        <button
          onClick={() => void loadOverview()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blush-300 bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-blush dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-100 dark:hover:bg-charcoal-700"
        >
          <RefreshCw size={15} />
          Atualizar painel
        </button>
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
              <Link2 size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="card-dark rounded-[32px] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-gold">Google Calendar</p>
              <h2 className="mt-2 font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">
                Sincronizacao da agenda externa
              </h2>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <StatusPill ok={overview.integrations.googleCalendar.configured} label={overview.integrations.googleCalendar.configured ? 'OAuth configurado' : 'OAuth pendente'} />
              <StatusPill ok={overview.integrations.googleCalendar.connected} label={overview.integrations.googleCalendar.connected ? 'Conta conectada' : 'Sem conexao'} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blush-200 bg-cream/70 px-4 py-3 dark:border-charcoal-700 dark:bg-charcoal-800/70">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-400">Calendar ID</p>
              <p className="mt-2 text-sm font-medium text-charcoal dark:text-charcoal-100">{overview.integrations.googleCalendar.calendarId}</p>
            </div>
            <div className="rounded-2xl border border-blush-200 bg-cream/70 px-4 py-3 dark:border-charcoal-700 dark:bg-charcoal-800/70">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-400">Refresh token</p>
              <p className="mt-2 text-sm font-medium text-charcoal dark:text-charcoal-100">
                {overview.integrations.googleCalendar.hasRefreshToken ? 'Disponivel' : 'Nao disponivel'}
              </p>
            </div>
            <div className="rounded-2xl border border-blush-200 bg-cream/70 px-4 py-3 dark:border-charcoal-700 dark:bg-charcoal-800/70 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-400">Redirect URI</p>
              <p className="mt-2 break-all text-sm font-medium text-charcoal dark:text-charcoal-100">
                {overview.environment.googleRedirectUri ?? 'Nao configurado'}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-charcoal-500 dark:text-charcoal-400">
            {overview.integrations.googleCalendar.connected
              ? `Conectado. ${overview.integrations.googleCalendar.expiresAt ? `Expiracao atual: ${new Date(overview.integrations.googleCalendar.expiresAt).toLocaleString('pt-BR')}.` : 'Sem expiracao exposta pelo token atual.'}`
              : 'Use a conexao abaixo para autorizar uma conta Google pessoal ou profissional e sincronizar agendamentos com o calendario escolhido.'}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => void handleGoogleConnect()}
              disabled={googleBusy !== null || !overview.integrations.googleCalendar.configured}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-gold px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-gold/90 disabled:opacity-60"
            >
              {googleBusy === 'connect' ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
              Conectar Google
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
        </div>

        <div className="space-y-4">
          <div className="card-dark rounded-[32px] p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-gold">E-mail transacional</p>
                <h2 className="mt-2 font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">
                  Convites e notificacoes
                </h2>
              </div>
              <Mail size={18} className="text-rose-gold" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill ok={overview.integrations.email.configured} label={overview.integrations.email.configured ? 'SMTP pronto' : 'SMTP pendente'} />
            </div>

            <div className="mt-5 space-y-3 text-sm text-charcoal-500 dark:text-charcoal-400">
              <p><strong className="text-charcoal dark:text-charcoal-100">Provider:</strong> {overview.integrations.email.provider}</p>
              <p><strong className="text-charcoal dark:text-charcoal-100">Host:</strong> {overview.integrations.email.host ?? 'Nao configurado'}</p>
              <p><strong className="text-charcoal dark:text-charcoal-100">Porta:</strong> {overview.integrations.email.port ?? 'Nao configurada'}</p>
              <p><strong className="text-charcoal dark:text-charcoal-100">Seguranca:</strong> {overview.integrations.email.secure ? 'SSL/TLS' : 'STARTTLS/nao seguro'}</p>
              <p><strong className="text-charcoal dark:text-charcoal-100">Remetente:</strong> {overview.integrations.email.fromName ?? 'Sem nome'} {overview.integrations.email.from ? `<${overview.integrations.email.from}>` : ''}</p>
            </div>
          </div>

          <div className="card-dark rounded-[32px] p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-gold">Ambiente</p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">
              Configuracoes sensiveis
            </h2>

            <div className="mt-5 space-y-3 text-sm text-charcoal-500 dark:text-charcoal-400">
              <p><strong className="text-charcoal dark:text-charcoal-100">API:</strong> {overview.environment.apiBaseUrl}</p>
              <p><strong className="text-charcoal dark:text-charcoal-100">CRM:</strong> {overview.environment.crmUrl}</p>
              <p><strong className="text-charcoal dark:text-charcoal-100">Storage:</strong> {overview.infrastructure.storageDriver}</p>
              <p><strong className="text-charcoal dark:text-charcoal-100">CORS:</strong> {overview.environment.corsOrigins.length} origem(ns) liberada(s)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
