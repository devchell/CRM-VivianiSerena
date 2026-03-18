import { Router, type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { CRM_MODULES, type CrmModule } from '@viviani/types'
import { prisma } from '../lib/prisma'
import { apiEnv } from '../lib/env'
import { authenticate } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { emailService } from '../infrastructure/email'
import { logger } from '../lib/logger'

export const usersRouter: Router = Router()
const MODULES = [...CRM_MODULES] as [CrmModule, ...CrmModule[]]

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from(crypto.randomBytes(12))
    .map((byte) => chars[byte % chars.length])
    .join('')
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']),
  allowedModules: z.array(z.enum(MODULES)).optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).optional(),
  allowedModules: z.array(z.enum(MODULES)).optional(),
})

function normalizeAllowedModules(role: 'ADMIN' | 'MANAGER' | 'VIEWER', modules?: CrmModule[]): CrmModule[] {
  if (role === 'ADMIN') {
    return []
  }

  return Array.isArray(modules) ? [...new Set(modules)] : []
}

function adminOnly(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new AppError(401, 'Authentication required'))
    return
  }

  if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
    next(new AppError(403, 'Administrative access required'))
    return
  }

  next()
}

usersRouter.get('/', authenticate, adminOnly, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        allowedModules: true,
        photoUrl: true,
        createdAt: true,
        lastLogin: true,
        mustChangePassword: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: users })
  } catch (error) {
    next(error)
  }
})

usersRouter.post('/', authenticate, adminOnly, async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body)
    const exists = await prisma.user.findUnique({ where: { email: body.email } })

    if (exists) {
      throw new AppError(409, 'E-mail ja cadastrado')
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    const allowedModules = normalizeAllowedModules(body.role, body.allowedModules)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: body.role,
        allowedModules,
        mustChangePassword: true,
      },
    })

    emailService.sendCollaboratorInvite({
      to: body.email,
      name: body.name,
      tempPassword,
      crmUrl: apiEnv.crmUrl,
      role: body.role,
      modules: allowedModules,
    }).catch((error) => logger.warn('Invite email failed', error))

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedModules: user.allowedModules,
      },
    })
  } catch (error) {
    next(error)
  }
})

usersRouter.patch('/:id', authenticate, adminOnly, async (req, res, next) => {
  try {
    const body = updateUserSchema.parse(req.body)
    const userId = String(req.params.id)
    const existing = await prisma.user.findUnique({ where: { id: userId } })

    if (!existing) {
      throw new AppError(404, 'Usuario nao encontrado')
    }

    const nextRole = body.role ?? existing.role
    const allowedModules = body.allowedModules !== undefined || body.role !== undefined
      ? normalizeAllowedModules(nextRole, body.allowedModules as CrmModule[] | undefined)
      : undefined

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(allowedModules !== undefined ? { allowedModules } : {}),
      },
      select: { id: true, name: true, email: true, role: true, allowedModules: true },
    })

    res.json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
})

usersRouter.delete('/:id', authenticate, adminOnly, async (req, res, next) => {
  try {
    const userId = String(req.params.id)

    if (req.user?.sub === userId) {
      throw new AppError(400, 'Voce nao pode remover o proprio usuario')
    }

    await prisma.user.delete({ where: { id: userId } })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})
