import type { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'
import { anonymizeIp } from './security'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: anonymizeIp(req.ip ?? 'unknown'),
      requestId: req.requestId,
      userId: req.user?.sub,
    })
  })
  next()
}
