import { redis } from '../../lib/redis'
import { logger } from '../../lib/logger'
import { prisma } from '../../lib/prisma'
import type { Prisma } from '@prisma/client'
import { IpBlocklist } from './IpBlocklist'

// Thresholds per route pattern (path substring → config)
const ROUTE_THRESHOLDS: Array<{ pattern: string; max: number; windowMs: number }> = [
  { pattern: '/auth/login',  max: 5,   windowMs: 15 * 60_000 },
  { pattern: '/auth/',       max: 10,  windowMs: 15 * 60_000 },
  { pattern: '/api/',        max: 200, windowMs: 60_000       },
]

// Progressive lockout: 15 min → 1h → 24h → permanent
const LOCKOUT_STEPS = [900, 3600, 86400, -1]

function getThreshold(path: string): { max: number; windowMs: number } {
  for (const t of ROUTE_THRESHOLDS) {
    if (path.includes(t.pattern)) return t
  }
  return { max: 200, windowMs: 60_000 }
}

function routeKey(path: string): string {
  // Normalize: keep first 3 segments to avoid key explosion
  return path.split('/').slice(0, 4).join('/')
}

export class BruteForceDetector {
  /**
   * Records a request from `ip` to `path`.
   * Returns `true` if the IP should be blocked.
   */
  static async record(ip: string, path: string): Promise<boolean> {
    const { max, windowMs } = getThreshold(path)
    const key = `bf:${ip}:${routeKey(path)}`
    const cycleKey = `bf:cycles:${ip}`
    const now = Date.now()

    // Sliding window via sorted set (score = timestamp)
    await redis.zadd(key, { score: now, member: String(now) })
    await redis.zremrangebyscore(key, 0, now - windowMs)
    await redis.pexpire(key, windowMs)

    const count = await redis.zcard(key)
    if (count < max) return false

    // Threshold exceeded — determine lockout duration
    const cyclesRaw = await redis.get<number | string>(cycleKey)
    const cycles = cyclesRaw === null ? 0 : Number(cyclesRaw)
    const ttl = LOCKOUT_STEPS[Math.min(cycles, LOCKOUT_STEPS.length - 1)]
    const label = ttl === -1 ? 'permanente' : `${ttl / 60} min`

    await IpBlocklist.block(ip, ttl === -1 ? 365 * 86400 : ttl, `brute_force_${label}`)
    await redis.incr(cycleKey)
    await redis.expire(cycleKey, 30 * 86400) // remember cycles for 30 days

    try {
      await prisma.securityEvent.create({
        data: {
          type: 'BRUTE_FORCE_LOCKOUT',
          severity: cycles >= 2 ? 'critical' : 'high',
          sourceIp: ip,
          details: { attempts: count, path, cycle: cycles + 1, lockout: label } as Prisma.JsonObject,
        },
      })
    } catch { /* never fail a request due to logging */ }

    logger.warn('BruteForce lockout', { ip, path, count, cycles: cycles + 1, lockout: label })
    return true
  }
}
