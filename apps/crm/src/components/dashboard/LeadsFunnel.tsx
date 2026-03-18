'use client'

import type { LeadFunnelMetrics } from '@viviani/types'
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

  const colors = [
    'var(--funnel-new)',
    'var(--funnel-contacted)',
    'var(--funnel-qualified)',
    'var(--funnel-converted)',
    'var(--funnel-lost)',
  ]

  return (
    <div className="card-dark p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal dark:text-charcoal-100">
        Funil comercial
      </h3>

      {loading ? (
        <div className="h-[220px] animate-pulse rounded-2xl bg-blush-100 dark:bg-charcoal-700/40" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#787878' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(value: number) => [value, 'Leads']}
              contentStyle={{
                background: 'var(--tooltip-bg, #fff)',
                border: '1px solid rgba(201,150,122,0.3)',
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
