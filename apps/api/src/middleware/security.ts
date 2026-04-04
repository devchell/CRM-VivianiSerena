import type { Request, Response, NextFunction } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { BOT_USER_AGENTS, SQL_INJECTION_PATTERNS, BRUTE_FORCE } from '../shared/constants'

function anonymizeIp(ip: string): string {
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
    await prisma.securityEvent.create({ data: { type, severity, sourceIp: sourceIp ?? null, details: details as Prisma.JsonObject } })
  } catch (err) {
    logger.error('Failed to create security event:', err)
  }
}

export function botDetection(req: Request, res: Response, next: NextFunction) {
  const ua = req.headers['user-agent'] || ''
  const isBotUa = BOT_USER_AGENTS.some(bot => ua.toLowerCase().includes(bot))
  if (isBotUa) {
    createSecurityEvent('BOT_DETECTED', 'medium', req.ip, { userAgent: ua, path: req.path })
    logger.warn('Bot detected', { ip: req.ip, ua, path: req.path })
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
    logger.warn('SQL injection attempt', { ip: req.ip, path: req.path })
    return res.status(400).json({ success: false, error: 'Invalid request parameters' })
  }
  return next()
}

// Brute-force tracking — records failed login attempts per IP
const loginFailures = new Map<string, { count: number; lockedUntil?: Date }>()

export function bruteForceCheck(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown'
  const record = loginFailures.get(ip)
  if (record?.lockedUntil && record.lockedUntil > new Date()) {
    createSecurityEvent('BRUTE_FORCE_BLOCKED', 'high', ip, { path: req.path })
    return res.status(429).json({
      success: false,
      error: `IP temporarily blocked. Try again in ${BRUTE_FORCE.LOCKOUT_MINUTES} minutes.`,
    })
  }
  return next()
}

export function recordLoginFailure(ip: string) {
  const record = loginFailures.get(ip) ?? { count: 0 }
  record.count += 1
  if (record.count >= BRUTE_FORCE.MAX_ATTEMPTS) {
    record.lockedUntil = new Date(Date.now() + BRUTE_FORCE.LOCKOUT_MINUTES * 60 * 1000)
    createSecurityEvent('BRUTE_FORCE_LOCKOUT', 'high', ip, { attempts: record.count })
    logger.warn('IP locked due to brute force', { ip, attempts: record.count })
  }
  loginFailures.set(ip, record)
}

export function resetLoginFailures(ip: string) {
  loginFailures.delete(ip)
}

export { anonymizeIp }
