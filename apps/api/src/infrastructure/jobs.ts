import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { redis } from '../lib/redis'
import { emailService } from './email'
import { buildCommercialLeadWhere } from '../domain/metrics/service'

function formatPeriod(from: Date, to: Date): string {
  return `${from.toLocaleDateString('pt-BR')} – ${to.toLocaleDateString('pt-BR')}`
}

// Cleanup old sessions (daily at 02:00)
export function scheduleSessionCleanup() {
  cron.schedule('0 2 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const deleted = await prisma.session.deleteMany({ where: { createdAt: { lt: cutoff } } })
      logger.info(`Session cleanup: ${deleted.count} old sessions removed`)
    } catch (err) {
      logger.error('Session cleanup job failed:', err)
    }
  })
  logger.info('Session cleanup scheduled (daily at 02:00)')
}

// Weekly financial report email (Monday at 08:00)
export function scheduleWeeklyReport() {
  cron.schedule('0 8 * * 1', async () => {
    try {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [incomeAgg, expensesAgg, leadsCount, appointmentsCount] = await Promise.all([
        prisma.financial.aggregate({
          where: { deletedAt: null, type: 'income', date: { gte: weekAgo } },
          _sum: { amount: true },
        }),
        prisma.financial.aggregate({
          where: { deletedAt: null, type: 'expense', date: { gte: weekAgo } },
          _sum: { amount: true },
        }),
        prisma.lead.count({ where: buildCommercialLeadWhere({ createdAt: { gte: weekAgo } }) }),
        prisma.appointment.count({ where: { createdAt: { gte: weekAgo }, lead: { deletedAt: null } } }),
      ])

      const income = Number(incomeAgg._sum.amount ?? 0)
      const expenses = Number(expensesAgg._sum.amount ?? 0)

      await emailService.weeklyFinancialReport({
        period: formatPeriod(weekAgo, now),
        income,
        expenses,
        profit: income - expenses,
        leads: leadsCount,
        appointments: appointmentsCount,
      })

      logger.info('Weekly report email sent')
    } catch (err) {
      logger.error('Weekly report job failed:', err)
    }
  })
  logger.info('Weekly report scheduled (Monday at 08:00)')
}

// Health check for services (every 5 minutes)
export function scheduleHealthCheck() {
  cron.schedule('*/5 * * * *', async () => {
    const checks: Record<string, boolean> = {}
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.database = true
    } catch {
      checks.database = false
    }
    try {
      await redis.ping()
      checks.redis = true
    } catch {
      checks.redis = false
    }

    const allHealthy = Object.values(checks).every(Boolean)
    if (!allHealthy) {
      logger.error('Health check failed', checks)
      try {
        await prisma.securityEvent.create({
          data: {
            type: 'SERVICE_HEALTH_DEGRADED',
            severity: 'high',
            details: checks,
          },
        })
      } catch (error) {
        logger.warn('Scheduled health check could not persist its event', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    } else {
      logger.debug('Health check OK', checks)
    }
  })
  logger.info('Health check scheduled (every 5 min)')
}

export function startAllJobs() {
  scheduleSessionCleanup()
  scheduleWeeklyReport()
  scheduleHealthCheck()
  logger.info('Background jobs started')
}
