import Redis from 'ioredis'
import { logger } from './logger'
import { apiEnv } from './env'

export const redis = new Redis(apiEnv.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (times > 3) return null
    return Math.min(times * 200, 2000)
  },
})

redis.on('connect', () => logger.info('Redis connecting...'))
redis.on('ready', () => logger.info('Redis ready'))
redis.on('error', err => logger.error('Redis error:', err))
redis.on('close', () => logger.warn('Redis connection closed'))

export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
} as const

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key)
  if (!data) return null
  return JSON.parse(data) as T
}

export async function setCache<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value))
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key)
}

export async function deletePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) await redis.del(...keys)
}
