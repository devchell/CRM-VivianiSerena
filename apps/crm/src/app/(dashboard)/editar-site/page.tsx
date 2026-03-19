'use client'

import Image from 'next/image'
import {
  useState, useEffect, useCallback, useRef, memo,
} from 'react'
import { useAuth } from '@/lib/useAuth'
import { toast } from 'sonner'
import {
  ChevronDown, Eye, EyeOff, Upload, X, Check,
  RefreshCw, Send, History, Plus, ExternalLink, Loader2, Link2, Star,
} from 'lucide-react'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { crmPublicEnv } from '@/lib/public-env'

const API_URL = crmPublicEnv.apiBaseUrl
const LANDING_URL = crmPublicEnv.landingUrl

type SectionKey = 'hero' | 'sobre' | 'resultados' | 'depoimentos'

interface SectionMeta { label: string; icon: string }
const SECTIONS: [SectionKey, SectionMeta][] = [
  ['hero',        { label: 'Inicio',       icon: '✨' }],
  ['sobre',       { label: 'Sobre',        icon: '👤' }],
  ['resultados',  { label: 'Resultados',   icon: '📸' }],
  ['depoimentos', { label: 'Depoimentos',  icon: '💬' }],
]

interface ContentStore { [section: string]: { [key: string]: unknown } }
interface SaveStatus { state: 'idle' | 'saving' | 'saved'; time?: string }
interface ResultEditorItem {
  id: string
  title: string
  text: string
  category: string
  beforeImage: string
  afterImage: string
}
interface TestimonialEditorItem {
  id: string
  name: string
  city: string
  service: string
  text: string
  stars: number
}
interface GoogleBusinessLocation {
  accountName: string
  accountId: string
  accountLabel: string
  locationName: string
  locationId: string
  title: string
  address: string
}
interface HistoryEntry {
  id: string
  section: string
  key: string
  value: unknown
  version: number
  reason: string
  savedAt: string
  author?: {
    id: string
    name: string | null
    email: string
  }
}

// ── Shared class strings ──────────────────────────────────────────────────────

const inputCls = [
  'w-full px-3 py-2 text-sm rounded-lg transition-colors',
  'border border-blush-200 dark:border-charcoal-600',
  'bg-white dark:bg-charcoal-900',
  'text-charcoal dark:text-charcoal-100',
  'placeholder-charcoal-300 dark:placeholder-charcoal-500',
  'focus:outline-none focus:ring-2 focus:ring-rose-gold/50 focus:border-rose-gold/50',
].join(' ')

const labelCls = 'block text-xs font-medium text-charcoal-500 dark:text-charcoal-400 mb-1.5'

// ── TextField ─────────────────────────────────────────────────────────────────

interface TextFieldProps {
  value: string
  onChange: (v: string) => void
  label: string
  multiline?: boolean
  rows?: number
  placeholder?: string
}

const TextField = memo(function TextField({ value: propValue, onChange, label, multiline, rows = 3, placeholder }: TextFieldProps) {
  const [local, setLocal] = useState(propValue)
  const prevProp = useRef(propValue)
  const isComposing = useRef(false)

  useEffect(() => {
    if (prevProp.current !== propValue && !isComposing.current) {
      setLocal(propValue)
      prevProp.current = propValue
    }
  }, [propValue])

  const handleChange = (v: string) => {
    isComposing.current = true
    setLocal(v)
    onChange(v)
    setTimeout(() => { isComposing.current = false }, 0)
  }

  return (
    <div>
      <label className={labelCls}>{label}</label>
      {multiline ? (
        <textarea
          rows={rows}
          value={local}
          placeholder={placeholder}
          onChange={e => handleChange(e.target.value)}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={local}
          placeholder={placeholder}
          onChange={e => handleChange(e.target.value)}
          className={inputCls}
        />
      )}
    </div>
  )
})

// ── ToggleField ───────────────────────────────────────────────────────────────

interface ToggleFieldProps {
  enabled: boolean
  onToggle: () => void
  label: string
  description?: string
}

const ToggleField = memo(function ToggleField({ enabled, onToggle, label, description }: ToggleFieldProps) {
  return (
    <div className="rounded-xl border border-blush-200 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-charcoal dark:text-charcoal-100 leading-snug">{label}</p>
          {description && (
            <p className="text-xs text-charcoal-400 mt-0.5 leading-snug">{description}</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          className={[
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-2',
            enabled ? 'bg-rose-gold' : 'bg-blush-300 dark:bg-charcoal-600',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={[
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm',
              'ring-0 transition-transform duration-200 ease-in-out',
              enabled ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>
      <div className={[
        'flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border-t',
        enabled
          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30'
          : 'text-charcoal-400 dark:text-charcoal-500 bg-blush/50 dark:bg-charcoal-800 border-blush-200 dark:border-charcoal-700',
      ].join(' ')}>
        {enabled
          ? <><Eye size={11} className="flex-shrink-0" /> Visível no site</>
          : <><EyeOff size={11} className="flex-shrink-0" /> Oculto no site</>
        }
      </div>
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────

export default function EditarSitePage() {
  const { accessToken } = useAuth()
  const { resolvedTheme } = useTheme()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const [expanded, setExpanded] = useState<SectionKey | null>('hero')
  const [content, setContent] = useState<ContentStore>({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: 'idle' })
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [restoringHistoryId, setRestoringHistoryId] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [googleLocations, setGoogleLocations] = useState<GoogleBusinessLocation[]>([])
  const [loadingGoogleLocations, setLoadingGoogleLocations] = useState(false)
  const [googleConnecting, setGoogleConnecting] = useState(false)

  const hdrs = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  // ── Fetch all content ──────────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/content`)
      if (!res.ok) return
      const data = await res.json() as { data: ContentStore }
      setContent(data.data ?? {})
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchContent() }, [fetchContent])

  // ── Get / set helpers ──────────────────────────────────────────────────────
  const get = (section: string, key: string): unknown =>
    content[section]?.[key] ?? null

  const getStr = useCallback((section: string, key: string, subkey?: string): string => {
    const v = content[section]?.[key]
    if (!v) return ''
    if (subkey && typeof v === 'object') return (v as Record<string, string>)[subkey] ?? ''
    if (typeof v === 'string') return v
    if (typeof v === 'object' && 'pt' in (v as object)) return (v as { pt: string }).pt ?? ''
    if (typeof v === 'object' && 'text' in (v as object)) return (v as { text: string }).text ?? ''
    return JSON.stringify(v)
  }, [content])

  const getBool = useCallback((section: string, key: string, subkey?: string): boolean => {
    const v = content[section]?.[key]
    if (!v) return false
    if (subkey && typeof v === 'object') return Boolean((v as Record<string, unknown>)[subkey])
    return Boolean(v)
  }, [content])

  const getArr = useCallback(<T,>(section: string, key: string): T[] => {
    const v = content[section]?.[key]
    return Array.isArray(v) ? (v as T[]) : []
  }, [content])

  const getNum = useCallback((section: string, key: string, subkey?: string): number => {
    const v = content[section]?.[key]
    if (!v) return 0
    if (subkey && typeof v === 'object' && v !== null) {
      const n = Number((v as Record<string, unknown>)[subkey])
      return Number.isFinite(n) ? n : 0
    }
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }, [content])

  const setVal = useCallback((section: string, key: string, value: unknown) => {
    setContent(prev => ({
      ...prev,
      [section]: { ...(prev[section] ?? {}), [key]: value },
    }))
    debounceSave(section, key, value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setSubVal = useCallback((section: string, key: string, subkey: string, val: unknown) => {
    setContent(prev => {
      const existing = prev[section]?.[key] ?? {}
      const newVal = typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>), [subkey]: val }
        : { [subkey]: val }
      debounceSave(section, key, newVal)
      return {
        ...prev,
        [section]: { ...(prev[section] ?? {}), [key]: newVal },
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchGoogleBusinessLocations = useCallback(async () => {
    if (!accessToken) return
    setLoadingGoogleLocations(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/google-business/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      const payload = await response.json() as { success: boolean; data?: GoogleBusinessLocation[]; message?: string }
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? 'Nao foi possivel carregar os perfis do Google Empresa')
      }

      setGoogleLocations(payload.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar perfis do Google Empresa')
    } finally {
      setLoadingGoogleLocations(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const googleStatus = url.searchParams.get('google')
    if (!googleStatus) return

    setGoogleConnecting(false)

    if (googleStatus === 'connected') {
      toast.success('Conta Google conectada com sucesso')
      fetchGoogleBusinessLocations()
    } else if (googleStatus === 'error') {
      toast.error('Nao foi possivel concluir a conexao com o Google')
    }

    url.searchParams.delete('google')
    const nextUrl = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}`
    window.history.replaceState({}, '', nextUrl)
  }, [fetchGoogleBusinessLocations])

  // ── Auto-save ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceSave = (section: string, key: string, value: unknown) => {
    const k = `${section}.${key}`
    clearTimeout(saveTimers.current[k])
    setSaveStatus({ state: 'saving' })
    saveTimers.current[k] = setTimeout(() => save(section, key, value), 1500)
  }

  const save = async (section: string, key: string, value: unknown) => {
    if (!accessToken) {
      setSaveStatus({ state: 'idle' })
      toast.error('Sessão expirada — faça login novamente')
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/content/${section}/${key}`, {
        method: 'PUT',
        headers: hdrs,
        body: JSON.stringify({ value }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string; message?: string }
        throw new Error(err.error ?? err.message ?? `HTTP ${res.status}`)
      }
      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      setSaveStatus({ state: 'saved', time })
      setTimeout(() => setSaveStatus({ state: 'idle' }), 3000)

      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = `${LANDING_URL}?t=${Date.now()}`
        }
      }, 300)
    } catch (err) {
      setSaveStatus({ state: 'idle' })
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  // ── Image upload ───────────────────────────────────────────────────────────
  const handleImageUpload = async (section: string, key: string, file: File) => {
    if (!accessToken) return
    const formData = new FormData()
    formData.append('file', file)
    setUploading(`${section}.${key}`)
    try {
      const res = await fetch(`${API_URL}/api/v1/content/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { data: { url: string; blur: string } }
      setVal(section, key, { url: data.data.url, blur: data.data.blur })
      toast.success('Imagem enviada com sucesso')
    } catch { toast.error('Erro ao enviar imagem') } finally { setUploading(null) }
  }

  const uploadStandaloneImage = async (file: File) => {
    if (!accessToken) throw new Error('Sessao expirada')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/api/v1/content/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Erro ao enviar imagem')
    }

    const data = await response.json() as { data: { url: string } }
    return data.data.url
  }

  const handleConnectGoogleAccount = async () => {
    if (!accessToken) return
    setGoogleConnecting(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/google?redirect=${encodeURIComponent('/editar-site?google=connected')}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const payload = await response.json() as { success: boolean; data?: { authUrl: string }; message?: string }
      if (!response.ok || !payload.success || !payload.data?.authUrl) {
        throw new Error(payload.message ?? 'Nao foi possivel iniciar a conexao com o Google')
      }

      window.location.href = payload.data.authUrl
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao conectar conta Google')
      setGoogleConnecting(false)
    }
  }

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    try {
      await fetch(`${API_URL}/api/v1/content/publish`, { method: 'POST', headers: hdrs })
      toast.success('Site atualizado com sucesso! ✨')
      setShowPublishModal(false)
    } catch { toast.error('Erro ao publicar') }
  }

  // ── History ────────────────────────────────────────────────────────────────

  // Image dropzone ─────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    if (!accessToken) {
      toast.error('Sessao expirada - faca login novamente')
      return
    }

    setLoadingHistory(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/content/history?limit=30`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json() as { success: true; data: HistoryEntry[] }
      setHistory(payload.data ?? [])
      setShowHistory(true)
    } catch {
      toast.error('Erro ao carregar historico de versoes')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleRestoreHistory = async (entry: HistoryEntry) => {
    if (!accessToken) {
      toast.error('Sessao expirada - faca login novamente')
      return
    }

    setRestoringHistoryId(entry.id)
    try {
      const response = await fetch(`${API_URL}/api/v1/content/history/${entry.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      await fetchContent()
      if (iframeRef.current) {
        iframeRef.current.src = `${LANDING_URL}?t=${Date.now()}`
      }
      toast.success(`Versao ${entry.version} restaurada com sucesso`)
      await fetchHistory()
    } catch {
      toast.error('Erro ao restaurar esta versao')
    } finally {
      setRestoringHistoryId(null)
    }
  }

  const ImageField = ({ section, fieldKey, label }: { section: string; fieldKey: string; label: string }) => {
    const val = get(section, fieldKey) as { url?: string } | null
    const isUp = uploading === `${section}.${fieldKey}`
    return (
      <div>
        <label className={labelCls}>{label}</label>
        <div
          className="border-2 border-dashed border-blush-200 dark:border-charcoal-600 rounded-xl p-4 text-center transition-colors hover:border-rose-gold/50 cursor-pointer relative bg-cream dark:bg-charcoal-900"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(section, fieldKey, f) }}
          onClick={() => {
            const inp = document.createElement('input')
            inp.type = 'file'; inp.accept = 'image/*'
            inp.onchange = (e: Event) => {
              const f = (e.target as HTMLInputElement).files?.[0]
              if (f) handleImageUpload(section, fieldKey, f)
            }
            inp.click()
          }}
        >
          {val?.url ? (
            <div className="relative group">
              <div className="relative h-28 w-full overflow-hidden rounded-lg">
                <Image
                  src={val.url}
                  alt={label}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 28rem"
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white text-xs font-medium">Clique para trocar</p>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {isUp
                ? <Loader2 size={24} className="mx-auto text-rose-gold animate-spin mb-2" />
                : <Upload size={24} className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-2" />}
              <p className="text-xs text-charcoal-400 dark:text-charcoal-400">{isUp ? 'Enviando...' : 'Arraste ou clique para enviar'}</p>
              <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-1">JPG, PNG ou WebP • até 10MB</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Section renderers ──────────────────────────────────────────────────────
  const renderSection = (key: SectionKey) => {
    switch (key) {
      case 'hero': return (
        <div className="space-y-4">
          <ToggleField
            enabled={getBool('hero', 'urgency_badge', 'enabled')}
            onToggle={() => setSubVal('hero', 'urgency_badge', 'enabled', !getBool('hero', 'urgency_badge', 'enabled'))}
            label="Badge de Urgência"
            description="Mostrar aviso de vagas limitadas no topo do site"
          />
          {getBool('hero', 'urgency_badge', 'enabled') && (
            <TextField
              key="urgency-text"
              value={getStr('hero', 'urgency_badge', 'text')}
              onChange={v => setSubVal('hero', 'urgency_badge', 'text', v)}
              label="Texto do badge"
            />
          )}
          <TextField
            key="hero-title"
            value={getStr('hero', 'title', 'pt') || getStr('hero', 'title')}
            onChange={v => setVal('hero', 'title', { pt: v })}
            label="Título Principal"
            multiline
          />
          <TextField
            key="hero-subtitle"
            value={getStr('hero', 'subtitle', 'pt') || getStr('hero', 'subtitle')}
            onChange={v => setVal('hero', 'subtitle', { pt: v })}
            label="Subtítulo"
            multiline
          />
          <TextField
            key="cta-text"
            value={getStr('hero', 'cta_primary', 'text')}
            onChange={v => setSubVal('hero', 'cta_primary', 'text', v)}
            label="Texto do Botão Principal"
          />
          <TextField
            key="cta-url"
            value={getStr('hero', 'cta_primary', 'url')}
            onChange={v => setSubVal('hero', 'cta_primary', 'url', v)}
            label="Link do Botão Principal"
            placeholder="#agendamento"
          />
          <ImageField section="hero" fieldKey="background_image" label="Imagem de Fundo" />
          <div className="space-y-3 rounded-xl border border-blush-200 bg-cream p-4 dark:border-charcoal-600 dark:bg-charcoal-700">
            <ToggleField
              enabled={getBool('contact', 'social_proof', 'enabled') || !get('contact', 'social_proof')}
              onToggle={() => setSubVal('contact', 'social_proof', 'enabled', !(getBool('contact', 'social_proof', 'enabled') || !get('contact', 'social_proof')))}
              label="Box lateral de prova social"
              description="Controla o card cinza com Clientes registrados e Avaliacoes publicas ao lado do formulario."
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                value={String(getNum('contact', 'social_proof', 'baseClients'))}
                onChange={v => setSubVal('contact', 'social_proof', 'baseClients', Number(v) || 0)}
                label="Base inicial de clientes"
                placeholder="0"
              />
              <TextField
                value={String(getNum('contact', 'social_proof', 'basePublicReviews'))}
                onChange={v => setSubVal('contact', 'social_proof', 'basePublicReviews', Number(v) || 0)}
                label="Base inicial de avaliacoes"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-charcoal-400 dark:text-charcoal-500">
              O site soma automaticamente os leads reais cadastrados para atualizar Clientes registrados.
            </p>
          </div>
        </div>
      )

      case 'sobre': return (
        <div className="space-y-4">
          <ImageField section="sobre" fieldKey="photo" label="Foto da Viviani (circular)" />
          <div>
            <label className={labelCls}>Texto Principal</label>
            <RichTextEditor
              value={getStr('about', 'bio', 'pt')}
              onChange={html => setSubVal('about', 'bio', 'pt', html)}
              placeholder="Escreva sobre Viviani Serena..."
            />
          </div>
          <div className="space-y-3">
            <label className={labelCls}>Destaques (3 pontos fortes)</label>
            {[1, 2, 3].map(i => (
              <TextField
                key={`highlight-${i}`}
                value={getStr('about', `highlight_${i}`)}
                onChange={v => setVal('about', `highlight_${i}`, v)}
                label={`Destaque ${i}`}
                placeholder="Ex: +10 anos de experiência"
              />
            ))}
          </div>
        </div>
      )

      case 'resultados': {
        const results = getArr<ResultEditorItem>('services', 'results_items')
        return (
          <div className="space-y-4">
            {results.map((item, idx) => (
              <div key={item.id || idx} className="space-y-3 rounded-xl border border-blush-200 bg-cream p-4 dark:border-charcoal-600 dark:bg-charcoal-700">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-charcoal dark:text-charcoal-100">Resultado {idx + 1}</p>
                  <button
                    type="button"
                    onClick={() => setVal('services', 'results_items', results.filter((_, index) => index !== idx))}
                    className="rounded p-1 text-charcoal-400 transition-colors hover:text-red-400"
                  >
                    <X size={13} />
                  </button>
                </div>

                <TextField
                  value={item.title}
                  onChange={v => {
                    const updated = [...results]
                    updated[idx] = { ...item, title: v }
                    setVal('services', 'results_items', updated)
                  }}
                  label="Titulo"
                />
                <TextField
                  value={item.text}
                  onChange={v => {
                    const updated = [...results]
                    updated[idx] = { ...item, text: v }
                    setVal('services', 'results_items', updated)
                  }}
                  label="Texto"
                  multiline
                  rows={2}
                />
                <TextField
                  value={item.category}
                  onChange={v => {
                    const updated = [...results]
                    updated[idx] = { ...item, category: v }
                    setVal('services', 'results_items', updated)
                  }}
                  label="Categoria"
                  placeholder="Ex: Sobrancelhas"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className={labelCls}>Antes</label>
                    <div className="relative h-24 overflow-hidden rounded-lg border border-blush-200 bg-white dark:border-charcoal-600 dark:bg-charcoal-800">
                      {item.beforeImage ? (
                        <Image src={item.beforeImage} alt={`Antes ${item.title || idx + 1}`} fill unoptimized className="object-cover" sizes="14rem" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-charcoal-400">Sem imagem</div>
                      )}
                    </div>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blush-200 px-3 py-2 text-xs text-charcoal-400 transition-colors hover:border-rose-gold/50 hover:text-rose-gold dark:border-charcoal-600">
                      <Upload size={14} /> Adicionar imagem
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          try {
                            const imageUrl = await uploadStandaloneImage(file)
                            const updated = [...results]
                            updated[idx] = { ...item, beforeImage: imageUrl }
                            setVal('services', 'results_items', updated)
                          } catch {
                            toast.error('Erro ao enviar imagem do antes')
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className={labelCls}>Depois</label>
                    <div className="relative h-24 overflow-hidden rounded-lg border border-blush-200 bg-white dark:border-charcoal-600 dark:bg-charcoal-800">
                      {item.afterImage ? (
                        <Image src={item.afterImage} alt={`Depois ${item.title || idx + 1}`} fill unoptimized className="object-cover" sizes="14rem" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-charcoal-400">Sem imagem</div>
                      )}
                    </div>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blush-200 px-3 py-2 text-xs text-charcoal-400 transition-colors hover:border-rose-gold/50 hover:text-rose-gold dark:border-charcoal-600">
                      <Upload size={14} /> Adicionar imagem
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          try {
                            const imageUrl = await uploadStandaloneImage(file)
                            const updated = [...results]
                            updated[idx] = { ...item, afterImage: imageUrl }
                            setVal('services', 'results_items', updated)
                          } catch {
                            toast.error('Erro ao enviar imagem do depois')
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setVal('services', 'results_items', [
                ...results,
                {
                  id: `result-${Date.now()}`,
                  title: '',
                  text: '',
                  category: '',
                  beforeImage: '',
                  afterImage: '',
                },
              ])}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blush-200 py-2.5 text-sm text-charcoal-400 transition-colors hover:border-rose-gold/50 hover:text-rose-gold dark:border-charcoal-600"
            >
              <Plus size={14} /> Adicionar resultado
            </button>
          </div>
        )
      }

      case 'depoimentos': {
        const testimonials = getArr<TestimonialEditorItem>('testimonials', 'manual_items')
        const linkedLocations = getArr<GoogleBusinessLocation>('testimonials', 'google_business_locations')
        const googleEnabled = getBool('testimonials', 'display_options', 'googleEnabled')
        const artificialEnabled = getBool('testimonials', 'display_options', 'artificialEnabled')
        const availableLocations = googleLocations.filter((location) => (
          !linkedLocations.some((linked) => (
            linked.accountName === location.accountName
            && linked.locationId === location.locationId
          ))
        ))
        const itemInputCls = 'w-full px-2.5 py-1.5 text-xs rounded-lg border border-blush-200 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-1 focus:ring-rose-gold/40'
        return (
          <div className="space-y-4">
            <ToggleField
              enabled={artificialEnabled}
              onToggle={() => setSubVal('testimonials', 'display_options', 'artificialEnabled', !artificialEnabled)}
              label="Gerar depoimentos artificiais"
              description="Preenche a secao com alguns depoimentos fixos de exemplo para deixar a vitrine mais completa."
            />

            <ToggleField
              enabled={googleEnabled}
              onToggle={() => setSubVal('testimonials', 'display_options', 'googleEnabled', !googleEnabled)}
              label="Exibir avaliacoes do Google Empresa"
              description="Permite puxar reviews publicos das contas vinculadas do Google Business Profile."
            />

            {googleEnabled && (
              <div className="space-y-3 rounded-xl border border-blush-200 bg-cream p-4 dark:border-charcoal-600 dark:bg-charcoal-700">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConnectGoogleAccount}
                    disabled={googleConnecting}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-gold px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-gold/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {googleConnecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    Vincular sua conta do Google
                  </button>
                  <button
                    type="button"
                    onClick={fetchGoogleBusinessLocations}
                    disabled={loadingGoogleLocations}
                    className="inline-flex items-center gap-2 rounded-xl border border-blush-200 px-3 py-2 text-xs font-semibold text-charcoal-500 transition-colors hover:border-rose-gold/40 hover:text-rose-gold disabled:cursor-not-allowed disabled:opacity-70 dark:border-charcoal-600 dark:text-charcoal-300"
                  >
                    {loadingGoogleLocations ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Buscar perfis do Google Empresa
                  </button>
                </div>

                <p className="text-xs text-charcoal-400 dark:text-charcoal-500">
                  Voce pode vincular varias contas e selecionar mais de um perfil empresarial para alimentar a secao de depoimentos.
                </p>

                {linkedLocations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-400 dark:text-charcoal-500">
                      Perfis vinculados
                    </p>
                    {linkedLocations.map((location) => (
                      <div
                        key={`${location.accountName}-${location.locationId}`}
                        className="flex items-start justify-between gap-3 rounded-xl border border-blush-200 bg-white p-3 dark:border-charcoal-600 dark:bg-charcoal-800"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-charcoal dark:text-charcoal-100">{location.title}</p>
                          <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{location.accountLabel}</p>
                          {location.address && (
                            <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-500">{location.address}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setVal(
                            'testimonials',
                            'google_business_locations',
                            linkedLocations.filter((item) => !(
                              item.accountName === location.accountName
                              && item.locationId === location.locationId
                            ))
                          )}
                          className="rounded p-1 text-charcoal-400 transition-colors hover:text-red-400"
                          title="Remover perfil"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-400 dark:text-charcoal-500">
                    Perfis disponiveis para adicionar
                  </p>

                  {availableLocations.length > 0 ? (
                    availableLocations.map((location) => (
                      <div
                        key={`${location.accountName}-${location.locationId}`}
                        className="flex items-start justify-between gap-3 rounded-xl border border-blush-200 bg-white p-3 dark:border-charcoal-600 dark:bg-charcoal-800"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-charcoal dark:text-charcoal-100">{location.title}</p>
                          <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{location.accountLabel}</p>
                          {location.address && (
                            <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-500">{location.address}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setVal('testimonials', 'google_business_locations', [...linkedLocations, location])}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blush-200 px-2.5 py-1.5 text-xs font-medium text-charcoal-500 transition-colors hover:border-rose-gold/40 hover:text-rose-gold dark:border-charcoal-600 dark:text-charcoal-300"
                        >
                          <Plus size={12} /> Adicionar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-blush-200 px-3 py-4 text-center text-xs text-charcoal-400 dark:border-charcoal-600 dark:text-charcoal-500">
                      {loadingGoogleLocations
                        ? 'Buscando perfis do Google Empresa...'
                        : 'Nenhum novo perfil encontrado. Use o botao acima para buscar novamente apos vincular a conta.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-400 dark:text-charcoal-500">
                Depoimentos manuais
              </p>
            {testimonials.map((t, idx) => (
              <div key={t.id || idx} className="relative space-y-2.5 rounded-xl border border-blush-200 bg-cream p-4 dark:border-charcoal-600 dark:bg-charcoal-700">
                <button
                  type="button"
                  onClick={() => setVal('testimonials', 'manual_items', testimonials.filter((_, i) => i !== idx))}
                  className="absolute top-3 right-3 rounded p-1 text-charcoal-400 transition-colors hover:text-red-400"
                ><X size={13} /></button>
                <div className="space-y-2 pr-6">
                  {(['name', 'city', 'service'] as const).map(f => (
                    <input key={f} value={t[f] ?? ''}
                      placeholder={f === 'name' ? 'Nome' : f === 'city' ? 'Cidade' : 'Serviço realizado'}
                      onChange={e => {
                        const u = [...testimonials]
                        u[idx] = { ...t, [f]: e.target.value }
                        setVal('testimonials', 'manual_items', u)
                      }}
                      className={itemInputCls}
                    />
                  ))}
                  <textarea rows={3} value={t.text} placeholder="Depoimento"
                    onChange={e => {
                      const u = [...testimonials]
                      u[idx] = { ...t, text: e.target.value }
                        setVal('testimonials', 'manual_items', u)
                    }}
                    className={`${itemInputCls} resize-none`}
                  />
                  <div>
                    <label className={labelCls}>Nota</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={t.stars || 5}
                        onChange={e => {
                          const nextValue = Math.max(1, Math.min(5, Number(e.target.value) || 5))
                          const u = [...testimonials]
                          u[idx] = { ...t, stars: nextValue }
                          setVal('testimonials', 'manual_items', u)
                        }}
                        className={`${itemInputCls} max-w-[84px]`}
                      />
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: Math.max(1, Math.min(5, t.stars || 5)) }).map((_, starIndex) => (
                          <Star key={starIndex} size={13} className="fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
            <button
              type="button"
              onClick={() => setVal('testimonials', 'manual_items', [
                ...testimonials,
                {
                  id: `testimonial-${Date.now()}`,
                  name: '',
                  city: '',
                  service: '',
                  text: '',
                  stars: 5,
                },
              ])}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-blush-200 dark:border-charcoal-600 text-charcoal-400 hover:text-rose-gold hover:border-rose-gold/50 transition-colors text-sm"
            >
              <Plus size={14} /> Adicionar depoimento
            </button>
          </div>
        )
      }

      default: return null
    }
  }

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px-48px)] gap-0 -m-6 overflow-hidden">
        <div className="w-96 flex-shrink-0 border-r border-blush-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 flex flex-col">
          <div className="px-5 py-4 border-b border-blush-200 dark:border-charcoal-700 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-blush-200 dark:bg-charcoal-700 rounded animate-pulse" />
              <div className="h-3 w-16 bg-blush-200 dark:bg-charcoal-700 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-blush-200 dark:bg-charcoal-700 rounded-lg animate-pulse" />
          </div>
          <div className="flex-1 p-3 space-y-2">
            {SECTIONS.map(([k]) => (
              <div key={k} className="h-12 bg-blush-100 dark:bg-charcoal-700/60 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 bg-cream dark:bg-charcoal-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-rose-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px-48px)] gap-0 -m-6 overflow-hidden">
      {/* ── Left Panel ───────────────────────────────────────────────────── */}
      <div className={`w-96 flex-shrink-0 flex flex-col border-r border-blush-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-900${resolvedTheme === 'dark' ? ' dark' : ''}`}>

        {/* Panel header */}
        <div className="px-5 py-4 border-b border-blush-200 dark:border-charcoal-700 bg-cream dark:bg-charcoal-800 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-50">Editar Site</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {saveStatus.state === 'saving' && (
                <><Loader2 size={11} className="animate-spin text-charcoal-400" /><span className="text-xs text-charcoal-400 dark:text-charcoal-500">Salvando...</span></>
              )}
              {saveStatus.state === 'saved' && (
                <><Check size={11} className="text-green-500" /><span className="text-xs text-charcoal-400 dark:text-charcoal-500">Salvo às {saveStatus.time}</span></>
              )}
              {saveStatus.state === 'idle' && (
                <span className="text-xs text-charcoal-400 dark:text-charcoal-600">Auto-save ativo</span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={fetchHistory}
              className="p-2 rounded-lg text-charcoal-400 hover:text-rose-gold hover:bg-blush dark:hover:bg-charcoal-700 transition-colors"
              title="Histórico"
            >
              <History size={16} />
            </button>
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-gold text-white text-xs font-semibold rounded-lg hover:bg-rose-gold/90 transition-colors"
            >
              <Send size={13} /> Publicar
            </button>
          </div>
        </div>

        {/* Section accordion */}
        <div className="flex-1 overflow-y-auto">
          {SECTIONS.map(([key, meta]) => (
            <div key={key} className="border-b border-blush-100 dark:border-charcoal-700">
              <button
                onClick={() => setExpanded(prev => prev === key ? null : key)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                  expanded === key
                    ? 'bg-rose-gold/10 border-l-2 border-l-rose-gold'
                    : 'hover:bg-blush dark:hover:bg-charcoal-700/30 border-l-2 border-l-transparent'
                }`}
              >
                <span className="text-sm">{meta.icon}</span>
                <span className={`flex-1 text-sm font-semibold ${expanded === key ? 'text-rose-gold' : 'text-charcoal dark:text-charcoal-200'}`}>
                  {meta.label}
                </span>
                <motion.div
                  animate={{ rotate: expanded === key ? 0 : -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} className="text-charcoal-400 dark:text-charcoal-500" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {expanded === key && (
                  <motion.div
                    key={`body-${key}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-3 space-y-3 bg-white dark:bg-charcoal-800">
                      {renderSection(key)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: iframe preview ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-cream dark:bg-charcoal-900">
        <div className="h-10 flex items-center justify-between px-4 bg-cream dark:bg-charcoal-800 border-b border-blush-200 dark:border-charcoal-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-charcoal-400 dark:text-charcoal-500 font-mono">{LANDING_URL}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (iframeRef.current) iframeRef.current.src = `${LANDING_URL}?t=${Date.now()}` }}
              className="p-1.5 rounded text-charcoal-400 hover:text-rose-gold transition-colors"
              title="Recarregar"
            >
              <RefreshCw size={13} />
            </button>
            <a
              href={LANDING_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-charcoal-400 dark:text-charcoal-500 hover:text-rose-gold transition-colors px-2 py-1 rounded hover:bg-blush dark:hover:bg-charcoal-700"
            >
              <ExternalLink size={12} /> Ver ao vivo
            </a>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          src={`${LANDING_URL}?preview=1`}
          className="flex-1 w-full border-0"
          title="Preview da landing page"
        />
      </div>

      {/* ── Publish Modal ─────────────────────────────────────────────── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-charcoal-900 border border-blush-200 dark:border-charcoal-700 rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-rose-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Send size={24} className="text-rose-gold" />
            </div>
            <h3 className="font-heading text-lg font-bold text-charcoal dark:text-charcoal-50 mb-2">Publicar Alterações</h3>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400 mb-6">
              Suas alterações ficarão visíveis para todos os visitantes do site.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPublishModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-blush-200 dark:border-charcoal-600 text-charcoal-500 dark:text-charcoal-400 text-sm hover:bg-blush dark:hover:bg-charcoal-700 transition-colors"
              >Cancelar</button>
              <button
                onClick={handlePublish}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-gold text-white text-sm font-semibold hover:bg-rose-gold/90 transition-colors"
              >Publicar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Modal ─────────────────────────────────────────────── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setShowHistory(false)}
        >
          <div className="bg-white dark:bg-charcoal-900 border border-blush-200 dark:border-charcoal-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-blush-200 dark:border-charcoal-700 sticky top-0 bg-white dark:bg-charcoal-900">
              <h3 className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-50">Versões Anteriores</h3>
              <button onClick={() => setShowHistory(false)} className="text-charcoal-400 hover:text-charcoal dark:hover:text-charcoal-200 transition-colors"><X size={18} /></button>
            </div>
            <div className="divide-y divide-blush-100 dark:divide-charcoal-700">
              {loadingHistory && (
                <p className="px-6 py-8 text-center text-sm text-charcoal-400 dark:text-charcoal-500">Carregando historico...</p>
              )}
              {!loadingHistory && history.map((h) => (
                <div key={h.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-charcoal dark:text-charcoal-200">{h.section}.{h.key}</p>
                    <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-0.5">
                      V{h.version} • {new Date(h.savedAt).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[11px] text-charcoal-400 dark:text-charcoal-500 mt-1">
                      {h.reason} • {h.author?.name || h.author?.email || 'sistema'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestoreHistory(h)}
                    disabled={restoringHistoryId === h.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-blush-200 dark:border-charcoal-600 text-charcoal-500 dark:text-charcoal-400 hover:bg-rose-gold/10 hover:text-rose-gold hover:border-rose-gold/30 transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {restoringHistoryId === h.id ? 'Restaurando...' : 'Restaurar'}
                  </button>
                </div>
              ))}
              {!loadingHistory && history.length === 0 && (
                <p className="px-6 py-8 text-center text-sm text-charcoal-400 dark:text-charcoal-500">Nenhuma versão anterior</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

