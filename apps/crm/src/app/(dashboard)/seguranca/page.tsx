'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, Users,
  Clock, CheckCircle2, XCircle, Info,
  RefreshCw, Bell, Download, Zap, Lock, Eye, Globe,
  ChevronDown, ChevronUp, X, Activity, Wifi, Server,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { crmPublicEnv } from '@/lib/public-env'
import {
  crmListBody,
  crmListEmpty,
  crmListRow,
  crmFieldSelectCompact,
  crmFieldSelectIcon,
  crmFieldSelectWrapper,
  crmListSelect,
  crmListSelectIcon,
  crmListSelectWrapper,
  crmListShell,
  crmListToolbar,
} from '@/components/ui/listStyles'

const API_URL = crmPublicEnv.apiBaseUrl

// ── Types ─────────────────────────────────────────────────────────────────────

interface SecurityEvent {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  sourceIp: string | null
  details: Record<string, unknown>
  resolved: boolean
  timestamp: string
}

interface SecurityStats {
  total: number
  unresolved: number
  critical24h: number
  bySeverity: { severity: string; count: number }[]
  byType: { type: string; count: number }[]
}

interface ActivityPoint {
  hour: string
  total: number
  blocked: number
}

interface ChecklistItem {
  id: string
  label: string
  ok: boolean
  warning?: boolean
  description: string
  daysLeft?: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  low:      { label: 'Baixo',    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-400/30',   dot: 'bg-blue-400'   },
  medium:   { label: 'Médio',    color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-400/30', dot: 'bg-yellow-400' },
  high:     { label: 'Alto',     color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-400/30', dot: 'bg-orange-400' },
  critical: { label: 'Crítico',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-400/30',    dot: 'bg-red-400'    },
} as const

const TYPE_HUMAN: Record<string, string> = {
  FAILED_LOGIN_ATTEMPT:    'Tentativa de login com senha incorreta',
  BRUTE_FORCE_LOCKED:      'Múltiplas tentativas de login — IP bloqueado',
  BRUTE_FORCE_LOCKOUT:     'IP bloqueado por excesso de tentativas',
  BOT_DETECTED:            'Acesso automatizado detectado e bloqueado',
  SCANNER_DETECTED:        'Ferramenta de varredura detectada e bloqueada',
  SQL_INJECTION_ATTEMPT:   'Tentativa de injeção SQL bloqueada',
  XSS_ATTEMPT:             'Tentativa de injeção de script bloqueada',
  IP_MANUALLY_BLOCKED:     'IP bloqueado manualmente pelo administrador',
  TEST_ALERT:              'Alerta de teste disparado pelo painel',
}

function humanizeType(type: string): string {
  return TYPE_HUMAN[type] ?? type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}

function computeStatus(events: SecurityEvent[]): 'green' | 'yellow' | 'red' {
  const recent = events.filter(e => !e.resolved && new Date(e.timestamp) > new Date(Date.now() - 24 * 3600_000))
  if (recent.some(e => e.severity === 'critical')) return 'red'
  if (recent.some(e => e.severity === 'high'))     return 'yellow'
  if (recent.some(e => e.severity === 'medium'))   return 'yellow'
  return 'green'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBanner({ status, lastCheck }: { status: 'green' | 'yellow' | 'red'; lastCheck: Date | null }) {
  const cfg = {
    green:  { icon: ShieldCheck, bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', msg: 'Seu site está seguro e funcionando normalmente', sub: 'Nenhuma ameaça ativa nas últimas 24 horas.' },
    yellow: { icon: ShieldAlert,  bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', msg: 'Atenção: atividade suspeita detectada', sub: 'Eventos de média ou alta prioridade requerem sua revisão.' },
    red:    { icon: ShieldX,      bg: 'bg-red-500/10 border-red-500/30',    text: 'text-red-400',    msg: 'Alerta: ameaça crítica ativa', sub: 'Eventos críticos não resolvidos nas últimas 24 horas. Ação necessária.' },
  }[status]
  const Icon = cfg.icon

  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-5 ${cfg.bg}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon size={32} className={cfg.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-heading text-lg font-bold ${cfg.text}`}>{cfg.msg}</p>
        <p className="text-sm text-charcoal-500 dark:text-charcoal-400 mt-0.5">{cfg.sub}</p>
      </div>
      {lastCheck && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-charcoal-400 dark:text-charcoal-500 flex-shrink-0">
          <Clock size={12} />
          Verificado {formatDistanceToNow(lastCheck, { locale: ptBR, addSuffix: true })}
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; bg: string
}) {
  return (
    <div className="card-dark p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg} mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{label}</p>
      <p className={`font-heading text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function ChecklistPanel({ items, loading }: { items: ChecklistItem[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-charcoal-100 dark:bg-charcoal-700/30 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {items.map(item => {
        const isOpen = expanded === item.id
        return (
          <div key={item.id} className="rounded-xl border border-blush-200 dark:border-charcoal-700 overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blush-50 dark:hover:bg-charcoal-700/30 transition-colors"
            >
              {item.ok ? (
                <CheckCircle2 size={16} className={item.warning ? 'text-yellow-400' : 'text-green-400'} />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
              <span className="text-sm text-charcoal dark:text-charcoal-100 flex-1">{item.label}</span>
              {item.warning && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium">Atenção</span>
              )}
              {isOpen ? <ChevronUp size={14} className="text-charcoal-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-charcoal-400 flex-shrink-0" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-3 pt-0">
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed">{item.description}</p>
                {item.id === 'ssl_expiry' && item.daysLeft !== undefined && item.daysLeft <= 30 && (
                  <p className="text-xs text-yellow-400 mt-1 font-medium">⚠️ Renovar em até {item.daysLeft} dias para evitar interrupção.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Event Details Modal ───────────────────────────────────────────────────────

function EventModal({ event, onClose }: { event: SecurityEvent; onClose: () => void }) {
  const sev = SEVERITY_CFG[event.severity]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-heading text-base font-bold text-charcoal dark:text-charcoal-50">Detalhes do Evento</h3>
            <p className="text-xs text-charcoal-400 mt-0.5">{format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-charcoal-400 hover:bg-blush dark:hover:bg-charcoal-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wide">Tipo</label>
            <p className="text-sm text-charcoal dark:text-charcoal-100 mt-1 font-mono bg-blush-50 dark:bg-charcoal-700/30 rounded-lg px-3 py-2">{event.type}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wide">Descrição</label>
            <p className="text-sm text-charcoal dark:text-charcoal-100 mt-1">{humanizeType(event.type)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wide">Severidade</label>
              <span className={`mt-1 inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${sev.color} ${sev.bg}`}>{sev.label}</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wide">Status</label>
              <p className="text-sm mt-1">{event.resolved ? <span className="text-green-400">Resolvido</span> : <span className="text-orange-400">Pendente</span>}</p>
            </div>
          </div>
          {event.sourceIp && (
            <div>
              <label className="text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wide">IP de Origem (anonimizado)</label>
              <p className="text-sm font-mono text-charcoal dark:text-charcoal-100 mt-1 bg-blush-50 dark:bg-charcoal-700/30 rounded-lg px-3 py-2">{event.sourceIp}</p>
            </div>
          )}
          {Object.keys(event.details).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wide">Informações Técnicas</label>
              <pre className="text-xs text-charcoal-500 dark:text-charcoal-400 mt-1 bg-blush-50 dark:bg-charcoal-700/30 rounded-lg px-3 py-2 overflow-auto max-h-32 whitespace-pre-wrap">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-xl bg-blush dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 text-sm font-medium hover:bg-blush-200 dark:hover:bg-charcoal-600 transition-colors">
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── Block IP Modal ────────────────────────────────────────────────────────────

function BlockIpModal({ onClose, onBlock }: {
  onClose: () => void
  onBlock: (ip: string, minutes: number) => Promise<void>
}) {
  const [ip, setIp] = useState('')
  const [minutes, setMinutes] = useState(60)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ip.trim()) return
    setLoading(true)
    await onBlock(ip.trim(), minutes)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base font-bold text-charcoal dark:text-charcoal-50">Bloquear IP</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-charcoal-400 hover:bg-blush dark:hover:bg-charcoal-700 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wide block mb-1.5">Endereço IP</label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="ex: 192.168.1.100"
              className="w-full px-3 py-2.5 rounded-xl border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
              pattern="^(\d{1,3}\.){3}\d{1,3}$"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wide block mb-1.5">Duração do Bloqueio</label>
            <div className={crmFieldSelectWrapper}>
              <select value={minutes} onChange={e => setMinutes(Number(e.target.value))} className={crmFieldSelectCompact}>
                <option value={15}>15 minutos</option>
                <option value={60}>1 hora</option>
                <option value={1440}>24 horas</option>
                <option value={10080}>7 dias</option>
                <option value={43200}>30 dias</option>
              </select>
              <ChevronDown size={15} className={crmFieldSelectIcon} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-blush-300 dark:border-charcoal-600 text-charcoal dark:text-charcoal-100 text-sm font-medium hover:bg-blush dark:hover:bg-charcoal-700 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
              Bloquear
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SegurancaPage() {
  const { accessToken, hasPermission } = useAuth()
  const canManageSecurity = hasPermission('seguranca.manage')
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [activity, setActivity] = useState<ActivityPoint[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [checklistLoading, setChecklistLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const socketRef = useRef<ReturnType<typeof import('socket.io-client').io> | null>(null)

  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])

  const fetchEvents = useCallback(async () => {
    if (!accessToken) return
    try {
      const params = new URLSearchParams({ hours: '48', limit: '100' })
      if (severityFilter) params.set('severity', severityFilter)
      const res = await fetch(`${API_URL}/api/v1/security/events?${params}`, { headers })
      if (res.ok) {
        const d = await res.json() as { data: SecurityEvent[] }
        setEvents(d.data ?? [])
        setLastCheck(new Date())
      }
    } catch { /* silent */ }
  }, [accessToken, headers, severityFilter])

  const fetchStats = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/security/stats`, { headers })
      if (res.ok) { const d = await res.json() as { data: SecurityStats }; setStats(d.data) }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [accessToken, headers])

  const fetchActivity = useCallback(async () => {
    if (!accessToken) return
    setActivityLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/security/activity`, { headers })
      if (res.ok) { const d = await res.json() as { data: ActivityPoint[] }; setActivity(d.data ?? []) }
    } catch { /* silent */ } finally { setActivityLoading(false) }
  }, [accessToken, headers])

  const fetchChecklist = useCallback(async () => {
    if (!accessToken) return
    setChecklistLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/security/checklist`, { headers })
      if (res.ok) { const d = await res.json() as { data: ChecklistItem[] }; setChecklist(d.data ?? []) }
    } catch { /* silent */ } finally { setChecklistLoading(false) }
  }, [accessToken, headers])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchEvents(), fetchStats(), fetchActivity(), fetchChecklist()])
  }, [fetchEvents, fetchStats, fetchActivity, fetchChecklist])

  // Auto-refresh every 30s
  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30_000)
    return () => clearInterval(interval)
  }, [fetchAll])

  // Socket.io real-time alerts
  useEffect(() => {
    if (!accessToken) return
    const connectSocket = async () => {
      const { io } = await import('socket.io-client')
      const socket = io(API_URL, {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnectionAttempts: 5,
      })
      socketRef.current = socket

      socket.on('security_alert', (data: { type: string; severity: string; message: string; id: string }) => {
        const isHigh = ['high', 'critical'].includes(data.severity)
        const sevLabel = { low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico' }[data.severity] ?? data.severity

        // Play soft audio alert for high/critical
        if (isHigh) {
          try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.frequency.value = 440; osc.type = 'sine'
            gain.gain.setValueAtTime(0.1, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
            osc.start(); osc.stop(ctx.currentTime + 0.8)
          } catch { /* ignore audio errors */ }
        }

        // Toast (persistent for high/critical)
        const toastFn = isHigh ? toast.error : toast.warning
        toastFn(`🛡️ ${humanizeType(data.type)} — Severidade: ${sevLabel}`, {
          duration: isHigh ? Infinity : 8000,
          action: { label: 'Ver', onClick: fetchAll },
        })

        // Browser notification for HIGH/CRITICAL
        if (isHigh && notifPermission === 'granted') {
          new Notification('⚠️ Alerta de Segurança — Viviani CRM', {
            body: humanizeType(data.type),
            icon: '/favicon.ico',
          })
        }

        fetchAll()
      })
    }
    connectSocket()
    return () => { socketRef.current?.disconnect() }
  }, [accessToken, notifPermission, fetchAll])

  // Request browser notification permission
  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') toast.success('Notificações do navegador ativadas!')
  }

  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission)
  }, [])

  const handleResolve = async (id: string) => {
    if (!canManageSecurity) return
    try {
      const res = await fetch(`${API_URL}/api/v1/security/events/${id}/resolve`, { method: 'PATCH', headers })
      if (res.ok) {
        toast.success('Evento marcado como resolvido')
        setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e))
      }
    } catch { toast.error('Erro ao resolver evento') }
  }

  const handleBlockIp = async (ip: string, minutes: number) => {
    if (!canManageSecurity) return
    try {
      const res = await fetch(`${API_URL}/api/v1/security/block-ip`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, ttlMinutes: minutes }),
      })
      if (res.ok) {
        const d = await res.json() as { message: string }
        toast.success(d.message ?? `IP ${ip} bloqueado`)
      } else {
        toast.error('Endereço IP inválido')
      }
    } catch { toast.error('Erro ao bloquear IP') }
  }

  const handleTestAlert = async () => {
    if (!canManageSecurity) return
    try {
      await fetch(`${API_URL}/api/v1/security/test-alert`, { method: 'POST', headers })
      toast.info('Alerta de teste disparado — aguarde alguns segundos')
    } catch { toast.error('Erro ao disparar alerta de teste') }
  }

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('Relatório de Segurança — Viviani Serena', 14, 18)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 26)
      doc.text(`Período: últimas 48 horas`, 14, 32)

      // Stats summary
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Resumo', 14, 44)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Total de eventos (7d): ${stats?.total ?? 0}`, 14, 52)
      doc.text(`Não resolvidos: ${stats?.unresolved ?? 0}`, 14, 58)
      doc.text(`Críticos (24h): ${stats?.critical24h ?? 0}`, 14, 64)

      // Events table
      autoTable(doc, {
        startY: 74,
        head: [['Data/Hora', 'Evento', 'Severidade', 'IP', 'Status']],
        body: events.slice(0, 50).map(e => [
          format(new Date(e.timestamp), 'dd/MM HH:mm'),
          humanizeType(e.type).substring(0, 40),
          SEVERITY_CFG[e.severity]?.label ?? e.severity,
          e.sourceIp ?? '—',
          e.resolved ? 'Resolvido' : 'Pendente',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [201, 150, 122] },
        alternateRowStyles: { fillColor: [250, 248, 246] },
      })

      doc.save(`seguranca-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`)
      toast.success('Relatório PDF gerado!')
    } catch { toast.error('Erro ao gerar PDF') }
  }

  // Computed values
  const status = computeStatus(events)
  const unresolvedCount = events.filter(e => !e.resolved).length
  const blocked24h = events.filter(e => new Date(e.timestamp) > new Date(Date.now() - 86400_000) && ['high', 'critical'].includes(e.severity)).length
  const checklistOk = checklist.filter(i => i.ok && !i.warning).length
  const checklistTotal = checklist.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">Segurança</h1>
          <p className="text-charcoal-400 dark:text-charcoal-400 mt-1 text-sm">Monitoramento em tempo real · Atualiza a cada 30 segundos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {notifPermission !== 'granted' && (
            <button onClick={requestNotifications} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-blush-300 dark:border-charcoal-600 text-charcoal-400 hover:text-rose-gold hover:border-rose-gold/30 transition-colors">
              <Bell size={14} /> Ativar alertas
            </button>
          )}
          <button onClick={() => setShowBlockModal(true)} disabled={!canManageSecurity} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-red-400/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Lock size={14} /> Bloquear IP
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-blush-300 dark:border-charcoal-600 text-charcoal-400 hover:text-rose-gold hover:border-rose-gold/30 transition-colors">
            <Download size={14} /> Exportar PDF
          </button>
          <button onClick={fetchAll} className="p-2 rounded-lg border border-blush-300 dark:border-charcoal-600 text-charcoal-400 hover:text-rose-gold transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Status Geral */}
      <StatusBanner status={status} lastCheck={lastCheck} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Users} label="Eventos (48h)" value={events.length}
          sub={`${unresolvedCount} pendentes`}
          color="text-blue-400" bg="bg-blue-500/10"
        />
        <KpiCard
          icon={Shield} label="Bloqueados (24h)" value={blocked24h}
          sub="ameaças neutralizadas"
          color="text-orange-400" bg="bg-orange-500/10"
        />
        <KpiCard
          icon={Server} label="Checklist segurança" value={`${checklistOk}/${checklistTotal}`}
          sub={checklistOk === checklistTotal ? 'tudo configurado' : 'itens atenção'}
          color={checklistOk === checklistTotal ? 'text-green-400' : 'text-yellow-400'}
          bg={checklistOk === checklistTotal ? 'bg-green-500/10' : 'bg-yellow-500/10'}
        />
        <KpiCard
          icon={Activity} label="Críticos (24h)" value={stats?.critical24h ?? 0}
          sub={stats?.critical24h === 0 ? 'nenhum evento crítico' : 'requer atenção!'}
          color={stats?.critical24h === 0 ? 'text-green-400' : 'text-red-400'}
          bg={stats?.critical24h === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Events Timeline */}
        <div className={`xl:col-span-2 ${crmListShell}`}>
          <div className={crmListToolbar}>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-charcoal-400" />
              <h3 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100">Eventos (últimas 48h)</h3>
            </div>
            <div className={crmListSelectWrapper}>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className={`${crmListSelect} h-11 min-w-[210px] text-xs`}
              >
                <option value="">Todas as severidades</option>
                {Object.entries(SEVERITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown size={16} className={crmListSelectIcon} />
            </div>
          </div>

          <div className={`${crmListBody} max-h-[520px] overflow-y-auto`}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 bg-blush-50 dark:bg-charcoal-700/20 animate-pulse m-4 rounded-lg" />
              ))
            ) : events.length === 0 ? (
              <div className={crmListEmpty}>
                <ShieldCheck size={36} className="text-green-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-charcoal dark:text-charcoal-100">Nenhum evento no período</p>
                <p className="text-xs text-charcoal-400 mt-1">Tudo está calmo por aqui.</p>
              </div>
            ) : events.map(ev => {
              const sev = SEVERITY_CFG[ev.severity] ?? SEVERITY_CFG.low
              const isRecent = new Date(ev.timestamp) > new Date(Date.now() - 3600_000)
              return (
                <div key={ev.id} className={`px-6 py-4 flex items-start gap-3 ${isRecent && !ev.resolved ? 'border-l-2 border-l-rose-gold bg-rose-gold/5 dark:bg-rose-gold/10' : crmListRow}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${sev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-charcoal dark:text-charcoal-100">{humanizeType(ev.type)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.color} ${sev.bg}`}>{sev.label}</span>
                      {ev.resolved && <span className="text-xs px-2 py-0.5 rounded-full text-green-400 bg-green-500/10 font-medium">Resolvido</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {ev.sourceIp && (
                        <span className="flex items-center gap-1 text-xs text-charcoal-400 dark:text-charcoal-500 font-mono">
                          <Globe size={10} />{ev.sourceIp}
                        </span>
                      )}
                      <span className="text-xs text-charcoal-400 dark:text-charcoal-500">
                        {formatDistanceToNow(new Date(ev.timestamp), { locale: ptBR, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setSelectedEvent(ev)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-blush-300 dark:border-charcoal-600 text-charcoal-400 hover:text-rose-gold hover:border-rose-gold/30 transition-colors"
                    >
                      <Eye size={12} />
                    </button>
                    {!ev.resolved && (
                      <button
                        onClick={() => handleResolve(ev.id)}
                        disabled={!canManageSecurity}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-blush-300 dark:border-charcoal-600 text-charcoal-400 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Checklist */}
          <div className="card-dark p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-rose-gold" />
              <h3 className="font-heading text-sm font-semibold text-charcoal dark:text-charcoal-100">Checklist de Segurança</h3>
            </div>
            <ChecklistPanel items={checklist} loading={checklistLoading} />
          </div>

          {/* Quick Actions */}
          <div className="card-dark p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-rose-gold" />
              <h3 className="font-heading text-sm font-semibold text-charcoal dark:text-charcoal-100">Ações Rápidas</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setShowBlockModal(true)}
                disabled={!canManageSecurity}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-400/20 text-red-400 hover:bg-red-500/10 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Lock size={16} />
                <div className="text-left">
                  <p className="font-medium">Bloquear IP</p>
                  <p className="text-xs text-red-400/60">Adiciona IP à lista negra</p>
                </div>
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-blush-300 dark:border-charcoal-600 text-charcoal dark:text-charcoal-100 hover:bg-blush-50 dark:hover:bg-charcoal-700/30 transition-colors text-sm"
              >
                <Download size={16} className="text-charcoal-400" />
                <div className="text-left">
                  <p className="font-medium">Exportar Relatório PDF</p>
                  <p className="text-xs text-charcoal-400">Últimas 48h em PDF</p>
                </div>
              </button>
              <button
                onClick={handleTestAlert}
                disabled={!canManageSecurity}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-400/20 text-blue-400 hover:bg-blue-500/10 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Wifi size={16} />
                <div className="text-left">
                  <p className="font-medium">Testar Alertas</p>
                  <p className="text-xs text-blue-400/60">Dispara evento de teste</p>
                </div>
              </button>
            </div>
          </div>

          {/* Type distribution */}
          {stats?.byType && stats.byType.length > 0 && (
            <div className="card-dark p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Info size={16} className="text-charcoal-400" />
                <h3 className="font-heading text-sm font-semibold text-charcoal dark:text-charcoal-100">Tipos (7 dias)</h3>
              </div>
              <div className="space-y-2.5">
                {stats.byType.slice(0, 5).map(t => {
                  const pct = stats.total > 0 ? Math.round(t.count / stats.total * 100) : 0
                  return (
                    <div key={t.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-charcoal-500 dark:text-charcoal-400 truncate max-w-[160px]">{humanizeType(t.type).substring(0, 28)}</span>
                        <span className="text-xs text-charcoal-400 font-medium ml-2">{t.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-charcoal-100 dark:bg-charcoal-700 overflow-hidden">
                        <div className="h-full rounded-full bg-rose-gold transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 24h Activity Chart */}
      <div className="card-dark p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Activity size={16} className="text-rose-gold" />
          <h3 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100">Atividade — Últimas 24 horas</h3>
          <span className="text-xs text-charcoal-400 dark:text-charcoal-500 ml-auto">Volume de acessos por hora</span>
        </div>
        {activityLoading ? (
          <div className="h-48 rounded-xl bg-blush-50 dark:bg-charcoal-700/20 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.08)" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 9, fill: '#787878' }}
                axisLine={false} tickLine={false}
                interval={3}
              />
              <YAxis tick={{ fontSize: 9, fill: '#787878' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(201,150,122,0.3)', background: 'rgba(255,255,255,0.95)' }}
                formatter={(v: number, name: string) => [v, name === 'total' ? 'Total de acessos' : 'Bloqueados']}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={v => v === 'total' ? 'Acessos normais' : 'Bloqueados'}
              />
              <ReferenceLine y={0} stroke="rgba(120,120,120,0.2)" />
              <Bar dataKey="total" name="total" fill="rgba(201,150,122,0.3)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="blocked" name="blocked" fill="rgba(239,68,68,0.6)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Modals */}
      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {showBlockModal && <BlockIpModal onClose={() => setShowBlockModal(false)} onBlock={handleBlockIp} />}
    </div>
  )
}
