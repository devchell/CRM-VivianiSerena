'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { toast } from 'sonner'
import { Save, Loader2, Globe, Plus, Trash2, Lock, ChevronDown, ChevronRight } from 'lucide-react'
import { crmPublicEnv } from '@/lib/public-env'

const API_URL = `${crmPublicEnv.apiBaseUrl}/api/v1`

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero — Topo da Página',
  about: 'Sobre Mim',
  services: 'Serviços',
  testimonials: 'Depoimentos',
  faq: 'Perguntas Frequentes',
  contact: 'Contato',
  footer: 'Rodapé',
  seo: 'SEO / Meta Tags',
}

const CORE_FIELDS = new Set([
  'hero.urgency_badge', 'hero.title', 'hero.subtitle', 'hero.cta_primary',
  'about.bio', 'contact.whatsapp', 'seo.homepage',
])

const ALL_SECTIONS = ['hero', 'about', 'services', 'testimonials', 'faq', 'contact', 'footer', 'seo']

type ContentStore = Record<string, Record<string, unknown>>

interface NewFieldForm {
  key: string
  type: 'text' | 'toggle' | 'textarea'
  value: string
}

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 placeholder-charcoal-300 dark:placeholder-charcoal-500 focus:outline-none focus:ring-2 focus:ring-rose-gold/40'

export default function SitePage() {
  const { accessToken } = useAuth()
  const [content, setContent] = useState<ContentStore>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['hero']))
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newField, setNewField] = useState<NewFieldForm>({ key: '', type: 'text', value: '' })

  const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  const fetchContent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/content`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { success: boolean; data: ContentStore }
      setContent(data.data ?? {})
    } catch {
      toast.error('Erro ao carregar conteúdo do site')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContent() }, [fetchContent])

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const getDisplayValue = (section: string, key: string): string => {
    const raw = content[section]?.[key]
    if (raw === undefined || raw === null) return ''
    if (typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      if ('pt' in obj) return String(obj.pt ?? '')
      if ('text' in obj) return String(obj.text ?? '')
      if ('value' in obj) return String(obj.value ?? '')
      return JSON.stringify(raw)
    }
    return String(raw)
  }

  const getToggleValue = (section: string, key: string): boolean => {
    const raw = content[section]?.[key]
    if (typeof raw === 'object' && raw !== null) {
      return Boolean((raw as Record<string, unknown>).enabled)
    }
    return false
  }

  const isToggleField = (section: string, key: string): boolean => {
    const raw = content[section]?.[key]
    if (typeof raw === 'object' && raw !== null) {
      return 'enabled' in (raw as Record<string, unknown>)
    }
    return false
  }

  const saveField = async (section: string, key: string, value: unknown) => {
    if (!accessToken) { toast.error('Sessão expirada'); return }
    const id = `${section}.${key}`
    setSaving(id)
    try {
      const res = await fetch(`${API_URL}/content/${section}/${key}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ value }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Salvo!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(null)
    }
  }

  const handleToggle = async (section: string, key: string) => {
    const current = getToggleValue(section, key)
    const existing = (content[section]?.[key] as Record<string, unknown>) ?? {}
    const newValue = { ...existing, enabled: !current }
    setContent(prev => ({ ...prev, [section]: { ...(prev[section] ?? {}), [key]: newValue } }))
    await saveField(section, key, newValue)
  }

  const handleTextChange = (section: string, key: string, text: string) => {
    const existing = content[section]?.[key]
    let newValue: unknown
    if (typeof existing === 'object' && existing !== null) {
      const obj = existing as Record<string, unknown>
      if ('pt' in obj) newValue = { ...obj, pt: text }
      else if ('text' in obj) newValue = { ...obj, text }
      else if ('value' in obj) newValue = { ...obj, value: text }
      else newValue = { value: text }
    } else {
      newValue = { value: text }
    }
    setContent(prev => ({ ...prev, [section]: { ...(prev[section] ?? {}), [key]: newValue } }))
  }

  const handleSaveText = async (section: string, key: string) => {
    await saveField(section, key, content[section]?.[key])
  }

  const handleDelete = async (section: string, key: string) => {
    if (!accessToken) return
    const id = `${section}.${key}`
    setDeleting(id)
    try {
      const res = await fetch(`${API_URL}/content/${section}/${key}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setContent(prev => {
        const next = { ...prev }
        if (next[section]) {
          next[section] = { ...next[section] }
          delete next[section][key]
        }
        return next
      })
      toast.success('Campo removido')
    } catch {
      toast.error('Erro ao remover campo')
    } finally {
      setDeleting(null)
    }
  }

  const handleAddField = async (section: string) => {
    if (!newField.key.trim()) { toast.error('Digite um nome para o campo'); return }
    if (!accessToken) return
    let value: unknown
    if (newField.type === 'toggle') value = { enabled: false }
    else value = { value: newField.value }
    await saveField(section, newField.key.trim().toLowerCase().replace(/\s+/g, '_'), value)
    setContent(prev => ({
      ...prev,
      [section]: { ...(prev[section] ?? {}), [newField.key.trim().toLowerCase().replace(/\s+/g, '_')]: value },
    }))
    setAddingTo(null)
    setNewField({ key: '', type: 'text', value: '' })
  }

  const sectionsWithContent = ALL_SECTIONS.filter(s => content[s] && Object.keys(content[s]).length > 0)
  const sectionsToShow = [...new Set([...sectionsWithContent, ...ALL_SECTIONS.slice(0, 4)])]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-rose-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">Editar Site</h1>
          <p className="text-charcoal-400 dark:text-charcoal-400 mt-1 text-sm">Clique em uma seção para expandir e editar</p>
        </div>
        <a
          href={crmPublicEnv.landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blush-300 dark:border-charcoal-600 text-sm text-charcoal-500 dark:text-charcoal-400 hover:border-rose-gold hover:text-rose-gold transition-colors"
        >
          <Globe size={14} />
          Ver Site
        </a>
      </div>

      {sectionsToShow.map(section => {
        const isOpen = openSections.has(section)
        const fields = content[section] ?? {}
        const fieldCount = Object.keys(fields).length

        return (
          <div key={section} className="card-dark shadow-sm overflow-hidden">
            {/* Cabeçalho da seção — clicável */}
            <button
              onClick={() => toggleSection(section)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-blush/30 dark:hover:bg-charcoal-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen
                  ? <ChevronDown size={16} className="text-rose-gold flex-shrink-0" />
                  : <ChevronRight size={16} className="text-charcoal-400 dark:text-charcoal-500 flex-shrink-0" />
                }
                <span className="font-heading text-base font-semibold text-charcoal dark:text-charcoal-100">
                  {SECTION_LABELS[section] ?? section}
                </span>
                <span className="text-xs text-charcoal-400 dark:text-charcoal-500 bg-blush dark:bg-charcoal-700 px-2 py-0.5 rounded-full">
                  {fieldCount} campo{fieldCount !== 1 ? 's' : ''}
                </span>
              </div>
            </button>

            {/* Conteúdo da seção */}
            {isOpen && (
              <div className="border-t border-blush-200 dark:border-charcoal-700">
                {fieldCount === 0 && (
                  <p className="px-6 py-4 text-sm text-charcoal-400 dark:text-charcoal-500 italic">
                    Nenhum campo ainda. Adicione um abaixo.
                  </p>
                )}

                <div className="divide-y divide-blush-100 dark:divide-charcoal-700/50">
                  {Object.entries(fields).map(([key]) => {
                    const id = `${section}.${key}`
                    const isSaving = saving === id
                    const isDeleting = deleting === id
                    const isCore = CORE_FIELDS.has(id)
                    const isToggle = isToggleField(section, key)
                    const isOn = isToggle && getToggleValue(section, key)

                    return (
                      <div key={id} className="px-6 py-4 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-charcoal dark:text-charcoal-100">{key}</span>
                            {isCore && (
                              <span className="flex items-center gap-1 text-xs text-charcoal-400 dark:text-charcoal-500 bg-blush dark:bg-charcoal-700 px-1.5 py-0.5 rounded">
                                <Lock size={10} /> essencial
                              </span>
                            )}
                          </div>

                          {/* Toggle */}
                          {isToggle && (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggle(section, key)}
                                disabled={isSaving}
                                className={`relative h-6 w-11 rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-gold/40 ${isOn ? 'bg-rose-gold' : 'bg-charcoal-300 dark:bg-charcoal-600'}`}
                              >
                                <span
                                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                                  style={{ left: '2px', transform: isOn ? 'translateX(20px)' : 'translateX(0px)' }}
                                />
                              </button>
                              <span className={`text-sm font-medium ${isOn ? 'text-green-500 dark:text-green-400' : 'text-charcoal-400 dark:text-charcoal-500'}`}>
                                {isSaving ? <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Salvando...</span> : isOn ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          )}

                          {/* Textarea */}
                          {!isToggle && getDisplayValue(section, key).length > 60 && (
                            <textarea
                              rows={3}
                              value={getDisplayValue(section, key)}
                              onChange={e => handleTextChange(section, key, e.target.value)}
                              className={inputClass + ' resize-none'}
                            />
                          )}

                          {/* Text input */}
                          {!isToggle && getDisplayValue(section, key).length <= 60 && (
                            <input
                              type="text"
                              value={getDisplayValue(section, key)}
                              onChange={e => handleTextChange(section, key, e.target.value)}
                              className={inputClass}
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-7 flex-shrink-0">
                          {!isToggle && (
                            <button
                              onClick={() => handleSaveText(section, key)}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-rose-gold text-white hover:bg-rose-gold-500 transition-colors disabled:opacity-60"
                            >
                              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              Salvar
                            </button>
                          )}
                          {!isCore && (
                            <button
                              onClick={() => handleDelete(section, key)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-charcoal-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                              title="Remover campo"
                            >
                              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Formulário inline para adicionar campo */}
                {addingTo === section ? (
                  <div className="px-6 py-4 border-t border-blush-200 dark:border-charcoal-700 bg-blush/20 dark:bg-charcoal-800/50">
                    <p className="text-xs font-medium text-charcoal-400 dark:text-charcoal-500 mb-3">Novo campo</p>
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <label className="block text-xs text-charcoal-400 dark:text-charcoal-500 mb-1">Nome do campo</label>
                        <input
                          type="text"
                          value={newField.key}
                          onChange={e => setNewField(f => ({ ...f, key: e.target.value }))}
                          placeholder="ex: novo_titulo"
                          className="px-3 py-1.5 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40 w-44"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-charcoal-400 dark:text-charcoal-500 mb-1">Tipo</label>
                        <select
                          value={newField.type}
                          onChange={e => setNewField(f => ({ ...f, type: e.target.value as NewFieldForm['type'] }))}
                          className="px-3 py-1.5 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40"
                        >
                          <option value="text">Texto</option>
                          <option value="textarea">Texto longo</option>
                          <option value="toggle">Ativador (on/off)</option>
                        </select>
                      </div>
                      {newField.type !== 'toggle' && (
                        <div>
                          <label className="block text-xs text-charcoal-400 dark:text-charcoal-500 mb-1">Valor inicial</label>
                          <input
                            type="text"
                            value={newField.value}
                            onChange={e => setNewField(f => ({ ...f, value: e.target.value }))}
                            placeholder="(opcional)"
                            className="px-3 py-1.5 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40 w-44"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => handleAddField(section)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-rose-gold text-white hover:bg-rose-gold-500 transition-colors font-medium"
                      >
                        <Save size={13} /> Adicionar
                      </button>
                      <button
                        onClick={() => { setAddingTo(null); setNewField({ key: '', type: 'text', value: '' }) }}
                        className="px-3 py-1.5 text-sm text-charcoal-400 hover:text-charcoal-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-3 border-t border-blush-100 dark:border-charcoal-700/50">
                    <button
                      onClick={() => { setAddingTo(section); setNewField({ key: '', type: 'text', value: '' }) }}
                      className="flex items-center gap-2 text-sm text-charcoal-400 dark:text-charcoal-500 hover:text-rose-gold transition-colors"
                    >
                      <Plus size={14} />
                      Adicionar campo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
