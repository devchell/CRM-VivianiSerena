import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { AppError } from './errorHandler'
import {
  hasModuleAccess,
  hasPermission,
  type AppPermission,
  type AuthTokenPayload,
  type CrmModule,
  type UserRole,
} from '@viviani/types'

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const cookieToken = req.cookies?.access_token as string | undefined

  if (!authHeader?.startsWith('Bearer ') && !cookieToken) {
    return next(new AppError(401, 'Authentication required'))
  }

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : cookieToken

  if (!token) {
    return next(new AppError(401, 'Authentication required'))
  }

  try {
    req.user = verifyAccessToken(token)
    return next()
  } catch {
    return next(new AppError(401, 'Invalid or expired token'))
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'))
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'))
    }
    return next()
  }
}

export function authorizeModule(module: CrmModule, ...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'))
    }

    if (req.user.role === 'ADMIN') {
      return next()
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'))
    }

    if (!hasModuleAccess(req.user.role, req.user.permissions ?? req.user.allowedModules, module)) {
      return next(new AppError(403, 'Module access denied'))
    }

    return next()
  }
}

export function authorizePermission(permission: AppPermission, ...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'))
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'))
    }

    if (!hasPermission(req.user.role, req.user.permissions ?? req.user.allowedModules, permission)) {
      return next(new AppError(403, 'Permission denied'))
    }

    return next()
  }
}
