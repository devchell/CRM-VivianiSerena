'use client'

import CountUp from 'react-countup'
import type { MetricsOverview } from '@viviani/types'
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react'
import { formatCurrency } from '@viviani/utils'

interface StatsCardsProps {
  overview: MetricsOverview | null
  loading?: boolean
}

export function StatsCards({ overview, loading = false }: StatsCardsProps) {
  const cards = [
    {
      title: 'Leads no período',
      value: overview?.leads.createdInPeriod ?? 0,
      helper: `${overview?.leads.total ?? 0} leads totais`,
      icon: Users,
      tone: 'text-[var(--primary)] bg-[var(--accent)]',
      format: 'number' as const,
    },
    {
      title: 'Agendamentos ativos',
      value: overview?.appointments.upcoming ?? 0,
      helper: `${overview?.appointments.scheduledInPeriod ?? 0} no período`,
      icon: Calendar,
      tone: 'text-[var(--primary)] bg-[var(--accent)]',
      format: 'number' as const,
    },
    {
      title: 'Conversão de leads',
      value: overview?.leads.conversionRate ?? 0,
      helper: `${overview?.leads.convertedInPeriod ?? 0} convertidos no período`,
      icon: TrendingUp,
      tone: 'text-[var(--success)] bg-[var(--success-bg)]',
      format: 'percent' as const,
    },
    {
      title: 'Receita do período',
      value: overview?.financial.income ?? 0,
      helper: `Lucro: ${formatCurrency(overview?.financial.profit ?? 0)}`,
      icon: DollarSign,
      tone: 'text-[var(--success)] bg-[var(--success-bg)]',
      format: 'currency' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.title} className="card-dark p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${card.tone}`}>
                <Icon size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-400">{card.title}</p>
            <div className="mt-1 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
              {loading ? (
                <div className="h-8 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800/40" />
              ) : card.format === 'currency' ? (
                formatCurrency(card.value)
              ) : card.format === 'percent' ? (
                <>
                  <CountUp end={card.value} decimals={1} duration={0.8} preserveValue />%
                </>
              ) : (
                <CountUp end={card.value} duration={0.8} preserveValue />
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{card.helper}</p>
          </div>
        )
      })}
    </div>
  )
}
