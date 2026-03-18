import type { Request, Response, NextFunction } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

export interface AuditOptions {
  action: string
  resource: string
  getDetails?: (req: Request, res: Response) => Record<string, unknown>
}

export function auditLog(options: AuditOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (!req.user || res.statusCode >= 400) return
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user.sub,
            action: options.action,
            resource: options.resource,
            details: (options.getDetails
              ? options.getDetails(req, res)
              : { method: req.method, path: req.path }) as Prisma.InputJsonObject,
            ip: req.ip ?? null,
          },
        })
      } catch (err) {
        logger.error('Audit log failed:', err)
      }
    })
    next()
  }
}
