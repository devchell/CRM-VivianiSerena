import { v4 as uuidv4 } from 'uuid'
import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const provided = req.headers['x-request-id']
  const candidate = Array.isArray(provided) ? provided[0] : provided
  const id = candidate && /^[A-Za-z0-9._:-]{1,100}$/.test(candidate) ? candidate : uuidv4()
  req.requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}
