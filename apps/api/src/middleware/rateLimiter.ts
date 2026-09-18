import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import type { Request } from 'express'

const PUBLIC_CONTENT_READ_PATHS = new Set(['/v1/content', '/v1/content/site-summary'])

function isTrustedInternalContentRead(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET?.trim()

  return Boolean(secret)
    && req.method === 'GET'
    && PUBLIC_CONTENT_READ_PATHS.has(req.path)
    && req.get('x-internal-api-secret') === secret
}

function createRedisStore(prefix: string): RedisStore | undefined {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return undefined
  }

  return new RedisStore({
    prefix,
    sendCommand: async (...args) => {
      const { redis } = await import('../lib/redis')
      return redis.sendCommand(...args)
    },
  })
}

function createLimiter(prefix: string, options: Parameters<typeof rateLimit>[0]) {
  const store = createRedisStore(prefix)
  return rateLimit(store ? { ...options, store } : options)
}

export const rateLimiter = createLimiter('rate-limit:global:', {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  skip: req => req.path === '/health' || isTrustedInternalContentRead(req),
})

export const authRateLimiter = createLimiter('rate-limit:auth:', {
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
})

export const publicLeadRateLimiter = createLimiter('rate-limit:public-lead:', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas solicitações. Aguarde alguns minutos e tente novamente.' },
})

export const emailRateLimiter = createLimiter('rate-limit:email:', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de envio de e-mail atingido. Aguarde antes de tentar novamente.' },
})
