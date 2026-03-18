import type { AppointmentStatus, LeadSource, LeadStatus } from './crm'
import type { FinancialCategory, FinancialChartPoint, FinancialCharts, FinancialSummary } from './financial'

export interface MetricsPeriod {
  key: 'month' | 'last30d'
  from: string
  to: string
  timezone: string
}

export interface CountByStatus<TStatus extends string> {
  status: TStatus
  count: number
}

export interface CountBySource<TSource extends string> {
  source: TSource
  count: number
}

export interface ReferrerCount {
  referrer: string
  count: number
}

export interface HeatmapPoint {
  hour: number
  count: number
}

export interface ActivityItem {
  id: string
  type: 'lead' | 'appointment' | 'financial' | 'security'
  title: string
  description: string
  timestamp: string
}

export interface LeadMetrics {
  total: number
  createdInPeriod: number
  converted: number
  convertedInPeriod: number
  conversionRate: number
  byStatus: CountByStatus<LeadStatus>[]
  bySource: CountBySource<LeadSource>[]
}

export interface AppointmentMetrics {
  upcoming: number
  scheduledInPeriod: number
  byStatus: CountByStatus<AppointmentStatus>[]
}

export interface AnalyticsMetrics {
  sessions30d: number
  uniqueReferrers: number
  bounceRate: number
  topReferrers: ReferrerCount[]
  heatmap: HeatmapPoint[]
  funnel: {
    sessions: number
    leads: number
    converted: number
    conversionRate: number
  }
}

export interface LeadFunnelMetrics {
  new: number
  contacted: number
  qualified: number
  converted: number
  lost: number
}

export interface MetricsOverview {
  period: MetricsPeriod
  leads: LeadMetrics
  appointments: AppointmentMetrics
  financial: FinancialSummary
  charts: FinancialCharts
  analytics: AnalyticsMetrics
  funnel: LeadFunnelMetrics
  recentActivity: ActivityItem[]
}

export interface FinancialCategoryAmount {
  category: FinancialCategory
  label: string
  amount: number
}

export type DashboardFinancialChart = FinancialChartPoint
