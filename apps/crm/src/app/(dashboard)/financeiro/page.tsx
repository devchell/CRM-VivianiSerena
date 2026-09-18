'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Financial, FinancialCharts, FinancialSummary, TransactionType } from '@viviani/types'
import { FINANCIAL_CATEGORIES_BY_TYPE, FINANCIAL_CATEGORY_LABELS } from '@viviani/types'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Archive, ChevronDown, Download, FileText, Pencil, Plus, X } from 'lucide-react'
import { formatCurrency } from '@viviani/utils'
import { toast } from 'sonner'
import { useAuth } from '@/lib/useAuth'
import { apiFetchJson, buildAuthHeaders, invalidateApiCache } from '@/lib/api-client'
import { useRealtimeRefresh } from '@/lib/realtime'
import { useFinancialColors } from '@/hooks/useFinancialColors'
import {
  crmListBody,
  crmListCell,
  crmListEmpty,
  crmFieldSelect,
  crmFieldSelectIcon,
  crmFieldSelectWrapper,
  crmListFooter,
  crmListHeaderCell,
  crmListRow,
  crmListSearchInput,
  crmListSearchWrapper,
  crmListSelect,
  crmListSelectIcon,
  crmListSelectWrapper,
  crmListShell,
  crmListTableHead,
  crmListToolbar,
} from '@/components/ui/listStyles'

type FinancialRecord = Omit<Financial, 'date'> & { date: string }

// ── Paletas de cores para os gráficos de rosca ──────────────────────────
const RECEITA_COLORS = [
  '#16A34A', '#15803D', '#14532D',
  '#0D9488', '#0F766E', '#134E4A',
  '#059669', '#047857', '#065F46',
  '#0891B2',
]

const DESPESA_COLORS = [
  '#DC2626', '#B91C1C', '#991B1B',
  '#EA580C', '#C2410C', '#9A3412',
  '#D97706', '#B45309', '#92400E',
  '#EAB308',
]

// ── DonutChart reutilizável ─────────────────────────────────────────────
interface DonutItem { description: string; value: number; date: string }
interface DonutEntry { name: string; value: number; color: string; items: DonutItem[] }

type DonutTooltipPayload = { payload: DonutEntry }

function DonutTooltip({ active, payload }: { active?: boolean; payload?: DonutTooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const data: DonutEntry = payload[0].payload

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800" style={{ maxWidth: 240, minWidth: 170 }}>
      <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2 dark:border-slate-700">
        <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: data.color }} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">{data.name}</span>
      </div>
      <div className="mb-2 flex flex-col gap-1">
        {data.items.slice(0, 6).map((item, i) => (
          <div key={i} className="flex items-baseline justify-between gap-2">
            <span className="flex-1 truncate text-[11px] text-slate-500 dark:text-slate-400" style={{ maxWidth: 120 }}>
              {item.description}
            </span>
            <span className="flex-shrink-0 text-[11px] font-medium tabular-nums text-slate-700 dark:text-slate-300">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
        {data.items.length > 6 && (
          <span className="text-[11px] text-slate-400">+{data.items.length - 6} mais...</span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
        <span className="text-xs font-medium text-slate-500">Total</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: data.color }}>
          {formatCurrency(data.value)}
        </span>
      </div>
    </div>
  )
}

function DonutChart({ title, subtitle, data, totalLabel, totalValue, emptyMessage }: {
  title: string
  subtitle?: string
  data: DonutEntry[]
  totalLabel?: string
  totalValue?: string
  emptyMessage?: string
}) {
  const hasData = data.length > 0 && data.some(d => d.value > 0)

  return (
    <div className="card-dark flex flex-col gap-3 rounded-lg p-5 shadow-sm">
      <div>
        <h3 className="font-heading text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
      </div>

      {!hasData ? (
        <div className="flex min-h-[180px] flex-1 items-center justify-center text-xs text-slate-400">
          {emptyMessage ?? 'Sem dados no período'}
        </div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {totalValue && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400">{totalLabel ?? 'Total'}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{totalValue}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="flex-shrink-0 text-xs font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Seção dos 3 gráficos de rosca ───────────────────────────────────────
function DonutSection({ transactions, loading }: { transactions: FinancialRecord[]; loading: boolean }) {
  const { receitaData, despesaData, geralData, totalReceita, totalDespesa, totalGeral } = useMemo(() => {
    const byCategory: Record<string, { type: 'income' | 'expense'; amount: number; items: DonutItem[] }> = {}
    for (const t of transactions) {
      const key = `${t.type}:${t.category}`
      if (!byCategory[key]) byCategory[key] = { type: t.type, amount: 0, items: [] }
      const amt = Number(t.amount)
      byCategory[key].amount += amt
      byCategory[key].items.push({
        description: t.description || FINANCIAL_CATEGORY_LABELS[t.category as keyof typeof FINANCIAL_CATEGORY_LABELS] || 'Sem descrição',
        value: amt,
        date: new Date(t.date).toLocaleDateString('pt-BR'),
      })
    }

    const receita: DonutEntry[] = []
    const despesa: DonutEntry[] = []
    let ri = 0, di = 0

    for (const [key, val] of Object.entries(byCategory)) {
      const cat = key.split(':')[1] as keyof typeof FINANCIAL_CATEGORY_LABELS
      const name = FINANCIAL_CATEGORY_LABELS[cat] ?? cat
      if (val.type === 'income') {
        receita.push({ name, value: val.amount, color: RECEITA_COLORS[ri++ % RECEITA_COLORS.length], items: val.items })
      } else {
        despesa.push({ name, value: val.amount, color: DESPESA_COLORS[di++ % DESPESA_COLORS.length], items: val.items })
      }
    }

    receita.sort((a, b) => b.value - a.value)
    despesa.sort((a, b) => b.value - a.value)

    const totalR = receita.reduce((s, d) => s + d.value, 0)
    const totalD = despesa.reduce((s, d) => s + d.value, 0)

    return {
      receitaData: receita,
      despesaData: despesa,
      geralData: [...receita, ...despesa],
      totalReceita: totalR,
      totalDespesa: totalD,
      totalGeral: totalR + totalD,
    }
  }, [transactions])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-[340px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <DonutChart
        title="Visão geral"
        subtitle="Receitas e despesas por categoria"
        data={geralData}
        totalLabel="Movimentação"
        totalValue={formatCurrency(totalGeral)}
        emptyMessage="Sem lançamentos no período"
      />
      <DonutChart
        title="Receitas"
        subtitle="Por categoria"
        data={receitaData}
        totalLabel="Total receitas"
        totalValue={formatCurrency(totalReceita)}
        emptyMessage="Sem receitas no período"
      />
      <DonutChart
        title="Despesas"
        subtitle="Por categoria"
        data={despesaData}
        totalLabel="Total despesas"
        totalValue={formatCurrency(totalDespesa)}
        emptyMessage="Sem despesas no período"
      />
    </div>
  )
}

interface FinancialListResponse {
  success: true
  data: FinancialRecord[]
}

interface SummaryResponse {
  success: true
  data: FinancialSummary
}

interface ChartsResponse {
  success: true
  data: FinancialCharts
}

interface FormState {
  type: TransactionType
  category: FinancialRecord['category']
  amount: string
  description: string
  date: string
  recurring: boolean
  tags: string
}

const PAGE_SIZE = 20

function defaultForm(type: TransactionType = 'income'): FormState {
  return {
    type,
    category: FINANCIAL_CATEGORIES_BY_TYPE[type][0].value,
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    recurring: false,
    tags: '',
  }
}

export default function FinanceiroPage() {
  const { accessToken, hasPermission } = useAuth()
  const colors = useFinancialColors()
  const canCreateFinancial = hasPermission('financeiro.create')
  const canUpdateFinancial = hasPermission('financeiro.update')
  const canDeleteFinancial = hasPermission('financeiro.delete')
  const canExportFinancial = hasPermission('financeiro.export')
  const [transactions, setTransactions] = useState<FinancialRecord[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [charts, setCharts] = useState<FinancialCharts | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FinancialRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm())

  useEffect(() => {
    if (!accessToken) return

    let active = true
    setLoading(true)

    Promise.all([
      apiFetchJson<FinancialListResponse>('/api/v1/financials?limit=200', {
        headers: buildAuthHeaders(accessToken),
      }),
      apiFetchJson<SummaryResponse>('/api/v1/financials/summary', {
        headers: buildAuthHeaders(accessToken),
      }),
      apiFetchJson<ChartsResponse>('/api/v1/financials/charts', {
        headers: buildAuthHeaders(accessToken),
      }),
    ])
      .then(([transactionsResponse, summaryResponse, chartsResponse]) => {
        if (!active) return
        setTransactions(transactionsResponse.data)
        setSummary(summaryResponse.data)
        setCharts(chartsResponse.data)
      })
      .catch((error) => {
        if (!active) return
        toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o financeiro.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken])

  const categories = summary?.categories ?? FINANCIAL_CATEGORIES_BY_TYPE

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (typeFilter !== 'all' && transaction.type !== typeFilter) return false
      if (categoryFilter !== 'all' && transaction.category !== categoryFilter) return false
      if (!search.trim()) return true

      const term = search.toLowerCase()
      return (
        transaction.description.toLowerCase().includes(term) ||
        FINANCIAL_CATEGORY_LABELS[transaction.category].toLowerCase().includes(term)
      )
    })
  }, [categoryFilter, search, transactions, typeFilter])

  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [typeFilter, categoryFilter, search])

  const pagedTransactions = filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function openCreateModal(type: TransactionType = 'income') {
    if (!canCreateFinancial) return
    setEditing(null)
    setForm(defaultForm(type))
    setShowModal(true)
  }

  function openEditModal(transaction: FinancialRecord) {
    if (!canUpdateFinancial) return
    setEditing(transaction)
    setForm({
      type: transaction.type,
      category: transaction.category,
      amount: Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      description: transaction.description,
      date: transaction.date.slice(0, 10),
      recurring: transaction.recurring,
      tags: transaction.tags.join(', '),
    })
    setShowModal(true)
  }

  async function refreshFinancialData() {
    if (!accessToken) return

    const [transactionsResponse, summaryResponse, chartsResponse] = await Promise.all([
      apiFetchJson<FinancialListResponse>('/api/v1/financials?limit=200', {
        headers: buildAuthHeaders(accessToken),
      }),
      apiFetchJson<SummaryResponse>('/api/v1/financials/summary', {
        headers: buildAuthHeaders(accessToken),
      }),
      apiFetchJson<ChartsResponse>('/api/v1/financials/charts', {
        headers: buildAuthHeaders(accessToken),
      }),
    ])

    setTransactions(transactionsResponse.data)
    setSummary(summaryResponse.data)
    setCharts(chartsResponse.data)
  }

  useRealtimeRefresh(refreshFinancialData, ['financials'])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || (editing ? !canUpdateFinancial : !canCreateFinancial)) return

    setSubmitting(true)
    try {
      const payload = {
        type: form.type,
        category: form.category,
        amount: Number(form.amount.replace(/\./g, '').replace(',', '.')),
        description: form.description.trim(),
        date: new Date(`${form.date}T12:00:00`).toISOString(),
        recurring: form.recurring,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      }

      if (!payload.amount || Number.isNaN(payload.amount)) {
        throw new Error('Informe um valor válido.')
      }

      await apiFetchJson(editing ? `/api/v1/financials/${editing.id}` : '/api/v1/financials', {
        method: editing ? 'PATCH' : 'POST',
        headers: buildAuthHeaders(accessToken, 'application/json'),
        body: JSON.stringify(payload),
      })

      invalidateApiCache('/financials')
      await refreshFinancialData()
      setShowModal(false)
      toast.success(editing ? 'Lançamento atualizado.' : 'Lançamento criado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar lançamento.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(transactionId: string) {
    if (!accessToken || !canDeleteFinancial) return
    if (!window.confirm('Arquivar este lançamento? O histórico será preservado e ele deixará de aparecer nos indicadores.')) return

    try {
      await apiFetchJson(`/api/v1/financials/${transactionId}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(accessToken),
      })
      invalidateApiCache('/financials')
      await refreshFinancialData()
      toast.success('Lançamento arquivado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao arquivar lançamento.')
    }
  }

  function handleExportCsv() {
    if (!canExportFinancial) return
    const header = 'Data,Tipo,Categoria,Descrição,Valor,Recorrente\n'
    const rows = filteredTransactions.map((transaction) => {
      return [
        new Date(transaction.date).toLocaleDateString('pt-BR'),
        transaction.type === 'income' ? 'Receita' : 'Despesa',
        FINANCIAL_CATEGORY_LABELS[transaction.category],
        `"${transaction.description.replace(/"/g, '""')}"`,
        Number(transaction.amount).toFixed(2),
        transaction.recurring ? 'Sim' : 'Não',
      ].join(',')
    })
    const blob = new Blob(['\ufeff' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `financeiro-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function handleExportPdf() {
    if (!canExportFinancial) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Relatório financeiro', 14, 18)
    doc.setFontSize(10)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 25)

    autoTable(doc, {
      startY: 32,
      head: [['Receita', 'Despesas', 'Lucro', 'Ticket médio']],
      body: [[
        formatCurrency(summary?.income ?? 0),
        formatCurrency(summary?.expenses ?? 0),
        formatCurrency(summary?.profit ?? 0),
        formatCurrency(summary?.averageTicket ?? 0),
      ]],
    })

    autoTable(doc, {
      startY: ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40) + 10,
      head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']],
      body: filteredTransactions.slice(0, 100).map((transaction) => [
        new Date(transaction.date).toLocaleDateString('pt-BR'),
        transaction.type === 'income' ? 'Receita' : 'Despesa',
        FINANCIAL_CATEGORY_LABELS[transaction.category],
        transaction.description,
        formatCurrency(transaction.amount),
      ]),
    })

    doc.save(`financeiro-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const kpis = [
    { label: 'Receita', value: summary?.income ?? 0, color: colors.income.text, background: colors.income.bg },
    { label: 'Despesas', value: summary?.expenses ?? 0, color: colors.expense.text, background: colors.expense.bg },
    { label: 'Lucro', value: summary?.profit ?? 0, color: (summary?.profit ?? 0) >= 0 ? colors.profit.text : colors.expense.text, background: (summary?.profit ?? 0) >= 0 ? colors.profit.bg : colors.expense.bg },
    { label: 'Ticket médio', value: summary?.averageTicket ?? 0, color: 'var(--fin-neutral-text)', background: 'var(--fin-neutral-bg)' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Financeiro</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportCsv} disabled={!canExportFinancial} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white/75 px-4 py-2 text-sm text-slate-400 shadow-sm transition-colors hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/65 dark:text-slate-400">
            <Download size={14} />
            CSV
          </button>
          <button onClick={() => void handleExportPdf()} disabled={!canExportFinancial} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white/75 px-4 py-2 text-sm text-slate-400 shadow-sm transition-colors hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/65 dark:text-slate-400">
            <FileText size={14} />
            PDF
          </button>
          <button onClick={() => openCreateModal('income')} disabled={!canCreateFinancial} className="flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={16} />
            Novo lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card-dark rounded-lg p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: kpi.background }}>
              <span className="text-sm font-semibold" style={{ color: kpi.color }}>
                R$
              </span>
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400">{kpi.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
              {loading ? '...' : formatCurrency(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Evolução mensal */}
      <div className="card-dark rounded-lg p-5 shadow-sm">
        <h3 className="mb-4 font-heading text-sm font-semibold text-slate-900 dark:text-slate-100">
          Evolução mensal
        </h3>
        {loading ? (
          <div className="h-[240px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/40" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts?.monthly ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Receita' : 'Despesas']} />
              <Legend formatter={(value) => (value === 'income' ? 'Receita' : 'Despesas')} />
              <Bar dataKey="income" fill={colors.area.income} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill={colors.area.expense} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3 gráficos de rosca */}
      <DonutSection transactions={transactions} loading={loading} />

      <div className={crmListShell}>
        <div className={crmListToolbar}>
          <div className={crmListSearchWrapper}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar descrição ou categoria"
              className={crmListSearchInput}
            />
          </div>
          <div className={crmListSelectWrapper}>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'all' | TransactionType)}
              className={crmListSelect}
            >
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
          <div className={crmListSelectWrapper}>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={crmListSelect}
            >
              <option value="all">Todas as categorias</option>
              {[...categories.income, ...categories.expense].map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={crmListSelectIcon} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={crmListTableHead}>
              <tr>
                {['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', ''].map((header) => (
                  <th key={header} className={crmListHeaderCell}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={crmListBody}>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-slate-100 dark:bg-slate-800/30" />
                    </td>
                  </tr>
                ))
              ) : pagedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className={crmListEmpty}>
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                pagedTransactions.map((transaction) => (
                  <tr key={transaction.id} className={crmListRow}>
                    <td className={crmListCell}>
                      <span className="text-xs text-slate-400 dark:text-slate-400">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className={crmListCell}>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={transaction.type === 'income'
                        ? { color: colors.income.text, background: colors.income.bg }
                        : { color: colors.expense.text, background: colors.expense.bg }}>
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={crmListCell}>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {FINANCIAL_CATEGORY_LABELS[transaction.category]}
                      </span>
                    </td>
                    <td className={crmListCell}>
                      <span className="text-sm text-slate-900 dark:text-slate-100">{transaction.description}</span>
                    </td>
                    <td className={crmListCell}>
                      <span className="text-sm font-semibold" style={{ color: transaction.type === 'income' ? colors.income.text : colors.expense.text }}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className={crmListCell}>
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => openEditModal(transaction)} disabled={!canUpdateFinancial} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => void handleDelete(transaction.id)} disabled={!canDeleteFinancial} title="Arquivar lançamento" aria-label="Arquivar lançamento" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed">
                          <Archive size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={crmListFooter}>
          <span>{filteredTransactions.length} lançamentos</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded px-2 py-1 disabled:opacity-30">
              Anterior
            </button>
            <span>Página {page + 1} de {pageCount}</span>
            <button disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} className="rounded px-2 py-1 disabled:opacity-30">
              Próxima
            </button>
          </div>
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="card-dark w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-700">
              <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editing ? 'Editar lançamento' : 'Novo lançamento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-3">
                {(['income', 'expense'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((current) => ({
                      ...current,
                      type,
                      category: FINANCIAL_CATEGORIES_BY_TYPE[type][0].value,
                    }))}
                    className="rounded border-2 px-4 py-3 text-sm font-semibold transition-all"
                    style={form.type === type ? {
                      borderColor: type === 'income' ? colors.income.border : colors.expense.border,
                      background: type === 'income' ? colors.income.bg : colors.expense.bg,
                      color: type === 'income' ? colors.income.text : colors.expense.text,
                    } : undefined}
                  >
                    {type === 'income' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">Categoria</label>
                <div className={crmFieldSelectWrapper}>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as FinancialRecord['category'] }))}
                    className={crmFieldSelect}
                  >
                    {categories[form.type].map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className={crmFieldSelectIcon} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">Valor</label>
                  <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800">
                    <span className="select-none pl-3 text-sm font-medium text-slate-400 dark:text-slate-500">R$</span>
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={form.amount}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '')
                        if (!digits) {
                          setForm((current) => ({ ...current, amount: '' }))
                          return
                        }
                        const cents = parseInt(digits, 10)
                        const formatted = (cents / 100).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                        setForm((current) => ({ ...current, amount: formatted }))
                      }}
                      className="w-full border-none bg-transparent px-2 py-2 text-right text-sm tabular-nums text-slate-900 focus:outline-none dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">Data</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">Descrição</label>
                <input
                  required
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400 dark:text-slate-400">Tags</label>
                <input
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="Ex: pix, recorrente, parceria"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(event) => setForm((current) => ({ ...current, recurring: event.target.checked }))}
                />
                Lançamento recorrente
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.amount.trim() || !form.description.trim() || !form.date}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
