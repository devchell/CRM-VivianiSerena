'use client'

// Protected API media requires the browser session proxy; next/image cannot attach that authorization flow.
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft, CalendarDays, ChevronRight, CircleUserRound, Edit3, GripVertical,
  ImagePlus, Images, Link2, Loader2, Mail, Pencil, Phone, Plus, Search, Save,
  Trash2, Upload, UsersRound, X,
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
  clientId: string
  name: string
  occurredAt: string
  position: number
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
  media: ClientFolderMedia[]
}

type Client = {
  id: string
  leadId: string | null
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  folderCount: number
  folders: ClientFolder[]
  lead: { id: string; name: string; email: string; phone: string | null } | null
}

type LeadOption = { id: string; name: string; email: string; phone: string | null }

type ClientDraft = { leadId: string; name: string; email: string; phone: string; notes: string }
type FolderDraft = { name: string; occurredAt: string; serviceLabel: string; notes: string }

const stageLabels: Record<Stage, string> = { before: 'Antes', progress: 'Acompanhamento', after: 'Depois' }
const stageColors: Record<Stage, string> = {
  before: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  progress: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  after: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
}

const inputClass = 'w-full rounded-xl border border-[var(--input-border)] bg-[var(--input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-disabled)] focus-visible:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-shadow)]'
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-[background,color,border,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
const primaryButtonClass = `${buttonClass} bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]`

const emptyClientDraft: ClientDraft = { leadId: '', name: '', email: '', phone: '', notes: '' }
const emptyFolderDraft: FolderDraft = { name: '', occurredAt: new Date().toISOString().slice(0, 10), serviceLabel: '', notes: '' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function ModalShell({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="client-area-modal-title" className="max-h-[min(720px,calc(100vh-2rem))] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div><h2 id="client-area-modal-title" className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" aria-label="Fechar modal"><X size={18} /></button>
        </div>
        <div className="pt-5">{children}</div>
      </div>
    </div>
  )
}

export function ClientFoldersPage() {
  const { accessToken, hasPermission } = useAuth()
  const canCreate = hasPermission('leads.create')
  const canEdit = canCreate || hasPermission('leads.update')
  const [clients, setClients] = useState<Client[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [clientModal, setClientModal] = useState<'create' | 'edit' | null>(null)
  const [folderModal, setFolderModal] = useState<'create' | 'edit' | null>(null)
  const [clientDraft, setClientDraft] = useState<ClientDraft>(emptyClientDraft)
  const [folderDraft, setFolderDraft] = useState<FolderDraft>(emptyFolderDraft)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState<Stage>('before')
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [uploadNote, setUploadNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null)

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

  const loadClients = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [clientPayload, leadPayload] = await Promise.all([
        request<Client[]>('/client-folders/clients?limit=100'),
        request<LeadOption[]>('/leads?limit=100'),
      ])
      setClients(clientPayload ?? [])
      setLeads(leadPayload ?? [])
      setSelectedId((current) => current && (clientPayload ?? []).some((client) => client.id === current) ? current : (clientPayload?.[0]?.id ?? null))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar os clientes')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  const loadClient = useCallback(async (clientId: string) => {
    setDetailLoading(true)
    try {
      const client = await request<Client>(`/client-folders/clients/${clientId}`)
      setSelectedClient(client)
      setSelectedFolderId((current) => current && client.folders.some((folder) => folder.id === current) ? current : null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o cliente')
    } finally {
      setDetailLoading(false)
    }
  }, [request])

  useEffect(() => { void loadClients() }, [loadClients])
  useEffect(() => { if (selectedId) void loadClient(selectedId); else setSelectedClient(null) }, [loadClient, selectedId])

  const filteredClients = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) return clients
    return clients.filter((client) => [client.name, client.email, client.phone].filter(Boolean).some((value) => value?.toLocaleLowerCase('pt-BR').includes(normalized)))
  }, [clients, search])

  const selectedFolder = selectedClient?.folders.find((folder) => folder.id === selectedFolderId) ?? null

  const openCreateClient = () => { setClientDraft(emptyClientDraft); setClientModal('create') }

  const openEditClient = () => {
    if (!selectedClient) return
    setClientDraft({ leadId: selectedClient.leadId ?? '', name: selectedClient.name, email: selectedClient.email ?? '', phone: selectedClient.phone ?? '', notes: selectedClient.notes ?? '' })
    setClientModal('edit')
  }

  const saveClient = async () => {
    if (!canEdit || !clientDraft.name.trim()) return
    setSaving(true)
    try {
      const payload = { leadId: clientDraft.leadId || null, name: clientDraft.name.trim(), email: clientDraft.email.trim() || null, phone: clientDraft.phone.trim() || null, notes: clientDraft.notes.trim() || null }
      const client = clientModal === 'create'
        ? await request<Client>('/client-folders/clients', { method: 'POST', body: JSON.stringify(payload) })
        : selectedClient ? await request<Client>(`/client-folders/clients/${selectedClient.id}`, { method: 'PATCH', body: JSON.stringify(payload) }) : null
      if (!client) return
      setClients((current) => clientModal === 'create' ? [client, ...current] : current.map((item) => item.id === client.id ? { ...item, ...client, folders: item.folders } : item))
      setSelectedId(client.id)
      setSelectedClient(client)
      setClientModal(null)
      toast.success(clientModal === 'create' ? 'Cliente criado' : 'Cliente atualizado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o cliente')
    } finally {
      setSaving(false)
    }
  }

  const openCreateFolder = () => { setFolderDraft({ ...emptyFolderDraft, name: `Atendimento ${selectedClient?.folders.length ? selectedClient.folders.length + 1 : 1}` }); setFolderModal('create') }

  const openEditFolder = () => {
    if (!selectedFolder) return
    setFolderDraft({ name: selectedFolder.name, occurredAt: selectedFolder.occurredAt, serviceLabel: selectedFolder.serviceLabel ?? '', notes: selectedFolder.notes ?? '' })
    setFolderModal('edit')
  }

  const saveFolder = async () => {
    if (!selectedClient || !canEdit || !folderDraft.name.trim()) return
    setSaving(true)
    try {
      const payload = { name: folderDraft.name.trim(), occurredAt: folderDraft.occurredAt, serviceLabel: folderDraft.serviceLabel.trim() || null, notes: folderDraft.notes.trim() || null }
      const folder = folderModal === 'create'
        ? await request<ClientFolder>(`/client-folders/clients/${selectedClient.id}/folders`, { method: 'POST', body: JSON.stringify(payload) })
        : selectedFolder ? await request<ClientFolder>(`/client-folders/${selectedFolder.id}`, { method: 'PATCH', body: JSON.stringify(payload) }) : null
      if (!folder) return
      const nextFolders = folderModal === 'create' ? [...selectedClient.folders, folder].sort((a, b) => a.position - b.position) : selectedClient.folders.map((item) => item.id === folder.id ? folder : item)
      setSelectedClient({ ...selectedClient, folders: nextFolders, folderCount: nextFolders.length, updatedAt: new Date().toISOString() })
      setClients((current) => current.map((item) => item.id === selectedClient.id ? { ...item, folderCount: nextFolders.length, updatedAt: new Date().toISOString() } : item))
      setSelectedFolderId(folder.id)
      setFolderModal(null)
      toast.success(folderModal === 'create' ? 'Pasta criada' : 'Pasta atualizada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a pasta')
    } finally {
      setSaving(false)
    }
  }

  const reorderFolders = async (targetId: string) => {
    if (!selectedClient || !draggingFolderId || draggingFolderId === targetId || !canEdit) return
    const folders = [...selectedClient.folders]
    const fromIndex = folders.findIndex((folder) => folder.id === draggingFolderId)
    const targetIndex = folders.findIndex((folder) => folder.id === targetId)
    if (fromIndex < 0 || targetIndex < 0) return
    const [moved] = folders.splice(fromIndex, 1)
    folders.splice(targetIndex, 0, moved)
    const ordered = folders.map((folder, position) => ({ ...folder, position }))
    setSelectedClient({ ...selectedClient, folders: ordered })
    setDraggingFolderId(null)
    try {
      await request(`/client-folders/clients/${selectedClient.id}/folders/reorder`, { method: 'PATCH', body: JSON.stringify({ folderIds: ordered.map((folder) => folder.id) }) })
      toast.success('Ordem das pastas atualizada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível reordenar as pastas')
      void loadClient(selectedClient.id)
    }
  }

  const uploadMedia = async () => {
    if (!selectedFolder || !file || !canEdit) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('stage', uploadStage)
      form.append('capturedAt', uploadDate)
      if (uploadNote.trim()) form.append('note', uploadNote.trim())
      const media = await request<ClientFolderMedia>(`/client-folders/${selectedFolder.id}/media`, { method: 'POST', body: form })
      const nextFolder = { ...selectedFolder, media: [...selectedFolder.media, media].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)) }
      setSelectedClient((current) => current ? { ...current, folders: current.folders.map((folder) => folder.id === selectedFolder.id ? nextFolder : folder) } : current)
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
    if (!selectedFolder || !canEdit || !window.confirm('Remover esta imagem da timeline?')) return
    try {
      await request(`/client-folders/${selectedFolder.id}/media/${mediaId}`, { method: 'DELETE' })
      setSelectedClient((current) => current ? { ...current, folders: current.folders.map((folder) => folder.id === selectedFolder.id ? { ...folder, media: folder.media.filter((media) => media.id !== mediaId) } : folder) } : current)
      toast.success('Imagem removida')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a imagem')
    }
  }

  const removeFolder = async () => {
    if (!selectedClient || !selectedFolder || !canEdit || !window.confirm(`Excluir a pasta "${selectedFolder.name}"? As imagens e notas também serão removidas.`)) return
    try {
      await request(`/client-folders/${selectedFolder.id}`, { method: 'DELETE' })
      const nextFolders = selectedClient.folders.filter((folder) => folder.id !== selectedFolder.id)
      setSelectedClient({ ...selectedClient, folders: nextFolders, folderCount: nextFolders.length })
      setClients((current) => current.map((client) => client.id === selectedClient.id ? { ...client, folderCount: nextFolders.length } : client))
      setSelectedFolderId(null)
      toast.success('Pasta excluída')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a pasta')
    }
  }

  const clientModalView = clientModal ? <ModalShell title={clientModal === 'create' ? 'Novo cliente' : 'Editar cliente'} description="Mantenha os dados principais separados das pastas de atendimento." onClose={() => setClientModal(null)}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-[var(--text-secondary)] sm:col-span-2">Nome completo<input autoFocus value={clientDraft.name} onChange={(event) => setClientDraft({ ...clientDraft, name: event.target.value })} className={`${inputClass} mt-1.5`} maxLength={120} required /></label><label className="text-sm text-[var(--text-secondary)] sm:col-span-2">Vincular lead <span className="text-xs text-[var(--text-tertiary)]">(opcional)</span><select value={clientDraft.leadId} onChange={(event) => { const lead = leads.find((item) => item.id === event.target.value); setClientDraft({ ...clientDraft, leadId: event.target.value, name: lead?.name ?? clientDraft.name, email: lead?.email ?? clientDraft.email, phone: lead?.phone ?? clientDraft.phone }) }} className={`${inputClass} mt-1.5`}><option value="">Cadastro manual</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} — {lead.email}</option>)}</select></label><label className="text-sm text-[var(--text-secondary)]">E-mail<input type="email" value={clientDraft.email} onChange={(event) => setClientDraft({ ...clientDraft, email: event.target.value })} className={`${inputClass} mt-1.5`} /></label><label className="text-sm text-[var(--text-secondary)]">Telefone<input value={clientDraft.phone} onChange={(event) => setClientDraft({ ...clientDraft, phone: event.target.value })} className={`${inputClass} mt-1.5`} /></label><label className="text-sm text-[var(--text-secondary)] sm:col-span-2">Notas internas<textarea value={clientDraft.notes} onChange={(event) => setClientDraft({ ...clientDraft, notes: event.target.value })} rows={4} maxLength={5000} className={`${inputClass} mt-1.5 resize-y`} placeholder="Contexto geral deste cliente…" /></label></div><div className="mt-5 flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4"><button type="button" onClick={() => setClientModal(null)} className={`${buttonClass} border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]`}>Cancelar</button><button type="button" onClick={() => void saveClient()} disabled={saving || !clientDraft.name.trim()} className={primaryButtonClass}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar cliente</button></div></ModalShell> : null
  const folderModalView = folderModal ? <ModalShell title={folderModal === 'create' ? 'Nova pasta de atendimento' : 'Editar pasta'} description="Use a data para manter a evolução do cliente em ordem." onClose={() => setFolderModal(null)}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-[var(--text-secondary)] sm:col-span-2">Nome da pasta<input autoFocus value={folderDraft.name} onChange={(event) => setFolderDraft({ ...folderDraft, name: event.target.value })} className={`${inputClass} mt-1.5`} maxLength={120} required /></label><label className="text-sm text-[var(--text-secondary)]">Data do atendimento<input type="date" value={folderDraft.occurredAt} onChange={(event) => setFolderDraft({ ...folderDraft, occurredAt: event.target.value })} className={`${inputClass} mt-1.5`} /></label><label className="text-sm text-[var(--text-secondary)]">Serviço ou procedimento<input value={folderDraft.serviceLabel} onChange={(event) => setFolderDraft({ ...folderDraft, serviceLabel: event.target.value })} className={`${inputClass} mt-1.5`} maxLength={120} /></label><label className="text-sm text-[var(--text-secondary)] sm:col-span-2">Notas desta pasta<textarea value={folderDraft.notes} onChange={(event) => setFolderDraft({ ...folderDraft, notes: event.target.value })} rows={4} maxLength={5000} className={`${inputClass} mt-1.5 resize-y`} placeholder="O que aconteceu nesta etapa?" /></label></div><div className="mt-5 flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4"><button type="button" onClick={() => setFolderModal(null)} className={`${buttonClass} border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]`}>Cancelar</button><button type="button" onClick={() => void saveFolder()} disabled={saving || !folderDraft.name.trim()} className={primaryButtonClass}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar pasta</button></div></ModalShell> : null

  if (!loading && clients.length === 0) {
    return <div className="-m-4 flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-[var(--bg-surface)] p-6 sm:-m-6"><div className="max-w-md text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--primary)]"><UsersRound size={30} /></div><h1 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">Comece pelos seus clientes</h1><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Cadastre um cliente e organize cada atendimento em uma pasta própria, com notas e evolução por imagens.</p>{canCreate && <button type="button" onClick={openCreateClient} className={`${primaryButtonClass} mx-auto mt-6 min-h-12 px-5`}><Plus size={19} /> Adicionar primeiro cliente</button>}</div>{clientModalView}</div>
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-3.5rem)] flex-col bg-[var(--bg-surface)] sm:-m-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-card)] px-5 py-5 sm:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--primary)]">Acompanhamento</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Clientes</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Dados do cliente em um lugar. Cada atendimento fica na sua própria pasta.</p>
        </div>
        {canCreate && <button type="button" onClick={openCreateClient} className={primaryButtonClass}><Plus size={17} /> Novo cliente</button>}
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--border)] bg-[var(--bg-card)] p-4 lg:border-b-0 lg:border-r lg:p-5">
          <label className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-[var(--text-tertiary)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente" className={`${inputClass} pl-9`} aria-label="Buscar cliente" /></label>
          <div className="mt-4 space-y-1.5 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
            {filteredClients.map((client) => <button key={client.id} type="button" onClick={() => { setSelectedId(client.id); setSelectedFolderId(null) }} className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${selectedId === client.id ? 'border-[var(--primary)] bg-[var(--accent)]' : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--primary)]"><CircleUserRound size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{client.name}</span><span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{client.folderCount} {client.folderCount === 1 ? 'pasta' : 'pastas'}</span></span><ChevronRight size={16} className="text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" /></button>)}
            {filteredClients.length === 0 && <p className="px-2 py-8 text-center text-sm text-[var(--text-secondary)]">Nenhum cliente encontrado.</p>}
          </div>
        </aside>

        <main className="min-w-0 p-5 sm:p-8">
          {detailLoading || !selectedClient ? <div className="flex min-h-[420px] items-center justify-center text-sm text-[var(--text-secondary)]"><Loader2 size={18} className="mr-2 animate-spin" /> Carregando cliente…</div> : <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-6">
              <div className="flex min-w-0 items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--primary)]"><CircleUserRound size={26} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">{selectedClient.name}</h2>{selectedClient.lead && <span className="rounded-full bg-[var(--success-bg)] px-2.5 py-1 text-xs font-medium text-[var(--success)]">Lead vinculado</span>}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">{selectedClient.email && <span className="inline-flex items-center gap-1.5"><Mail size={14} />{selectedClient.email}</span>}{selectedClient.phone && <span className="inline-flex items-center gap-1.5"><Phone size={14} />{selectedClient.phone}</span>}</div><p className="mt-2 text-xs text-[var(--text-tertiary)]">Atualizado em {formatDateTime(selectedClient.updatedAt)}</p></div></div>
              <div className="flex gap-2"><button type="button" onClick={openEditClient} disabled={!canEdit} className={`${buttonClass} border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]`}><Pencil size={15} /> Editar cliente</button><button type="button" onClick={openCreateFolder} disabled={!canCreate} className={primaryButtonClass}><Plus size={16} /> Nova pasta</button></div>
            </div>

            {selectedClient.notes && <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"><span className="font-medium text-[var(--text-primary)]">Notas gerais</span><p className="mt-1 whitespace-pre-wrap">{selectedClient.notes}</p></div>}

            <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Histórico</p><h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Pastas de atendimento</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Arraste para organizar a ordem dos períodos.</p></div><span className="text-xs text-[var(--text-tertiary)]">{selectedClient.folders.length} {selectedClient.folders.length === 1 ? 'pasta' : 'pastas'}</span></div>
              {selectedClient.folders.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-medium)] p-8 text-center"><CalendarDays size={26} className="mx-auto text-[var(--primary)]" /><p className="mt-3 text-sm font-medium text-[var(--text-primary)]">Nenhum atendimento organizado ainda</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Crie a primeira pasta para começar a linha do tempo.</p><button type="button" onClick={openCreateFolder} className={`${primaryButtonClass} mt-4`}><Plus size={16} /> Criar pasta</button></div> : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{selectedClient.folders.map((folder) => <article key={folder.id} draggable={canEdit} onDragStart={() => setDraggingFolderId(folder.id)} onDragEnd={() => setDraggingFolderId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => void reorderFolders(folder.id)} className={`rounded-2xl border bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] transition-[border,transform,opacity] ${selectedFolderId === folder.id ? 'border-[var(--primary)] ring-2 ring-[var(--ring-shadow)]' : 'border-[var(--border)] hover:border-[var(--border-medium)]'} ${draggingFolderId === folder.id ? 'opacity-50' : ''}`}><div className="flex items-start gap-3"><span className="mt-0.5 cursor-grab text-[var(--text-tertiary)] active:cursor-grabbing" title="Arrastar pasta" aria-label="Arrastar pasta"><GripVertical size={18} /></span><button type="button" onClick={() => setSelectedFolderId(folder.id)} className="min-w-0 flex-1 text-left"><h4 className="truncate font-semibold text-[var(--text-primary)]">{folder.name}</h4><p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><CalendarDays size={13} />{formatDate(folder.occurredAt)}</p></button><button type="button" onClick={() => { setSelectedFolderId(folder.id); setFolderDraft({ name: folder.name, occurredAt: folder.occurredAt, serviceLabel: folder.serviceLabel ?? '', notes: folder.notes ?? '' }); setFolderModal('edit') }} disabled={!canEdit} className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--primary)]" aria-label={`Editar ${folder.name}`}><Edit3 size={15} /></button></div><div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-secondary)]"><span className="truncate">{folder.serviceLabel || 'Sem procedimento definido'}</span><span className="inline-flex shrink-0 items-center gap-1"><Images size={13} />{folder.media.length}</span></div></article>)}</div>}
            </section>

            {selectedFolder && <section className="mt-8 border-t border-[var(--border)] pt-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><button type="button" onClick={() => setSelectedFolderId(null)} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"><ArrowLeft size={14} /> Todas as pastas</button><h3 className="text-xl font-semibold text-[var(--text-primary)]">{selectedFolder.name}</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{formatDate(selectedFolder.occurredAt)}{selectedFolder.serviceLabel ? ` · ${selectedFolder.serviceLabel}` : ''}</p></div><div className="flex gap-2"><button type="button" onClick={openEditFolder} disabled={!canEdit} className={`${buttonClass} border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]`}><Pencil size={15} /> Editar pasta</button><button type="button" onClick={() => void removeFolder()} disabled={!canEdit} className={`${buttonClass} border border-[var(--border)] text-[var(--destructive)] hover:bg-[var(--bg-hover)]`}><Trash2 size={15} /> Excluir pasta</button></div></div>{selectedFolder.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[var(--bg-input)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">{selectedFolder.notes}</p>}<div className="mt-6 flex flex-wrap items-end justify-between gap-3"><div><h4 className="text-lg font-semibold text-[var(--text-primary)]">Linha do tempo</h4><p className="mt-1 text-sm text-[var(--text-secondary)]">Antes, acompanhamento e depois em ordem de data.</p></div><span className="text-xs text-[var(--text-tertiary)]">{selectedFolder.media.length}/100 imagens</span></div>{canEdit && <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-medium)] bg-[var(--bg-input)] p-4"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"><label className="text-xs font-medium text-[var(--text-secondary)]">Etapa<select value={uploadStage} onChange={(event) => setUploadStage(event.target.value as Stage)} className={`${inputClass} mt-1.5`}><option value="before">Antes</option><option value="progress">Acompanhamento</option><option value="after">Depois</option></select></label><label className="text-xs font-medium text-[var(--text-secondary)]">Data<input type="date" value={uploadDate} onChange={(event) => setUploadDate(event.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="text-xs font-medium text-[var(--text-secondary)]">Nota curta<input value={uploadNote} onChange={(event) => setUploadNote(event.target.value)} placeholder="Opcional" className={`${inputClass} mt-1.5`} /></label><label className={`${buttonClass} cursor-pointer border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]`}><Upload size={16} />{file ? 'Trocar imagem' : 'Escolher imagem'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label></div>{file && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"><span className="truncate">{file.name}</span><button type="button" onClick={() => setFile(null)} className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)]"><X size={14} /> remover</button><button type="button" onClick={() => void uploadMedia()} disabled={uploading} className={`${primaryButtonClass} min-h-9`}>{uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} Adicionar à timeline</button></div>}</div>}<div className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-[var(--border)]">{selectedFolder.media.length === 0 && <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-6 pl-8 text-sm text-[var(--text-secondary)]"><span className="absolute left-1.5 top-6 h-2 w-2 rounded-full bg-[var(--border-medium)]" />Adicione a primeira imagem para iniciar a linha do tempo.</div>}{selectedFolder.media.map((media) => <article key={media.id} className="relative grid gap-3 pl-8 sm:grid-cols-[128px_minmax(0,1fr)]"><span className="absolute left-1 top-4 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--primary)] ring-1 ring-[var(--primary)]" /><img src={`/api/client-folders/media/${selectedFolder.id}/${media.id}`} alt={`${stageLabels[media.stage]} — ${formatDate(media.capturedAt)}`} width={128} height={96} className="h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] object-cover" /><div className="min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${stageColors[media.stage]}`}>{stageLabels[media.stage]}</span><span className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)]"><CalendarDays size={13} />{formatDate(media.capturedAt)}</span><button type="button" onClick={() => void removeMedia(media.id)} disabled={!canEdit} className="ml-auto rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--destructive)]" aria-label="Remover imagem"><Trash2 size={14} /></button></div>{media.note && <p className="mt-2 text-sm text-[var(--text-secondary)]">{media.note}</p>}</div></article>)}</div></section>}
          </>}
        </main>
      </div>
      <p className="flex items-center gap-1 border-t border-[var(--border)] bg-[var(--bg-card)] px-5 py-3 text-xs text-[var(--text-tertiary)] sm:px-8"><Link2 size={13} /> Use o editor do site para decidir quais pastas autorizadas aparecem na landing.</p>
      {clientModalView}
      {folderModalView}
    </div>
  )
}
