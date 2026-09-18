'use client'

import type { DashboardFinancialChart } from '@viviani/types'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@viviani/utils'

interface RevenueChartProps {
  data: DashboardFinancialChart[]
  loading?: boolean
}

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
  return (
    <div className="card-dark p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
        Receita x despesas
      </h3>

      {loading ? (
        <div className="h-[220px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/40" />
      ) : data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-400">
          Sem dados financeiros consolidados para exibir.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--chart-axis)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'income' ? 'Receita' : 'Despesas',
              ]}
              contentStyle={{
                background: 'var(--tooltip-bg)',
                border: '1px solid var(--chart-tooltip-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend formatter={(value) => (value === 'income' ? 'Receita' : 'Despesas')} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="income" stroke="var(--success)" strokeWidth={2} fill="var(--success-bg)" dot={false} />
            <Area type="monotone" dataKey="expenses" stroke="var(--destructive)" strokeWidth={2} fill="var(--warning-bg)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
