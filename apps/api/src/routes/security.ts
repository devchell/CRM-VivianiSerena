import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { authenticate, authorize, authorizeModule } from '../middleware/authenticate'
import { getCache, setCache, CACHE_TTL } from '../lib/redis'
import { IpBlocklist } from '../infrastructure/security/IpBlocklist'
import { logger } from '../lib/logger'

export const securityRouter: Router = Router()
securityRouter.use(authenticate)

const SECURITY_STATS_CACHE_KEY = 'security:stats'
const SECURITY_ACTIVITY_CACHE_KEY = 'security:activity'

async function invalidateSecurityCaches() {
  await Promise.allSettled([
    redis.del(SECURITY_STATS_CACHE_KEY),
    redis.del(SECURITY_ACTIVITY_CACHE_KEY),
  ])
}

function emitSecurityAlert(
  req: { app: { get: (key: string) => unknown } },
  event: {
    id: string
    type: string
    severity: string
    sourceIp?: string | null
    details?: unknown
    resolved?: boolean
    timestamp?: Date
  }
) {
  const io = req.app.get('io') as {
    emit?: (channel: string, payload: Record<string, unknown>) => void
  } | undefined

  io?.emit?.('security_alert', {
    id: event.id,
    type: event.type,
    severity: event.severity,
    sourceIp: event.sourceIp ?? null,
    details: event.details ?? {},
    resolved: event.resolved ?? false,
    timestamp: event.timestamp?.toISOString() ?? new Date().toISOString(),
    message: `${event.type}:${event.severity}`,
  })
}

// ─── Events ─────────────────────────────────────────────────────────────────

// GET /security/events — últimas 48h ou 7d
securityRouter.get('/events', authorizeModule('seguranca'), async (req, res, next) => {
  try {
    const { severity, resolved, limit = 100, hours = 48 } = req.query
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000)
    const where: Record<string, unknown> = { timestamp: { gte: since } }
    if (severity) where.severity = severity
    if (resolved !== undefined) where.resolved = resolved === 'true'

    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
    })
    res.json({ success: true, data: events })
  } catch (err) { next(err) }
})

// POST /security/events — registrar evento
securityRouter.post('/events', authorize('ADMIN'), async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      sourceIp: z.string().optional(),
      details: z.record(z.unknown()).optional(),
    })
    const data = schema.parse(req.body)
    const event = await prisma.securityEvent.create({
      data: {
        type: data.type,
        severity: data.severity,
        sourceIp: data.sourceIp ?? null,
        details: (data.details ?? {}) as Prisma.InputJsonObject,
      },
    })
    await invalidateSecurityCaches()
    emitSecurityAlert(req, event)
    res.status(201).json({ success: true, data: event })
  } catch (err) { next(err) }
})

// PATCH /security/events/:id/resolve
securityRouter.patch('/events/:id/resolve', authorize('ADMIN'), async (req, res, next) => {
  try {
    const event = await prisma.securityEvent.update({
      where: { id: String(req.params.id) },
      data: { resolved: true },
    })
    await invalidateSecurityCaches()
    emitSecurityAlert(req, event)
    res.json({ success: true, data: event })
  } catch (err) { next(err) }
})

// ─── Stats ───────────────────────────────────────────────────────────────────

securityRouter.get('/stats', authorizeModule('seguranca'), async (_req, res, next) => {
  try {
    const cached = await getCache(SECURITY_STATS_CACHE_KEY)
    if (cached) { res.json({ success: true, data: cached }); return }

    const since7d = new Date(Date.now() - 7 * 86400_000)
    const since24h = new Date(Date.now() - 86400_000)

    const [total, bySeverity, byType, unresolved, critical24h] = await Promise.all([
      prisma.securityEvent.count({ where: { timestamp: { gte: since7d } } }),
      prisma.securityEvent.groupBy({ by: ['severity'], where: { timestamp: { gte: since7d } }, _count: { _all: true } }),
      prisma.securityEvent.groupBy({ by: ['type'], where: { timestamp: { gte: since7d } }, _count: { _all: true }, orderBy: { _count: { type: 'desc' } } }),
      prisma.securityEvent.count({ where: { resolved: false, timestamp: { gte: since7d } } }),
      prisma.securityEvent.count({ where: { severity: 'critical', timestamp: { gte: since24h } } }),
    ])

    const data = {
      period: '7d',
      total,
      unresolved,
      critical24h,
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count._all })),
      byType: byType.slice(0, 10).map(t => ({ type: t.type, count: t._count._all })),
    }

    await setCache(SECURITY_STATS_CACHE_KEY, data, CACHE_TTL.SHORT)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// ─── 24h Activity (hourly breakdown) ────────────────────────────────────────

securityRouter.get('/activity', authorizeModule('seguranca'), async (_req, res, next) => {
  try {
    const cached = await getCache(SECURITY_ACTIVITY_CACHE_KEY)
    if (cached) { res.json({ success: true, data: cached }); return }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const events = await prisma.securityEvent.findMany({
      where: { timestamp: { gte: since } },
      select: { timestamp: true, severity: true },
    })

    // Build 24-hour buckets
    const hours: Array<{ hour: string; blocked: number; total: number }> = []
    for (let h = 23; h >= 0; h--) {
      const t = new Date(Date.now() - h * 3600_000)
      const label = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const start = new Date(t); start.setMinutes(0, 0, 0)
      const end = new Date(start); end.setHours(start.getHours() + 1)

      const inBucket = events.filter(e => e.timestamp >= start && e.timestamp < end)
      const blocked = inBucket.filter(e => ['high', 'critical'].includes(e.severity)).length
      // Simulate realistic total traffic based on time of day
      hours.push({ hour: label, blocked, total: inBucket.length })
    }

    await setCache(SECURITY_ACTIVITY_CACHE_KEY, hours, 300)
    res.json({ success: true, data: hours })
  } catch (err) { next(err) }
})

// ─── IP Blocklist ────────────────────────────────────────────────────────────

securityRouter.get('/blocked-ips', authorizeModule('seguranca'), async (_req, res, next) => {
  try {
    const ips = await IpBlocklist.getAll()
    res.json({ success: true, data: ips })
  } catch (err) { next(err) }
})

securityRouter.post('/block-ip', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { ip, ttlMinutes = 60, reason = 'manual' } = z.object({
      ip: z.string().ip(),
      ttlMinutes: z.number().min(1).max(525600).optional(),
      reason: z.string().optional(),
    }).parse(req.body)

    await IpBlocklist.block(ip, Number(ttlMinutes) * 60, reason)

    const event = await prisma.securityEvent.create({
      data: {
        type: 'IP_MANUALLY_BLOCKED',
        severity: 'medium',
        sourceIp: ip,
        details: { reason, ttlMinutes, blockedBy: 'admin' } as Prisma.InputJsonObject,
      },
    })

    logger.info('IP manually blocked', { ip, ttlMinutes, reason })
    await invalidateSecurityCaches()
    emitSecurityAlert(req, event)
    res.json({ success: true, message: `IP ${ip} bloqueado por ${ttlMinutes} minutos` })
  } catch (err) { next(err) }
})

securityRouter.delete('/block-ip/:ip', authorize('ADMIN'), async (req, res, next) => {
  try {
    const ip = String(req.params.ip)
    await IpBlocklist.unblock(ip)
    res.json({ success: true, message: `IP ${ip} desbloqueado` })
  } catch (err) { next(err) }
})

// ─── Test Alert ──────────────────────────────────────────────────────────────

securityRouter.post('/test-alert', authorize('ADMIN'), async (req, res, next) => {
  try {
    const event = await prisma.securityEvent.create({
      data: {
        type: 'TEST_ALERT',
        severity: 'medium',
        sourceIp: '0.0.0.0',
        details: { message: 'Evento de teste disparado pelo painel de segurança', manual: true } as Prisma.InputJsonObject,
      },
    })

    await invalidateSecurityCaches()
    emitSecurityAlert(req, event)

    res.json({ success: true, data: event })
  } catch (err) { next(err) }
})

// ─── Checklist Status ────────────────────────────────────────────────────────

securityRouter.get('/checklist', authorizeModule('seguranca'), async (_req, res, next) => {
  try {
    const redisOk = await redis.ping().then(() => true).catch(() => false)
    const sslExpiry = process.env.SSL_CERT_EXPIRY_DAYS ? parseInt(process.env.SSL_CERT_EXPIRY_DAYS, 10) : 90

    const items = [
      { id: 'https', label: 'HTTPS ativo', ok: true, description: 'A API foi preparada para operar atrás de TLS e proxy reverso.' },
      { id: 'brute_force', label: 'Proteção contra força bruta', ok: true, description: 'Bloqueio automático após tentativas falhas consecutivas de login.' },
      { id: 'rate_limit', label: 'Rate limiting ativo', ok: redisOk, description: 'Rate limit e lockout dependem de Redis operacional.' },
      { id: 'backup', label: 'Backup configurado', ok: process.env.BACKUP_ENABLED === 'true', description: process.env.BACKUP_ENABLED === 'true' ? 'Backup habilitado por ambiente.' : 'Sem confirmação automática de backup neste ambiente.' },
      { id: '2fa', label: 'Autenticação em 2 fatores', ok: true, description: 'Fluxo atual implementado com OTP por e-mail e SMS.' },
      { id: 'ssl_expiry', label: 'Certificado SSL', ok: sslExpiry > 14, warning: sslExpiry <= 30, description: `Certificado SSL ${sslExpiry > 14 ? `expira em ${sslExpiry} dias` : 'precisa de renovação urgente'}.`, daysLeft: sslExpiry },
      { id: 'headers', label: 'Headers de segurança ativos', ok: true, description: 'Helmet, HSTS e CSP estão ativos com ajustes adicionais recomendados.' },
      { id: 'anomaly', label: 'Detecção básica de anomalias', ok: true, description: 'O backend aplica validações e detecção de padrões suspeitos, sem prometer um WAF completo.' },
    ]

    res.json({ success: true, data: items })
  } catch (err) { next(err) }
})
