import { redis } from '../../lib/redis'
import { prisma } from '../../lib/prisma'
import type { Request } from 'express'
import type { Prisma } from '@prisma/client'

type ThreatResult = { threat: string; severity: 'low' | 'medium' | 'high' | 'critical' } | null

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w{2,15}\s*=/i,
  /<\s*iframe/i,
  /\beval\s*\(/i,
  /document\s*\.\s*cookie/i,
  /\bwindow\s*\.\s*location/i,
]

const SQLI_PATTERNS = [
  /\bUNION\b.{0,30}\bSELECT\b/i,
  /\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /;\s*(DROP|DELETE|TRUNCATE|ALTER)\s+/i,
  /xp_cmdshell/i,
  /WAITFOR\s+DELAY/i,
  /SLEEP\s*\(\d+\)/i,
]

const SCANNER_UAS = ['sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'nuclei', 'dirbuster', 'gobuster', 'hydra', 'medusa', 'python-requests', 'go-http-client']

function scanValue(value: unknown): 'xss' | 'sqli' | null {
  if (typeof value === 'string') {
    if (XSS_PATTERNS.some(p => p.test(value))) return 'xss'
    if (SQLI_PATTERNS.some(p => p.test(value))) return 'sqli'
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const r = scanValue(v)
      if (r) return r
    }
  }
  return null
}

export class AnomalyDetector {
  static isScannerAgent(ua: string): boolean {
    const lower = ua.toLowerCase()
    return SCANNER_UAS.some(s => lower.includes(s))
  }

  static missingRequiredHeaders(req: Request): boolean {
    return !req.headers['user-agent'] || !req.headers['accept']
  }

  /** Returns true if inter-request gap < 80ms (bot-like speed) */
  static async isTooFast(ip: string): Promise<boolean> {
    const key = `freq:${ip}`
    const now = Date.now()
    const last = await redis.get<string | number>(key)
    await redis.set(key, String(now), { px: 10_000 })
    return !!last && now - Number(last) < 80
  }

  static async analyze(req: Request): Promise<ThreatResult> {
    const ua = req.headers['user-agent'] ?? ''

    if (this.isScannerAgent(ua)) return { threat: 'SCANNER_DETECTED', severity: 'high' }
    if (this.missingRequiredHeaders(req)) return { threat: 'BOT_DETECTED', severity: 'medium' }

    const payloadHit = scanValue(req.body) ?? scanValue(req.query)
    if (payloadHit === 'xss')  return { threat: 'XSS_ATTEMPT', severity: 'high' }
    if (payloadHit === 'sqli') return { threat: 'SQL_INJECTION_ATTEMPT', severity: 'critical' }

    if (req.ip && await this.isTooFast(req.ip)) {
      return { threat: 'BOT_DETECTED', severity: 'low' }
    }

    return null
  }

  static async log(req: Request, threat: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    try {
      const raw = req.ip ?? 'unknown'
      // Anonymize: keep first 3 octets only (LGPD)
      const parts = raw.split('.')
      const anonIp = parts.length === 4 ? [...parts.slice(0, 3), '0'].join('.') : raw

      await prisma.securityEvent.create({
        data: {
          type: threat,
          severity,
          sourceIp: anonIp,
          details: {
            path: req.path,
            method: req.method,
            ua: (req.headers['user-agent'] ?? '').substring(0, 200),
          } as Prisma.JsonObject,
        },
      })
    } catch { /* non-blocking */ }
  }
}
