import { Redis } from '@upstash/redis'
import { logger } from './logger'

export const redis = Redis.fromEnv()

export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
} as const

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key)
  } catch (err) {
    logger.error('Redis getCache error:', err)
    return null
  }
}

export async function setCache<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttl })
  } catch (err) {
    logger.error('Redis setCache error:', err)
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (err) {
    logger.error('Redis deleteCache error:', err)
  }
}

export async function deletePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...(keys as [string, ...string[]]))
  } catch (err) {
    logger.error('Redis deletePattern error:', err)
  }
}
