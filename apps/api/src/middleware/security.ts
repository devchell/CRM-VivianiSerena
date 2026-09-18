import type { Request, Response, NextFunction } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'
import { BOT_USER_AGENTS, SQL_INJECTION_PATTERNS, BRUTE_FORCE } from '../shared/constants'

export function anonymizeIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) {
    parts[3] = '0'
    return parts.join('.')
  }
  // IPv6: remove last segment
  const segments = ip.split(':')
  segments[segments.length - 1] = '0'
  return segments.join(':')
}

async function createSecurityEvent(
  type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  sourceIp: string | undefined,
  details: Record<string, unknown>
) {
  try {
    await prisma.securityEvent.create({ data: { type, severity, sourceIp: sourceIp ? anonymizeIp(sourceIp) : null, details: details as Prisma.JsonObject } })
  } catch (err) {
    logger.error('Failed to create security event:', err)
  }
}

export function botDetection(req: Request, res: Response, next: NextFunction) {
  const ua = req.headers['user-agent'] || ''
  const isBotUa = BOT_USER_AGENTS.some(bot => ua.toLowerCase().includes(bot))
  if (isBotUa) {
    createSecurityEvent('BOT_DETECTED', 'medium', req.ip, { userAgent: ua, path: req.path })
    logger.warn('Bot detected', { ip: anonymizeIp(req.ip ?? 'unknown'), path: req.path })
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  return next()
}

export function sqlInjectionDetection(req: Request, res: Response, next: NextFunction) {
  const checkValue = (value: unknown): boolean => {
    if (typeof value === 'string') {
      return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value))
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value as Record<string, unknown>).some(v => checkValue(v))
    }
    return false
  }

  const suspicious =
    checkValue(req.query) ||
    checkValue(req.body) ||
    checkValue(req.params)

  if (suspicious) {
    createSecurityEvent('SQL_INJECTION_ATTEMPT', 'high', req.ip, {
      path: req.path,
      method: req.method,
    })
    logger.warn('SQL injection attempt', { ip: anonymizeIp(req.ip ?? 'unknown'), path: req.path })
    return res.status(400).json({ success: false, error: 'Invalid request parameters' })
  }
  return next()
}

// Brute-force tracking is kept in Redis so every API replica shares the same lockout state.
const FAILURE_KEY_PREFIX = 'security:login-failures:'
const LOCK_KEY_PREFIX = 'security:login-lock:'

export async function bruteForceCheck(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown'
  try {
    const locked = await redis.exists(`${LOCK_KEY_PREFIX}${ip}`)
    if (locked > 0) {
      void createSecurityEvent('BRUTE_FORCE_BLOCKED', 'high', ip, { path: req.path })
      return res.status(429).json({
        success: false,
        error: `IP temporarily blocked. Try again in ${BRUTE_FORCE.LOCKOUT_MINUTES} minutes.`,
      })
    }
  } catch (error) {
    logger.error('Brute-force state check failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
  return next()
}

export async function recordLoginFailure(ip: string): Promise<void> {
  try {
    const key = `${FAILURE_KEY_PREFIX}${ip}`
    const count = await redis.incr(key)
    await redis.expire(key, BRUTE_FORCE.LOCKOUT_MINUTES * 60)
    if (count >= BRUTE_FORCE.MAX_ATTEMPTS) {
      await redis.set(`${LOCK_KEY_PREFIX}${ip}`, '1', { ex: BRUTE_FORCE.LOCKOUT_MINUTES * 60 })
      void createSecurityEvent('BRUTE_FORCE_LOCKOUT', 'high', ip, { attempts: count })
      logger.warn('IP locked due to brute force', { ip: anonymizeIp(ip), attempts: count })
    }
  } catch (error) {
    logger.error('Brute-force state write failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function resetLoginFailures(ip: string): Promise<void> {
  try {
    await redis.del(`${FAILURE_KEY_PREFIX}${ip}`, `${LOCK_KEY_PREFIX}${ip}`)
  } catch (error) {
    logger.error('Brute-force state reset failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
