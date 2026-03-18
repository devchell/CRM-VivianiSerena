import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    })
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {}
    err.errors.forEach(e => {
      const key = e.path.join('.')
      if (!details[key]) details[key] = []
      details[key].push(e.message)
    })
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details,
    })
  }

  logger.error('Unhandled error:', { error: err.message, stack: err.stack, url: req.originalUrl })

  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
}
