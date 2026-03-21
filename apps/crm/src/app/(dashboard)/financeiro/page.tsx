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
import { ChevronDown, Download, FileText, Pencil, Plus, Trash2, X } from 'lucide-react'
import { formatCurrency } from '@viviani/utils'
import { toast } from 'sonner'
import { useAuth } from '@/lib/useAuth'
import { apiFetchJson, buildAuthHeaders } from '@/lib/api-client'
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
      amount: transaction.amount.toFixed(2),
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || (editing ? !canUpdateFinancial : !canCreateFinancial)) return

    setSubmitting(true)
    try {
      const payload = {
        type: form.type,
        category: form.category,
        amount: Number(form.amount.replace(',', '.')),
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

    try {
      await apiFetchJson(`/api/v1/financials/${transactionId}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(accessToken),
      })
      await refreshFinancialData()
      toast.success('Lançamento removido.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover lançamento.')
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
        transaction.amount.toFixed(2),
        transaction.recurring ? 'Sim' : 'Não',
      ].join(',')
    })
    const blob = new Blob(['\ufeff' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `financeiro-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
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
    { label: 'Ticket médio', value: summary?.averageTicket ?? 0, color: 'var(--color-rose-gold, #C9967A)', background: 'rgba(201,150,122,0.1)' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-blush-200 pb-4 dark:border-[#3a3835]">
        <h1 className="font-heading text-xl font-semibold text-charcoal dark:text-charcoal-50">Financeiro</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportCsv} disabled={!canExportFinancial} className="flex items-center gap-1.5 rounded border border-blush-300 bg-white/75 px-4 py-2 text-sm text-charcoal-400 shadow-sm transition-colors hover:text-rose-gold disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#3a3835] dark:bg-[#1c1b1a]/65 dark:text-charcoal-300">
            <Download size={14} />
            CSV
          </button>
          <button onClick={() => void handleExportPdf()} disabled={!canExportFinancial} className="flex items-center gap-1.5 rounded border border-blush-300 bg-white/75 px-4 py-2 text-sm text-charcoal-400 shadow-sm transition-colors hover:text-rose-gold disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#3a3835] dark:bg-[#1c1b1a]/65 dark:text-charcoal-300">
            <FileText size={14} />
            PDF
          </button>
          <button onClick={() => openCreateModal('income')} disabled={!canCreateFinancial} className="flex items-center gap-2 rounded bg-rose-gold px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-gold-500 disabled:opacity-50 disabled:cursor-not-allowed">
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
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-400 dark:text-charcoal-300">{kpi.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-charcoal dark:text-charcoal-50">
              {loading ? '...' : formatCurrency(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card-dark rounded-lg p-5 shadow-sm">
          <h3 className="mb-4 font-heading text-sm font-semibold text-charcoal dark:text-charcoal-100">
            Evolução mensal
          </h3>
          {loading ? (
            <div className="h-[240px] animate-pulse rounded-lg bg-blush-100 dark:bg-[#252423]/40" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.monthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.1)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#787878' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#787878' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Receita' : 'Despesas']} />
                <Legend formatter={(value) => (value === 'income' ? 'Receita' : 'Despesas')} />
                <Bar dataKey="income" fill={colors.area.income} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill={colors.area.expense} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-dark rounded-lg p-5 shadow-sm">
          <h3 className="mb-4 font-heading text-sm font-semibold text-charcoal dark:text-charcoal-100">
            Despesas por categoria
          </h3>
          {loading ? (
            <div className="h-[240px] animate-pulse rounded-lg bg-blush-100 dark:bg-[#252423]/40" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={charts?.expensesByCategory ?? []} dataKey="amount" nameKey="label" innerRadius={56} outerRadius={86}>
                  {(charts?.expensesByCategory ?? []).map((entry, index) => (
                    <Cell key={entry.category} fill={colors.pie[index % colors.pie.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']} />
                <Legend formatter={(value) => String(value)} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

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
                      <div className="h-8 animate-pulse rounded bg-blush-100 dark:bg-[#252423]/30" />
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
                      <span className="text-xs text-charcoal-400 dark:text-charcoal-300">
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
                      <span className="text-xs text-charcoal-500 dark:text-charcoal-300">
                        {FINANCIAL_CATEGORY_LABELS[transaction.category]}
                      </span>
                    </td>
                    <td className={crmListCell}>
                      <span className="text-sm text-charcoal dark:text-charcoal-100">{transaction.description}</span>
                    </td>
                    <td className={crmListCell}>
                      <span className="text-sm font-semibold" style={{ color: transaction.type === 'income' ? colors.income.text : colors.expense.text }}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className={crmListCell}>
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => openEditModal(transaction)} disabled={!canUpdateFinancial} className="rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-rose-gold/10 hover:text-rose-gold disabled:opacity-40 disabled:cursor-not-allowed">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => void handleDelete(transaction.id)} disabled={!canDeleteFinancial} className="rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed">
                          <Trash2 size={13} />
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
            <div className="flex items-center justify-between border-b border-blush-200 p-6 dark:border-[#3a3835]">
              <h2 className="font-heading text-lg font-semibold text-charcoal dark:text-charcoal-50">
                {editing ? 'Editar lançamento' : 'Novo lançamento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-charcoal-400 transition-colors hover:text-charcoal dark:hover:text-charcoal-100">
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
                <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-300">Categoria</label>
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
                  <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-300">Valor</label>
                  <input
                    required
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    className="w-full rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-300">Data</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-300">Descrição</label>
                <input
                  required
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-400 dark:text-charcoal-300">Tags</label>
                <input
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="Ex: pix, recorrente, parceria"
                  className="w-full rounded-lg border border-blush-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose-gold/40 dark:border-[#3a3835] dark:bg-[#252423] dark:text-charcoal-100"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-charcoal-500 dark:text-charcoal-300">
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(event) => setForm((current) => ({ ...current, recurring: event.target.checked }))}
                />
                Lançamento recorrente
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-blush-300 px-4 py-2 text-sm text-charcoal-400 transition-colors hover:bg-blush dark:border-[#3a3835] dark:hover:bg-[#252423]">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-rose-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-gold-500 disabled:opacity-60">
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
