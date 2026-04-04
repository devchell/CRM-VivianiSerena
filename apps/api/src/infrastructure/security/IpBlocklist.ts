import { redis } from '../../lib/redis'
import { logger } from '../../lib/logger'

const PREFIX = 'ip:blocked:'

export class IpBlocklist {
  static async block(ip: string, ttlSeconds: number = 900, reason = 'manual'): Promise<void> {
    if (ttlSeconds === -1) {
      await redis.set(`${PREFIX}${ip}`, reason)
    } else {
      await redis.set(`${PREFIX}${ip}`, reason, { ex: ttlSeconds })
    }
    logger.warn('IP blocked', { ip, ttl: ttlSeconds, reason })
  }

  static async unblock(ip: string): Promise<void> {
    await redis.del(`${PREFIX}${ip}`)
    logger.info('IP unblocked', { ip })
  }

  static async isBlocked(ip: string): Promise<boolean> {
    const val = await redis.exists(`${PREFIX}${ip}`)
    return val === 1
  }

  static async getReason(ip: string): Promise<string | null> {
    return redis.get(`${PREFIX}${ip}`)
  }

  static async getAll(): Promise<Array<{ ip: string; reason: string; ttl: number }>> {
    const keys = await redis.keys(`${PREFIX}*`)
    if (!keys.length) return []
    const result: Array<{ ip: string; reason: string; ttl: number }> = []
    for (const key of keys) {
      const [reason, ttl] = await Promise.all([redis.get(key), redis.ttl(key)])
      const normalizedReason =
        typeof reason === 'string' ? reason : reason == null ? 'unknown' : JSON.stringify(reason)
      result.push({ ip: key.replace(PREFIX, ''), reason: normalizedReason, ttl })
    }
    return result.sort((a, b) => b.ttl - a.ttl)
  }
}
