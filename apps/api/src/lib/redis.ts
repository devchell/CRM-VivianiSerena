import { createClient, type RedisClientType } from 'redis'
import { apiEnv } from './env'
import { logger } from './logger'

type RedisSetOptions = {
  ex?: number
  px?: number
  nx?: boolean
}

type RedisRawReply = boolean | number | string | Array<boolean | number | string>

export interface RedisLike {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, options?: RedisSetOptions): Promise<string | null>
  del(...keys: string[]): Promise<number>
  keys(pattern: string): Promise<string[]>
  ping(): Promise<string>
  exists(key: string): Promise<number>
  ttl(key: string): Promise<number>
  zadd(key: string, value: { score: number; member: string }): Promise<number>
  zremrangebyscore(key: string, min: number, max: number): Promise<number>
  pexpire(key: string, milliseconds: number): Promise<boolean>
  zcard(key: string): Promise<number>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<boolean>
  sendCommand(...args: string[]): Promise<RedisRawReply>
}

type LocalRedisClient = RedisClientType

class LocalRedis implements RedisLike {
  private readonly client: LocalRedisClient
  private connection: Promise<void> | null = null

  constructor(url: string) {
    this.client = createClient({ url })
    this.client.on('error', (error) => {
      logger.error('Local Redis client error', { error: error.message })
    })
  }

  private async connect(): Promise<void> {
    if (this.client.isReady) return
    if (!this.connection) {
      this.connection = this.client.connect()
        .then(() => undefined)
        .catch((error: unknown) => {
          this.connection = null
          throw error
        })
    }
    await this.connection
  }

  private async run<T>(operation: (client: LocalRedisClient) => Promise<T>): Promise<T> {
    await this.connect()
    return operation(this.client)
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.run((client) => client.get(key))
    if (value === null) return null

    try {
      return JSON.parse(value) as T
    } catch {
      return value as T
    }
  }

  async set<T>(key: string, value: T, options?: RedisSetOptions): Promise<string | null> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    if (options?.ex !== undefined) {
      return this.run((client) => client.set(key, serialized, { EX: options.ex, ...(options.nx ? { NX: true } : {}) }))
    }
    if (options?.px !== undefined) {
      return this.run((client) => client.set(key, serialized, { PX: options.px, ...(options.nx ? { NX: true } : {}) }))
    }
    return this.run((client) => client.set(key, serialized, options?.nx ? { NX: true } : undefined))
  }

  async del(...keys: string[]): Promise<number> {
    return this.run((client) => client.del(keys))
  }

  async keys(pattern: string): Promise<string[]> {
    return this.run((client) => client.keys(pattern))
  }

  async ping(): Promise<string> {
    return this.run((client) => client.ping())
  }

  async exists(key: string): Promise<number> {
    return this.run((client) => client.exists(key))
  }

  async ttl(key: string): Promise<number> {
    return this.run((client) => client.ttl(key))
  }

  async zadd(key: string, value: { score: number; member: string }): Promise<number> {
    return this.run((client) => client.zAdd(key, [{ score: value.score, value: value.member }]))
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    return this.run((client) => client.zRemRangeByScore(key, min, max))
  }

  async pexpire(key: string, milliseconds: number): Promise<boolean> {
    return this.run((client) => client.pExpire(key, milliseconds))
  }

  async zcard(key: string): Promise<number> {
    return this.run((client) => client.zCard(key))
  }

  async incr(key: string): Promise<number> {
    return this.run((client) => client.incr(key))
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return this.run((client) => client.expire(key, seconds))
  }

  async sendCommand(...args: string[]): Promise<RedisRawReply> {
    const reply: unknown = await this.run((client) => client.sendCommand(args))
    return normalizeRawReply(reply)
  }
}

function normalizeRawReply(value: unknown): RedisRawReply {
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => (
      typeof item === 'boolean' || typeof item === 'number' || typeof item === 'string' ? item : ''
    ))
  }
  return ''
}

export const redis: RedisLike = new LocalRedis(apiEnv.redisUrl)

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
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
    if (keys.length > 0) await redis.del(...keys)
  } catch (err) {
    logger.error('Redis deletePattern error:', err)
  }
}
