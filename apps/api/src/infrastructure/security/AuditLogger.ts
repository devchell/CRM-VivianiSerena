import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'

export interface AuditEntry {
  userId: string
  action: string       // e.g. 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
  resource: string     // e.g. 'Lead', 'Financial', 'Content'
  details?: Record<string, unknown>
  ip?: string
}

/**
 * Append-only audit log — never DELETE rows from audit_logs.
 * All authenticated actions must be logged here for ISO 27001 compliance.
 */
export class AuditLogger {
  static async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          details: (entry.details ?? {}) as object,
          ip: entry.ip ?? null,
        },
      })
    } catch (err) {
      // Never fail a request because of audit logging
      logger.error('AuditLogger failed', {
        error: err instanceof Error ? err.message : 'unknown_error',
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
      })
    }
  }

  static async getByUser(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
  }

  static async getByResource(resource: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { resource },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
  }
}
