'use client'

import type { ActivityItem } from '@viviani/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, DollarSign, Shield, Users } from 'lucide-react'
import { crmSoftListItem } from '@/components/ui/listStyles'

const ICONS = {
  lead: { icon: Users, color: 'text-blue-400 bg-blue-500/10' },
  appointment: { icon: Calendar, color: 'text-rose-gold bg-rose-gold/10' },
  financial: { icon: DollarSign, color: 'text-green-500 bg-green-500/10' },
  security: { icon: Shield, color: 'text-red-400 bg-red-500/10' },
} as const

interface RecentActivityProps {
  items: ActivityItem[]
  loading?: boolean
}

export function RecentActivity({ items, loading = false }: RecentActivityProps) {
  return (
    <div className="card-dark p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal dark:text-charcoal-100">
        Atividade recente
      </h3>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-blush-100 dark:bg-charcoal-700/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-blush-200 px-4 py-8 text-center text-sm text-charcoal-400 dark:border-charcoal-700 dark:text-charcoal-500">
          Nenhum evento operacional recente.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const { icon: Icon, color } = ICONS[item.type]
            return (
              <div key={item.id} className={`${crmSoftListItem} flex items-start gap-3`}>
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal dark:text-charcoal-100">{item.title}</p>
                  <p className="truncate text-xs text-charcoal-400 dark:text-charcoal-500">{item.description}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-charcoal-400 dark:text-charcoal-500">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
