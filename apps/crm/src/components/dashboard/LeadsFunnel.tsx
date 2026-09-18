'use client'

import type { LeadFunnelMetrics } from '@viviani/types'
import { Inbox } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const STAGES = [
  { key: 'new', label: 'Novos' },
  { key: 'contacted', label: 'Contatados' },
  { key: 'qualified', label: 'Qualificados' },
  { key: 'converted', label: 'Convertidos' },
  { key: 'lost', label: 'Perdidos' },
] as const

interface LeadsFunnelProps {
  data?: LeadFunnelMetrics
  loading?: boolean
}

export function LeadsFunnel({ data, loading = false }: LeadsFunnelProps) {
  const chartData = STAGES.map((stage) => ({
    stage: stage.label,
    count: data?.[stage.key] ?? 0,
  }))
  const totalLeads = chartData.reduce((total, stage) => total + stage.count, 0)

  const colors = [
    'var(--border-medium)',
    'var(--text-tertiary)',
    'var(--primary)',
    'var(--success)',
    'var(--destructive)',
  ]

  return (
    <div className="card-dark p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
        Funil comercial
      </h3>

      {loading ? (
        <div className="h-[220px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/40" />
      ) : totalLeads === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-center dark:border-slate-700">
          <Inbox size={26} className="mb-3 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Ainda não há leads no funil</p>
          <a href="/leads" className="mt-2 text-xs font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            Cadastrar primeiro lead
          </a>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(value: number) => [value, 'Leads']}
              contentStyle={{
                background: 'var(--tooltip-bg)',
                border: '1px solid var(--chart-tooltip-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={STAGES[index].key} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
