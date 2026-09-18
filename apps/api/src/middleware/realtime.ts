import type { NextFunction, Request, Response } from 'express'
import type { Server } from 'socket.io'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const IGNORED_RESOURCES = new Set(['auth'])

function resolveResource(path: string): string | null {
  return path.split('/').filter(Boolean)[0] ?? null
}

/**
 * Publishes a small, non-sensitive invalidation event after a successful API
 * mutation. The clients fetch the authoritative resource again; no record
 * data is placed on the socket payload.
 */
export function realtimeMutation(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    next()
    return
  }

  res.once('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return

    const resource = resolveResource(req.path)
    if (!resource || IGNORED_RESOURCES.has(resource)) return

    const io = req.app.get('io') as Server | undefined
    io?.to('dashboard').emit('data_changed', {
      resource,
      method: req.method,
      at: new Date().toISOString(),
    })
  })

  next()
}
