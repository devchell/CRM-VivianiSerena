'use client'

// Protected API media requires the browser session proxy; next/image cannot attach that authorization flow.
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, Check, FolderOpen, Globe2, ImagePlus, Link2,
  Loader2, Plus, Save, Search, Trash2, Upload, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/useAuth'
import { buildApiUrl, buildAuthHeaders } from '@/lib/api-client'

type Stage = 'before' | 'progress' | 'after'

type ClientFolderMedia = {
  id: string
  stage: Stage
  capturedAt: string
  note: string | null
  originalFilename: string
  width: number
  height: number
  url: string
}

type ClientFolder = {
  id: string
  leadId: string | null
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  serviceLabel: string | null
  notes: string | null
  publicTitle: string | null
  publicDescription: string | null
  isPublished: boolean
  hasPublicConsent: boolean
  createdAt: string
  updatedAt: string
  lead: { id: string; name: string; email: string; phone: string | null } | null
  media: ClientFolderMedia[]
}

type LeadOption = { id: string; name: string; email: string; phone: string | null }

type FolderDraft = {
  leadId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  serviceLabel: string
  notes: string
  publicTitle: string
  publicDescription: string
  isPublished: boolean
  publicConsent: boolean
}

const stageLabels: Record<Stage, string> = { before: 'Antes', progress: 'Acompanhamento', after: 'Depois' }
const stageColors: Record<Stage, string> = {
  before: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  progress: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  after: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
}

const inputClass = 'w-full rounded-lg border border-[var(--input-border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-disabled)] focus-visible:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-shadow)]'
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50'

const emptyDraft: FolderDraft = {
  leadId: '', clientName: '', clientEmail: '', clientPhone: '', serviceLabel: '', notes: '',
  publicTitle: '', publicDescription: '', isPublished: false, publicConsent: false,
}

function toDraft(folder: ClientFolder): FolderDraft {
  return {
    leadId: folder.leadId ?? '',
    clientName: folder.clientName,
    clientEmail: folder.clientEmail ?? '',
    clientPhone: folder.clientPhone ?? '',
    serviceLabel: folder.serviceLabel ?? '',
    notes: folder.notes ?? '',
    publicTitle: folder.publicTitle ?? '',
    publicDescription: folder.publicDescription ?? '',
    isPublished: folder.isPublished,
    publicConsent: folder.hasPublicConsent,
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

export function ClientFoldersPage() {
  const { accessToken, hasPermission } = useAuth()
  const canCreate = hasPermission('leads.create')
  const canEdit = canCreate || hasPermission('leads.update')
  const canPublish = hasPermission('editar-site.publish')
  const [folders, setFolders] = useState<ClientFolder[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FolderDraft>(emptyDraft)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState<Stage>('before')
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [uploadNote, setUploadNote] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const selected = folders.find((folder) => folder.id === selectedId) ?? null
  const filteredFolders = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) return folders
    return folders.filter((folder) => [folder.clientName, folder.clientEmail, folder.serviceLabel]
      .filter(Boolean).some((value) => value?.toLocaleLowerCase('pt-BR').includes(normalized)))
  }, [folders, search])

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(buildApiUrl(path), {
      ...init,
      headers: {
        ...buildAuthHeaders(accessToken, init?.body instanceof FormData ? undefined : 'application/json'),
        ...init?.headers,
      },
    })
    const payload = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: string; message?: string } | null
    if (!response.ok || !payload?.success) throw new Error(payload?.error ?? payload?.message ?? `HTTP ${response.status}`)
    return payload.data as T
  }, [accessToken])

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [folderPayload, leadPayload] = await Promise.all([
        request<ClientFolder[]>('/client-folders?limit=100'),
        request<{ id: string; name: string; email: string; phone: string | null }[]>('/leads?limit=100'),
      ])
      setFolders(folderPayload ?? [])
      setLeads((leadPayload ?? []).map((lead) => ({ id: lead.id, name: lead.name, email: lead.email, phone: lead.phone })))
      setSelectedId((current) => current && (folderPayload ?? []).some((folder) => folder.id === current)
        ? current : (folderPayload?.[0]?.id ?? null))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar as pastas')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (selected) setDraft(toDraft(selected))
  }, [selected])

  const updateDraft = <K extends keyof FolderDraft>(key: K, value: FolderDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleLeadChange = (leadId: string) => {
    const lead = leads.find((item) => item.id === leadId)
    setDraft((current) => ({
      ...current,
      leadId,
      clientName: lead?.name ?? current.clientName,
      clientEmail: lead?.email ?? current.clientEmail,
      clientPhone: lead?.phone ?? current.clientPhone,
    }))
  }

  const saveFolder = async () => {
    if (!canEdit) return
    setSaving(true)
    try {
      const payload = {
        ...(draft.leadId ? { leadId: draft.leadId } : {}),
        clientName: draft.clientName || undefined,
        clientEmail: draft.clientEmail || null,
        clientPhone: draft.clientPhone || null,
        serviceLabel: draft.serviceLabel || null,
        notes: draft.notes || null,
        ...(canPublish ? {
          publicTitle: draft.publicTitle || null,
          publicDescription: draft.publicDescription || null,
          isPublished: draft.isPublished,
          publicConsent: draft.publicConsent,
        } : {}),
      }
      const folder = showCreate
        ? await request<ClientFolder>('/client-folders', { method: 'POST', body: JSON.stringify(payload) })
        : selected
          ? await request<ClientFolder>(`/client-folders/${selected.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
          : null
      if (!folder) return
      setFolders((current) => showCreate ? [folder, ...current] : current.map((item) => item.id === folder.id ? folder : item))
      setSelectedId(folder.id)
      setShowCreate(false)
      toast.success(showCreate ? 'Pasta criada' : 'Pasta atualizada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a pasta')
    } finally {
      setSaving(false)
    }
  }

  const uploadMedia = async () => {
    if (!selected || !file || !canEdit) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('stage', uploadStage)
      form.append('capturedAt', uploadDate)
      if (uploadNote.trim()) form.append('note', uploadNote.trim())
      const media = await request<ClientFolderMedia>(`/client-folders/${selected.id}/media`, { method: 'POST', body: form })
      const nextFolder = { ...selected, media: [...selected.media, media].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)) }
      setFolders((current) => current.map((item) => item.id === selected.id ? nextFolder : item))
      setFile(null)
      setUploadNote('')
      toast.success('Imagem adicionada à timeline')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar a imagem')
    } finally {
      setUploading(false)
    }
  }

  const removeMedia = async (mediaId: string) => {
    if (!selected || !canEdit || !window.confirm('Remover esta imagem da timeline?')) return
    try {
      await request(`/client-folders/${selected.id}/media/${mediaId}`, { method: 'DELETE' })
      setFolders((current) => current.map((item) => item.id === selected.id
        ? { ...item, media: item.media.filter((media) => media.id !== mediaId) } : item))
      toast.success('Imagem removida')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a imagem')
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--primary)]">Acompanhamento</p>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">Pastas de clientes</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">Notas, imagens e evolução em um só lugar. O que for privado não aparece na landing.</p>
        </div>
        {canCreate && (
          <button type="button" className={`${buttonClass} bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]`} onClick={() => { setShowCreate(true); setSelectedId(null); setDraft(emptyDraft) }}>
            <Plus size={16} /> Nova pasta
          </button>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.55fr)]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-card)]" aria-label="Lista de pastas">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-3 text-[var(--text-tertiary)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente ou serviço" className={`${inputClass} pl-9`} aria-label="Buscar pastas" />
          </label>
          <div className="mt-3 space-y-1.5">
            {loading && <div className="flex items-center gap-2 px-3 py-6 text-sm text-[var(--text-secondary)]"><Loader2 size={16} className="animate-spin" /> Carregando…</div>}
            {!loading && filteredFolders.length === 0 && <div className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]"><FolderOpen size={24} className="mx-auto mb-2 text-[var(--text-tertiary)]" />Nenhuma pasta encontrada.</div>}
            {filteredFolders.map((folder) => (
              <button key={folder.id} type="button" onClick={() => { setShowCreate(false); setSelectedId(folder.id) }} className={`w-full rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${selectedId === folder.id && !showCreate ? 'border-[var(--primary)] bg-[var(--accent)]' : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}>
                <div className="flex items-start justify-between gap-2"><span className="truncate text-sm font-semibold text-[var(--text-primary)]">{folder.clientName}</span>{folder.isPublished && <Globe2 size={14} className="shrink-0 text-[var(--success)]" aria-label="Publicado na landing" />}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"><span className="truncate">{folder.serviceLabel || 'Sem serviço definido'}</span><span>{folder.media.length} {folder.media.length === 1 ? 'imagem' : 'imagens'}</span></div>
              </button>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
          {(showCreate || selected) ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{showCreate ? 'Nova pasta' : 'Pasta do cliente'}</p><h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{showCreate ? 'Comece pelo cliente' : selected?.clientName}</h2></div>
                {!showCreate && selected?.isPublished && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-bg)] px-2.5 py-1 text-xs font-medium text-[var(--success)]"><Check size={13} /> Visível na landing</span>}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-[var(--text-secondary)]">Vincular lead (opcional)<select value={draft.leadId} onChange={(event) => handleLeadChange(event.target.value)} disabled={!showCreate || !canEdit} className={`${inputClass} mt-1.5`}><option value="">Cadastro manual</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} — {lead.email}</option>)}</select></label>
                <label className="text-sm text-[var(--text-secondary)]">Nome do cliente<input value={draft.clientName} onChange={(event) => updateDraft('clientName', event.target.value)} disabled={!canEdit} className={`${inputClass} mt-1.5`} maxLength={120} /></label>
                <label className="text-sm text-[var(--text-secondary)]">E-mail<input type="email" value={draft.clientEmail} onChange={(event) => updateDraft('clientEmail', event.target.value)} disabled={!canEdit} className={`${inputClass} mt-1.5`} /></label>
                <label className="text-sm text-[var(--text-secondary)]">Telefone<input value={draft.clientPhone} onChange={(event) => updateDraft('clientPhone', event.target.value)} disabled={!canEdit} className={`${inputClass} mt-1.5`} /></label>
                <label className="text-sm text-[var(--text-secondary)] sm:col-span-2">Serviço ou procedimento<input value={draft.serviceLabel} onChange={(event) => updateDraft('serviceLabel', event.target.value)} disabled={!canEdit} className={`${inputClass} mt-1.5`} maxLength={120} /></label>
              </div>

              <div className="mt-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3.5">
                <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-[var(--text-primary)]">Visibilidade</h3><p className="mt-0.5 text-xs text-[var(--text-secondary)]">Publicar libera somente título, descrição e imagens tratadas.</p></div><button type="button" role="switch" aria-checked={draft.isPublished} disabled={!canPublish || showCreate} onClick={() => updateDraft('isPublished', !draft.isPublished)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 ${draft.isPublished ? 'bg-[var(--success)]' : 'bg-[var(--border-medium)]'}`}><span className={`pointer-events-none h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${draft.isPublished ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>
                {showCreate && <p className="mt-2 text-xs text-[var(--text-tertiary)]">Crie a pasta, adicione imagens e depois escolha se ela será publicada.</p>}
                {!canPublish && <p className="mt-2 text-xs text-[var(--text-tertiary)]">A publicação é controlada pelo editor do site.</p>}
                {draft.isPublished && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm text-[var(--text-secondary)]">Título público<input value={draft.publicTitle} onChange={(event) => updateDraft('publicTitle', event.target.value)} disabled={!canPublish} placeholder="Ex.: Evolução da pele" className={`${inputClass} mt-1.5`} /></label><label className="text-sm text-[var(--text-secondary)]">Descrição<textarea value={draft.publicDescription} onChange={(event) => updateDraft('publicDescription', event.target.value)} disabled={!canPublish} rows={2} className={`${inputClass} mt-1.5 resize-y`} /></label></div>}
                {canPublish && draft.isPublished && !draft.publicConsent && <label className="mt-3 flex items-start gap-2 text-xs text-[var(--text-secondary)]"><input type="checkbox" checked={draft.publicConsent} onChange={(event) => updateDraft('publicConsent', event.target.checked)} className="mt-0.5 accent-[var(--primary)]" />Confirmo que existe autorização para publicar estas imagens.</label>}
              </div>

              <label className="mt-4 block text-sm text-[var(--text-secondary)]">Notas internas<textarea value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} disabled={!canEdit} rows={3} placeholder="Anote contexto, cuidados e próximos passos…" className={`${inputClass} mt-1.5 resize-y`} maxLength={5000} /></label>
              {canEdit && <div className="mt-3 flex justify-end"><button type="button" onClick={() => void saveFolder()} disabled={saving || !draft.clientName.trim()} className={`${buttonClass} bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]`}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {showCreate ? 'Criar pasta' : 'Salvar alterações'}</button></div>}

              {!showCreate && selected && <>
                <div className="mt-7 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-semibold text-[var(--text-primary)]">Linha do tempo</h3><p className="mt-0.5 text-sm text-[var(--text-secondary)]">Registre cada etapa com a data em que aconteceu.</p></div><span className="text-xs text-[var(--text-tertiary)]">{selected.media.length}/100 imagens</span></div>
                {canEdit && <div className="mt-3 rounded-lg border border-dashed border-[var(--border-medium)] p-3.5"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"><label className="text-xs font-medium text-[var(--text-secondary)]">Etapa<select value={uploadStage} onChange={(event) => setUploadStage(event.target.value as Stage)} className={`${inputClass} mt-1.5`}><option value="before">Antes</option><option value="progress">Acompanhamento</option><option value="after">Depois</option></select></label><label className="text-xs font-medium text-[var(--text-secondary)]">Data<input type="date" value={uploadDate} onChange={(event) => setUploadDate(event.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="text-xs font-medium text-[var(--text-secondary)]">Nota curta<input value={uploadNote} onChange={(event) => setUploadNote(event.target.value)} placeholder="Opcional" className={`${inputClass} mt-1.5`} /></label><label className={`${buttonClass} cursor-pointer border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]`}><Upload size={16} />{file ? 'Trocar imagem' : 'Escolher imagem'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label></div>{file && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"><span className="truncate">{file.name}</span><button type="button" onClick={() => setFile(null)} className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)]"><X size={14} /> remover</button><button type="button" onClick={() => void uploadMedia()} disabled={uploading} className={`${buttonClass} min-h-9 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]`}>{uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} Adicionar à timeline</button></div>}</div>}

                <div className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-[var(--border)]">
                  {selected.media.length === 0 && <div className="relative rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-6 pl-8 text-sm text-[var(--text-secondary)]"><span className="absolute left-1.5 top-6 h-2 w-2 rounded-full bg-[var(--border-medium)]" />Adicione a primeira imagem para iniciar a linha do tempo.</div>}
                  {selected.media.map((media) => <article key={media.id} className="relative grid gap-3 pl-8 sm:grid-cols-[112px_minmax(0,1fr)]"><span className="absolute left-1 top-4 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-card)] bg-[var(--primary)] ring-1 ring-[var(--primary)]" /><img src={`/api/client-folders/media/${selected.id}/${media.id}`} alt={`${stageLabels[media.stage]} — ${formatDate(media.capturedAt)}`} width={112} height={84} className="h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] object-cover sm:h-20" /><div className="min-w-0 rounded-lg border border-[var(--border-subtle)] p-3"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${stageColors[media.stage]}`}>{stageLabels[media.stage]}</span><span className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)]"><CalendarDays size={13} />{formatDate(media.capturedAt)}</span><button type="button" onClick={() => void removeMedia(media.id)} disabled={!canEdit} className="ml-auto rounded p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--destructive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" aria-label="Remover imagem"><Trash2 size={14} /></button></div>{media.note && <p className="mt-2 text-sm text-[var(--text-secondary)]">{media.note}</p>}</div></article>)}
                </div>
              </>}
            </>
          ) : <div className="flex min-h-[420px] flex-col items-center justify-center text-center text-[var(--text-secondary)]"><FolderOpen size={34} className="mb-3 text-[var(--primary)]" /><h2 className="text-lg font-semibold text-[var(--text-primary)]">Escolha uma pasta</h2><p className="mt-1 max-w-sm text-sm">Veja notas e evolução do cliente ou crie uma nova pasta manualmente.</p>{canEdit && <button type="button" onClick={() => { setShowCreate(true); setDraft(emptyDraft) }} className={`${buttonClass} mt-4 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]`}><Plus size={16} /> Criar pasta</button>}</div>}
        </section>
      </div>
      <p className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]"><Link2 size={13} /> Use o editor do site para decidir quais pastas publicadas aparecem na landing.</p>
    </div>
  )
}
