'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Download, RefreshCw, ArrowUpDown, ChevronUp, ChevronDown, CircleDot, CheckCircle2, Phone, Star, XCircle } from 'lucide-react'
import { crmPublicEnv } from '@/lib/public-env'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: string
  status: string
  notes: string | null
  createdAt: string
  convertedAt: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CircleDot }> = {
  new: { label: 'Novo', color: 'text-blue-400 bg-blue-500/10 dark:bg-blue-500/20', icon: CircleDot },
  contacted: { label: 'Contatado', color: 'text-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20', icon: Phone },
  qualified: { label: 'Qualificado', color: 'text-purple-400 bg-purple-500/10 dark:bg-purple-500/20', icon: Star },
  converted: { label: 'Convertido', color: 'text-green-400 bg-green-500/10 dark:bg-green-500/20', icon: CheckCircle2 },
  lost: { label: 'Perdido', color: 'text-red-400 bg-red-500/10 dark:bg-red-500/20', icon: XCircle },
}

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram', google_ads: 'Google Ads', referral: 'Indicação',
  website: 'Site', whatsapp: 'WhatsApp', other: 'Outro',
}

const API_URL = crmPublicEnv.apiBaseUrl

export function LeadsTable() {
  const { accessToken, status } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [statusFilter, setStatusFilter] = useState('')

  const fetchLeads = useCallback(async () => {
    if (!accessToken) { setLoading(false); return }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`${API_URL}/api/v1/leads?${params}&limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { data: Lead[] }
      setLeads(data.data ?? [])
    } catch {
      toast.error('Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }, [accessToken, statusFilter])

  useEffect(() => {
    if (status === 'loading') return
    fetchLeads()
  }, [fetchLeads, status])

  const handleStatusChange = async (id: string, status: string) => {
    if (!accessToken) return
    try {
      await fetch(`${API_URL}/api/v1/leads/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      toast.success('Status atualizado')
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleExport = async () => {
    if (!accessToken) return
    try {
      const res = await fetch(`${API_URL}/api/v1/leads/export`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  const columns: ColumnDef<Lead>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} className="rounded accent-rose-gold" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="rounded accent-rose-gold" />
      ),
      size: 40,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 hover:text-rose-gold transition-colors">
          Nome {column.getIsSorted() === 'asc' ? <ChevronUp size={13} /> : column.getIsSorted() === 'desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-40" />}
        </button>
      ),
      cell: info => (
        <div>
          <p className="font-medium text-charcoal dark:text-charcoal-100">{info.getValue() as string}</p>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{info.row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Telefone',
      cell: info => (
        <a href={`https://wa.me/55${(info.getValue() as string ?? '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-rose-gold hover:underline">
          {info.getValue() as string ?? '-'}
        </a>
      ),
    },
    {
      accessorKey: 'source',
      header: 'Origem',
      cell: info => <span className="text-sm text-charcoal-500 dark:text-charcoal-400">{SOURCE_LABELS[info.getValue() as string] ?? info.getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: info => {
        const status = info.getValue() as string
        const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new
        return (
          <div className="relative">
            <select
              value={status}
              onChange={e => handleStatusChange(info.row.original.id, e.target.value)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border border-transparent outline-none cursor-pointer shadow-[0_8px_20px_-18px_rgba(0,0,0,0.6)] backdrop-blur appearance-none pr-7 transition-all duration-150 ${cfg.color}`}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k} className="bg-white dark:bg-charcoal-900 text-charcoal dark:text-charcoal-100">
                  {v.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-current opacity-70">▾</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 hover:text-rose-gold transition-colors">
          Criado {column.getIsSorted() === 'asc' ? <ChevronUp size={13} /> : column.getIsSorted() === 'desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-40" />}
        </button>
      ),
      cell: info => (
        <span className="text-xs text-charcoal-400 dark:text-charcoal-500">
          {formatDistanceToNow(new Date(info.getValue() as string), { locale: ptBR, addSuffix: true })}
        </span>
      ),
      sortingFn: 'datetime',
    },
  ]

  const table = useReactTable({
    data: leads,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Buscar por nome, email..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 text-charcoal dark:text-charcoal-100 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-rose-gold/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-blush-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 text-charcoal dark:text-charcoal-100 focus:outline-none focus:ring-2 focus:ring-rose-gold/40"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={fetchLeads} className="p-2 rounded-lg border border-blush-300 dark:border-charcoal-600 text-charcoal-400 hover:text-rose-gold transition-colors" title="Atualizar">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-rose-gold text-white hover:bg-rose-gold-500 transition-colors font-medium">
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-blush-200 dark:border-charcoal-700">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-charcoal-400 dark:text-charcoal-400 uppercase tracking-wide">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-blush-100 dark:divide-charcoal-700/50">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center">
                    <div className="flex justify-center"><div className="w-6 h-6 border-2 border-rose-gold border-t-transparent rounded-full animate-spin" /></div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-charcoal-400 dark:text-charcoal-500 text-sm">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-blush-50 dark:hover:bg-charcoal-700/30 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-blush-100 dark:border-charcoal-700 flex items-center justify-between text-xs text-charcoal-400 dark:text-charcoal-500">
          <span>{table.getFilteredRowModel().rows.length} leads</span>
          <span>{table.getSelectedRowModel().rows.length} selecionados</span>
        </div>
      </div>
    </div>
  )
}
