import type { AppointmentStatus, Prisma } from '@prisma/client'
import type {
  ActivityItem,
  AnalyticsMetrics,
  CountBySource,
  CountByStatus,
  FinancialCharts,
  FinancialSummary,
  LeadFunnelMetrics,
  LeadMetrics,
  MetricsOverview,
  MetricsPeriod,
} from '@viviani/types'
import { FINANCIAL_CATEGORY_LABELS } from '@viviani/types'
import { prisma } from '../../lib/prisma'

export const TRACKING_EMAIL_MARKER = '@tracking.internal'
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'America/Sao_Paulo'

function nowUtc(): Date {
  return new Date()
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 0, 0, 0, 0)
}

function createPeriod(key: 'month' | 'last30d' = 'month', reference = nowUtc()): MetricsPeriod {
  const from = key === 'last30d'
    ? new Date(reference.getTime() - 30 * 24 * 60 * 60 * 1000)
    : startOfMonth(reference)

  return {
    key,
    from: from.toISOString(),
    to: reference.toISOString(),
    timezone: DEFAULT_TIMEZONE,
  }
}

export function buildCommercialLeadWhere(extra?: Prisma.LeadWhereInput): Prisma.LeadWhereInput {
  return {
    AND: [
      { NOT: { email: { contains: TRACKING_EMAIL_MARKER } } },
      extra ?? {},
    ],
  }
}

function normalizeLeadStatusCounts(
  grouped: Array<{ status: string; _count: { _all: number } }>
): CountByStatus<'new' | 'contacted' | 'qualified' | 'converted' | 'lost'>[] {
  const allStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const
  return allStatuses.map((status) => ({
    status,
    count: grouped.find((entry) => entry.status === status)?._count._all ?? 0,
  }))
}

function normalizeAppointmentStatusCounts(
  grouped: Array<{ status: AppointmentStatus; _count: { _all: number } }>
): CountByStatus<AppointmentStatus>[] {
  const allStatuses: AppointmentStatus[] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
  return allStatuses.map((status) => ({
    status,
    count: grouped.find((entry) => entry.status === status)?._count._all ?? 0,
  }))
}

function normalizeLeadSourceCounts(
  grouped: Array<{ source: string; _count: { _all: number } }>
): CountBySource<'organic' | 'instagram' | 'facebook' | 'google_ads' | 'referral' | 'whatsapp' | 'other'>[] {
  const allSources = ['organic', 'instagram', 'facebook', 'google_ads', 'referral', 'whatsapp', 'other'] as const
  return allSources.map((source) => ({
    source,
    count: grouped.find((entry) => entry.source === source)?._count._all ?? 0,
  }))
}

export async function getLeadMetrics(periodKey: 'month' | 'last30d' = 'month'): Promise<LeadMetrics> {
  const period = createPeriod(periodKey)
  const from = new Date(period.from)
  const to = new Date(period.to)

  const baseWhere = buildCommercialLeadWhere()

  const [total, createdInPeriod, converted, convertedInPeriod, byStatus, bySource] = await Promise.all([
    prisma.lead.count({ where: baseWhere }),
    prisma.lead.count({ where: buildCommercialLeadWhere({ createdAt: { gte: from, lte: to } }) }),
    prisma.lead.count({ where: buildCommercialLeadWhere({ status: 'converted' }) }),
    prisma.lead.count({
      where: buildCommercialLeadWhere({
        status: 'converted',
        convertedAt: { gte: from, lte: to },
      }),
    }),
    prisma.lead.groupBy({ by: ['status'], where: baseWhere, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['source'], where: baseWhere, _count: { _all: true } }),
  ])

  return {
    total,
    createdInPeriod,
    converted,
    convertedInPeriod,
    conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    byStatus: normalizeLeadStatusCounts(byStatus),
    bySource: normalizeLeadSourceCounts(bySource),
  }
}

export async function getFinancialSummary(periodKey: 'month' | 'last30d' = 'month'): Promise<FinancialSummary> {
  const now = nowUtc()
  const period = createPeriod(periodKey, now)
  const from = new Date(period.from)
  const to = new Date(period.to)
  const periodLengthMs = Math.max(to.getTime() - from.getTime(), 1)
  const previousFrom = new Date(from.getTime() - periodLengthMs)
  const previousTo = new Date(from.getTime() - 1)

  const [incomeAgg, expensesAgg, previousIncomeAgg, previousExpensesAgg, convertedLeadsInPeriod] = await Promise.all([
    prisma.financial.aggregate({ where: { type: 'income', date: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.financial.aggregate({ where: { type: 'expense', date: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.financial.aggregate({ where: { type: 'income', date: { gte: previousFrom, lte: previousTo } }, _sum: { amount: true } }),
    prisma.financial.aggregate({ where: { type: 'expense', date: { gte: previousFrom, lte: previousTo } }, _sum: { amount: true } }),
    prisma.lead.count({
      where: buildCommercialLeadWhere({
        status: 'converted',
        convertedAt: { gte: from, lte: to },
      }),
    }),
  ])

  const income = Number(incomeAgg._sum.amount ?? 0)
  const expenses = Number(expensesAgg._sum.amount ?? 0)
  const previousIncome = Number(previousIncomeAgg._sum.amount ?? 0)
  const previousExpenses = Number(previousExpensesAgg._sum.amount ?? 0)

  return {
    income,
    expenses,
    profit: income - expenses,
    previousIncome,
    previousExpenses,
    previousProfit: previousIncome - previousExpenses,
    averageTicket: convertedLeadsInPeriod > 0 ? income / convertedLeadsInPeriod : 0,
    convertedLeadsInPeriod,
    categories: {
      income: [
        { value: 'coaching_revenue', label: FINANCIAL_CATEGORY_LABELS.coaching_revenue },
        { value: 'workshop_revenue', label: FINANCIAL_CATEGORY_LABELS.workshop_revenue },
        { value: 'mentoring_revenue', label: FINANCIAL_CATEGORY_LABELS.mentoring_revenue },
        { value: 'other', label: FINANCIAL_CATEGORY_LABELS.other },
      ],
      expense: [
        { value: 'office', label: FINANCIAL_CATEGORY_LABELS.office },
        { value: 'tools_software', label: FINANCIAL_CATEGORY_LABELS.tools_software },
        { value: 'marketing', label: FINANCIAL_CATEGORY_LABELS.marketing },
        { value: 'education', label: FINANCIAL_CATEGORY_LABELS.education },
        { value: 'taxes', label: FINANCIAL_CATEGORY_LABELS.taxes },
        { value: 'other', label: FINANCIAL_CATEGORY_LABELS.other },
      ],
    },
  }
}

export async function getFinancialCharts(months = 12): Promise<FinancialCharts> {
  const now = nowUtc()
  const monthly = await Promise.all(
    Array.from({ length: months }, (_, index) => {
      const offset = months - index - 1
      const bucketStart = addMonths(now, -offset)
      const from = new Date(bucketStart.getFullYear(), bucketStart.getMonth(), 1, 0, 0, 0, 0)
      const to = endOfDay(new Date(bucketStart.getFullYear(), bucketStart.getMonth() + 1, 0))

      return Promise.all([
        prisma.financial.aggregate({ where: { type: 'income', date: { gte: from, lte: to } }, _sum: { amount: true } }),
        prisma.financial.aggregate({ where: { type: 'expense', date: { gte: from, lte: to } }, _sum: { amount: true } }),
      ]).then(([incomeAgg, expensesAgg]) => {
        const income = Number(incomeAgg._sum.amount ?? 0)
        const expenses = Number(expensesAgg._sum.amount ?? 0)
        return {
          label: from.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          bucketStart: from.toISOString(),
          income,
          expenses,
          profit: income - expenses,
        }
      })
    })
  )

  const expensesByCategory = await prisma.financial.groupBy({
    by: ['category'],
    where: { type: 'expense', date: { gte: addMonths(now, -2) } },
    _sum: { amount: true },
  })

  return {
    monthly,
    expensesByCategory: expensesByCategory.map((entry) => ({
      category: entry.category,
      label: FINANCIAL_CATEGORY_LABELS[entry.category],
      amount: Number(entry._sum.amount ?? 0),
    })),
  }
}

export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  const since = addDays(nowUtc(), -30)
  const [totalSessions, sessions, leadsCreated, leadsConverted] = await Promise.all([
    prisma.session.count({ where: { createdAt: { gte: since } } }),
    prisma.session.findMany({
      where: { createdAt: { gte: since } },
      select: { referrer: true, pagesVisited: true, createdAt: true },
    }),
    prisma.lead.count({ where: buildCommercialLeadWhere({ createdAt: { gte: since } }) }),
    prisma.lead.count({
      where: buildCommercialLeadWhere({
        status: 'converted',
        convertedAt: { gte: since },
      }),
    }),
  ])

  const bounced = sessions.filter((session) => (session.pagesVisited as string[]).length <= 1).length
  const topReferrersMap = sessions.reduce<Record<string, number>>((acc, session) => {
    const referrer = session.referrer || 'Direct'
    acc[referrer] = (acc[referrer] ?? 0) + 1
    return acc
  }, {})

  const heatmap = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
  sessions.forEach((session) => {
    heatmap[session.createdAt.getHours()].count += 1
  })

  return {
    sessions30d: totalSessions,
    uniqueReferrers: new Set(sessions.map((session) => session.referrer || 'Direct')).size,
    bounceRate: totalSessions > 0 ? Math.round((bounced / totalSessions) * 100) : 0,
    topReferrers: Object.entries(topReferrersMap)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count })),
    heatmap,
    funnel: {
      sessions: totalSessions,
      leads: leadsCreated,
      converted: leadsConverted,
      conversionRate: leadsCreated > 0 ? Math.round((leadsConverted / leadsCreated) * 100) : 0,
    },
  }
}

async function getAppointmentMetrics(periodKey: 'month' | 'last30d' = 'month') {
  const now = nowUtc()
  const period = createPeriod(periodKey, now)
  const from = new Date(period.from)
  const to = new Date(period.to)

  const [upcoming, scheduledInPeriod, byStatus] = await Promise.all([
    prisma.appointment.count({
      where: {
        date: { gte: now },
        status: { in: ['scheduled', 'confirmed'] },
      },
    }),
    prisma.appointment.count({
      where: {
        date: { gte: from, lte: to },
      },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { date: { gte: from, lte: to } },
      _count: { _all: true },
    }),
  ])

  return {
    upcoming,
    scheduledInPeriod,
    byStatus: normalizeAppointmentStatusCounts(byStatus),
  }
}

export async function getRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const [leads, appointments, financials, securityEvents] = await Promise.all([
    prisma.lead.findMany({
      where: buildCommercialLeadWhere(),
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, name: true, source: true, createdAt: true, status: true },
    }),
    prisma.appointment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { lead: { select: { name: true } } },
    }),
    prisma.financial.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, type: true, amount: true, category: true, createdAt: true, description: true },
    }),
    prisma.securityEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: { id: true, type: true, severity: true, timestamp: true },
    }),
  ])

  return [
    ...leads.map<ActivityItem>((lead) => ({
      id: `lead:${lead.id}`,
      type: 'lead',
      title: lead.status === 'converted' ? 'Lead convertido' : 'Novo lead recebido',
      description: `${lead.name} - ${lead.source}`,
      timestamp: lead.createdAt.toISOString(),
    })),
    ...appointments.map<ActivityItem>((appointment) => ({
      id: `appointment:${appointment.id}`,
      type: 'appointment',
      title: 'Agendamento registrado',
      description: `${appointment.lead.name} - ${appointment.serviceType.replace(/_/g, ' ')}`,
      timestamp: appointment.createdAt.toISOString(),
    })),
    ...financials.map<ActivityItem>((financial) => ({
      id: `financial:${financial.id}`,
      type: 'financial',
      title: financial.type === 'income' ? 'Receita registrada' : 'Despesa registrada',
      description: `${financial.description} - R$ ${Number(financial.amount).toFixed(2)}`,
      timestamp: financial.createdAt.toISOString(),
    })),
    ...securityEvents.map<ActivityItem>((event) => ({
      id: `security:${event.id}`,
      type: 'security',
      title: 'Evento de seguranca',
      description: `${event.type} - ${event.severity}`,
      timestamp: event.timestamp.toISOString(),
    })),
  ]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, limit)
}

export async function getMetricsOverview(periodKey: 'month' | 'last30d' = 'month'): Promise<MetricsOverview> {
  const period = createPeriod(periodKey)
  const [leads, appointments, financial, charts, analytics, recentActivity] = await Promise.all([
    getLeadMetrics(periodKey),
    getAppointmentMetrics(periodKey),
    getFinancialSummary(periodKey),
    getFinancialCharts(12),
    getAnalyticsMetrics(),
    getRecentActivity(8),
  ])

  const funnel: LeadFunnelMetrics = {
    new: leads.byStatus.find((item) => item.status === 'new')?.count ?? 0,
    contacted: leads.byStatus.find((item) => item.status === 'contacted')?.count ?? 0,
    qualified: leads.byStatus.find((item) => item.status === 'qualified')?.count ?? 0,
    converted: leads.byStatus.find((item) => item.status === 'converted')?.count ?? 0,
    lost: leads.byStatus.find((item) => item.status === 'lost')?.count ?? 0,
  }

  return {
    period,
    leads,
    appointments,
    financial,
    charts,
    analytics,
    funnel,
    recentActivity,
  }
}
