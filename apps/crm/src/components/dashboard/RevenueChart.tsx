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
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal dark:text-charcoal-100">
        Receita x despesas
      </h3>

      {loading ? (
        <div className="h-[220px] animate-pulse rounded-lg bg-blush-100 dark:bg-charcoal-700/40" />
      ) : data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-blush-200 text-sm text-charcoal-400 dark:border-[#3a3835] dark:text-charcoal-500">
          Sem dados financeiros consolidados para exibir.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="dashboard-income" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--fin-area-income)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--fin-area-income)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dashboard-expenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--fin-area-expense)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--fin-area-expense)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#787878' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: '#787878' }}
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
                background: 'var(--tooltip-bg, #fff)',
                border: '1px solid rgba(201,150,122,0.3)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend formatter={(value) => (value === 'income' ? 'Receita' : 'Despesas')} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="income" stroke="var(--fin-area-income)" strokeWidth={2} fill="url(#dashboard-income)" dot={false} />
            <Area type="monotone" dataKey="expenses" stroke="var(--fin-area-expense)" strokeWidth={2} fill="url(#dashboard-expenses)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
