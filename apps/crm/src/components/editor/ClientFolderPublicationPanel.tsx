'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, FolderOpen, Globe2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/useAuth'
import { crmPublicEnv } from '@/lib/public-env'

type PublicationFolder = {
  id: string
  clientName: string
  serviceLabel: string | null
  isPublished: boolean
  hasPublicConsent: boolean
}

export function ClientFolderPublicationPanel() {
  const { accessToken, hasPermission } = useAuth()
  const [folders, setFolders] = useState<PublicationFolder[]>([])
  const [loading, setLoading] = useState(false)
  const canPublish = hasPermission('editar-site.publish')

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const response = await fetch(`${crmPublicEnv.apiBaseUrl}/api/v1/client-folders?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      })
      const payload = await response.json() as { success?: boolean; data?: PublicationFolder[]; error?: string }
      if (!response.ok || !payload.success) throw new Error(payload.error ?? `HTTP ${response.status}`)
      setFolders(payload.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar as pastas')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { void load() }, [load])

  const toggle = async (folder: PublicationFolder) => {
    if (!canPublish || !accessToken) return
    const nextPublished = !folder.isPublished
    if (nextPublished && !folder.hasPublicConsent && !window.confirm('Confirme que existe autorização para publicar as imagens desta pasta.')) return

    try {
      const response = await fetch(`${crmPublicEnv.apiBaseUrl}/api/v1/client-folders/${folder.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: nextPublished, publicConsent: nextPublished }),
      })
      const payload = await response.json() as { success?: boolean; data?: PublicationFolder; error?: string }
      if (!response.ok || !payload.success) throw new Error(payload.error ?? `HTTP ${response.status}`)
      setFolders((current) => current.map((item) => item.id === folder.id ? { ...item, isPublished: nextPublished, hasPublicConsent: nextPublished || item.hasPublicConsent } : item))
      toast.success(nextPublished ? 'Pasta publicada na landing' : 'Pasta retirada da landing')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar a publicação')
    }
  }

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-start justify-between gap-3">
        <div><p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100"><FolderOpen size={15} className="text-blue-600" /> Resultados de clientes</p><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Escolha quais pastas autorizadas aparecem na landing.</p></div>
        <Link href="/clientes" className="shrink-0 rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Abrir pastas de clientes"><ExternalLink size={15} /></Link>
      </div>
      {loading && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" /> Carregando…</p>}
      {!loading && folders.length === 0 && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Nenhuma pasta criada ainda.</p>}
      {!loading && folders.length > 0 && <div className="mt-3 space-y-1.5">{folders.slice(0, 5).map((folder) => <div key={folder.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">{folder.clientName}</p><p className="truncate text-[11px] text-slate-500">{folder.serviceLabel || 'Sem serviço definido'}</p></div><button type="button" role="switch" aria-checked={folder.isPublished} disabled={!canPublish} onClick={() => void toggle(folder)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${folder.isPublished ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}><span aria-hidden="true" className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${folder.isPublished ? 'translate-x-4' : 'translate-x-0'}`} /></button>{folder.isPublished && <Globe2 size={13} className="text-emerald-600" aria-label="Publicado" />}</div>)}</div>}
      {folders.length > 5 && <Link href="/clientes" className="mt-3 inline-block text-xs font-medium text-blue-600 hover:text-blue-700">Ver todas as pastas</Link>}
      {!canPublish && <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Seu perfil pode consultar, mas não publicar.</p>}
    </div>
  )
}
