'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MetricsOverview } from '@viviani/types'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { LeadsFunnel } from '@/components/dashboard/LeadsFunnel'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { apiFetchJson } from '@/lib/api-client'
import { useAuth } from '@/lib/useAuth'
import { useRealtimeRefresh } from '@/lib/realtime'

export default function DashboardPage() {
  const { accessToken } = useAuth()
  const [overview, setOverview] = useState<MetricsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshDashboard = useCallback(async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiFetchJson<{ success: true; data: MetricsOverview }>('/api/v1/metrics/overview?period=month', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setOverview(response.data)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível carregar o dashboard.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void refreshDashboard()
  }, [refreshDashboard])

  useRealtimeRefresh(refreshDashboard, ['leads', 'appointments', 'financials', 'analytics', 'dispatches'])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Acompanhe leads, agenda, conversão e financeiro em um único lugar.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <StatsCards overview={overview} loading={loading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueChart data={overview?.charts.monthly ?? []} loading={loading} />
        <LeadsFunnel data={overview?.funnel} loading={loading} />
      </div>

      <RecentActivity items={overview?.recentActivity ?? []} loading={loading} />
    </div>
  )
}
