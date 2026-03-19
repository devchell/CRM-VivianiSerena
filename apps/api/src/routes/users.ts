import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import {
  APP_PERMISSIONS,
  CRM_MODULES,
  USER_PROFILES,
  buildStoredGrantsForProfile,
  getPersistedRoleForProfile,
  inferUserProfile,
  resolveAllowedModules,
  resolvePermissions,
  type AppPermission,
  type CrmModule,
  type UserProfile,
  type UserRole,
} from '@viviani/types'
import { prisma } from '../lib/prisma'
import { apiEnv } from '../lib/env'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { emailService } from '../infrastructure/email'

export const usersRouter: Router = Router()

const MODULES = [...CRM_MODULES] as [CrmModule, ...CrmModule[]]
const PERMISSIONS = [...APP_PERMISSIONS] as [AppPermission, ...AppPermission[]]
const LEGACY_ROLES = ['ADMIN', 'MANAGER', 'VIEWER'] as const
const PROFILES = [...USER_PROFILES] as [UserProfile, ...UserProfile[]]

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
  role: z.enum(LEGACY_ROLES).optional(),
  profile: z.enum(PROFILES).optional(),
  allowedModules: z.array(z.enum(MODULES)).optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
}).superRefine((data, ctx) => {
  if (!data.role && !data.profile) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['profile'],
      message: 'Perfil ou role e obrigatorio',
    })
  }
})

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(LEGACY_ROLES).optional(),
  profile: z.enum(PROFILES).optional(),
  allowedModules: z.array(z.enum(MODULES)).optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
})

const resetTempPasswordSchema = z.object({
  sendEmail: z.boolean().optional().default(false),
})

function unique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

function normalizeModuleSelection(modules?: readonly CrmModule[]): CrmModule[] {
  return Array.isArray(modules) ? unique(modules) : []
}

function serializeUser(user: {
  id: string
  name: string | null
  email: string
  phone?: string | null
  role: UserRole
  allowedModules: string[]
  photoUrl?: string | null
  createdAt?: Date
  lastLogin?: Date | null
  mustChangePassword?: boolean
}) {
  const isInactive = !user.lastLogin

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    profile: inferUserProfile(user.role, user.allowedModules),
    permissions: resolvePermissions(user.role, user.allowedModules),
    allowedModules: resolveAllowedModules(user.role, user.allowedModules),
    photoUrl: user.photoUrl ?? null,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin ?? null,
    mustChangePassword: user.mustChangePassword ?? false,
    accountStatus: isInactive ? 'INACTIVE' : 'ACTIVE',
  }
}

function resolveAccessAssignment(
  input: {
    role?: UserRole
    profile?: UserProfile
    allowedModules?: CrmModule[]
    permissions?: AppPermission[]
  },
  fallback?: { role: UserRole; profile: UserProfile }
) {
  const explicitPermissions = input.permissions ? unique(input.permissions) : undefined
  const selectedModules = normalizeModuleSelection(input.allowedModules)

  if (input.profile) {
    const role = getPersistedRoleForProfile(input.profile)
    const storedGrants = input.profile === 'ADMIN'
      ? []
      : explicitPermissions ?? buildStoredGrantsForProfile(input.profile, selectedModules)

    return { role, storedGrants, profile: input.profile }
  }

  if (input.role) {
    if (input.role === 'ADMIN') {
      return { role: 'ADMIN' as const, storedGrants: [], profile: 'ADMIN' as const }
    }

    const storedGrants = explicitPermissions ?? selectedModules
    return {
      role: input.role,
      storedGrants,
      profile: inferUserProfile(input.role, storedGrants),
    }
  }

  if (!fallback) {
    throw new AppError(400, 'Perfil ou role e obrigatorio')
  }

  if (explicitPermissions) {
    return {
      role: fallback.role,
      storedGrants: explicitPermissions,
      profile: inferUserProfile(fallback.role, explicitPermissions),
    }
  }

  if (input.allowedModules !== undefined) {
    if (fallback.profile === 'ADMIN') {
      return { role: 'ADMIN' as const, storedGrants: [], profile: 'ADMIN' as const }
    }

    const profile: UserProfile = fallback.role === 'MANAGER'
      ? 'COLLABORATOR'
      : 'VIEWER'

    return {
      role: getPersistedRoleForProfile(profile),
      storedGrants: buildStoredGrantsForProfile(profile, selectedModules),
      profile,
    }
  }

  return {
    role: fallback.role,
    storedGrants: undefined,
    profile: fallback.profile,
  }
}

async function sendCollaboratorInvite(
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    role: UserRole
    allowedModules: string[]
    mustChangePassword: boolean
  },
  tempPassword: string
) {
  const serialized = serializeUser(user)
  const inviteEmailSent = await emailService.sendCollaboratorInvite({
    to: user.email,
    name: user.name ?? user.email,
    tempPassword,
    crmUrl: apiEnv.crmUrl,
    role: user.role,
    profile: serialized.profile,
    modules: serialized.allowedModules,
  })

  return {
    serialized,
    inviteEmailSent,
  }
}

async function rotateTemporaryPassword(
  userId: string,
  options: { sendEmail: boolean }
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      allowedModules: true,
      mustChangePassword: true,
      lastLogin: true,
    },
  })

  if (!existing) {
    throw new AppError(404, 'Usuario nao encontrado')
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      allowedModules: true,
      mustChangePassword: true,
      lastLogin: true,
    },
  })

  let inviteEmailSent: boolean | undefined

  if (options.sendEmail) {
    const inviteResult = await sendCollaboratorInvite(updated, tempPassword)
    inviteEmailSent = inviteResult.inviteEmailSent

    return {
      serialized: inviteResult.serialized,
      tempPassword,
      inviteEmailSent,
    }
  }

  return {
    serialized: serializeUser(updated),
    tempPassword,
    inviteEmailSent,
  }
}

usersRouter.get('/', authenticate, authorizePermission('users.manage'), async (_req, res, next) => {
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

    res.json({ success: true, data: users.map((user) => serializeUser(user)) })
  } catch (error) {
    next(error)
  }
})

usersRouter.post('/', authenticate, authorizePermission('users.manage'), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body)
    const exists = await prisma.user.findUnique({ where: { email: body.email } })

    if (exists) {
      throw new AppError(409, 'E-mail ja cadastrado')
    }

    const access = resolveAccessAssignment({
      role: body.role,
      profile: body.profile,
      allowedModules: body.allowedModules,
      permissions: body.permissions,
    })

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        passwordHash,
        role: access.role,
        allowedModules: access.storedGrants ?? [],
        mustChangePassword: true,
        twoFactorEnabled: false,
        twoFactorEmailEnabled: false,
        twoFactorSmsEnabled: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        allowedModules: true,
        mustChangePassword: true,
        lastLogin: true,
      },
    })

    const inviteResult = await sendCollaboratorInvite(user, tempPassword)

    res.status(201).json({
      success: true,
      message: inviteResult.inviteEmailSent
        ? 'Convite enviado por e-mail'
        : 'Colaborador criado, mas o e-mail de convite falhou.',
      data: inviteResult.serialized,
      meta: {
        inviteEmailSent: inviteResult.inviteEmailSent,
        ...(inviteResult.inviteEmailSent ? {} : { tempPassword }),
      },
    })
  } catch (error) {
    next(error)
  }
})

usersRouter.patch('/:id', authenticate, authorizePermission('users.manage'), async (req, res, next) => {
  try {
    const body = updateUserSchema.parse(req.body)
    const userId = String(req.params.id)
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        lastLogin: true,
        role: true,
        allowedModules: true,
      },
    })

    if (!existing) {
      throw new AppError(404, 'Usuario nao encontrado')
    }

    if (body.email !== undefined && body.email !== existing.email) {
      if (existing.lastLogin) {
        throw new AppError(400, 'O e-mail so pode ser alterado para colaboradores inativos')
      }

      const emailExists = await prisma.user.findUnique({
        where: { email: body.email },
        select: { id: true },
      })

      if (emailExists && emailExists.id !== userId) {
        throw new AppError(409, 'E-mail ja cadastrado')
      }
    }

    const existingProfile = inferUserProfile(existing.role, existing.allowedModules)
    const access = body.role !== undefined
      || body.profile !== undefined
      || body.allowedModules !== undefined
      || body.permissions !== undefined
      ? resolveAccessAssignment(
          {
            role: body.role,
            profile: body.profile,
            allowedModules: body.allowedModules,
            permissions: body.permissions,
          },
          { role: existing.role, profile: existingProfile }
        )
      : undefined

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        ...(access ? { role: access.role, allowedModules: access.storedGrants ?? [] } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        allowedModules: true,
        mustChangePassword: true,
        lastLogin: true,
      },
    })

    res.json({ success: true, data: serializeUser(user) })
  } catch (error) {
    next(error)
  }
})

usersRouter.post('/:id/resend-invite', authenticate, authorizePermission('users.manage'), async (req, res, next) => {
  try {
    const userId = String(req.params.id)
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLogin: true },
    })

    if (!existing) {
      throw new AppError(404, 'Usuario nao encontrado')
    }

    if (existing.lastLogin) {
      throw new AppError(400, 'Reenvio de convite disponivel apenas para colaboradores inativos')
    }

    const result = await rotateTemporaryPassword(userId, { sendEmail: true })

    res.json({
      success: true,
      message: result.inviteEmailSent
        ? 'Convite reenviado por e-mail'
        : 'Senha temporaria redefinida, mas o e-mail de convite falhou.',
      data: result.serialized,
      meta: {
        inviteEmailSent: result.inviteEmailSent ?? false,
        ...(result.inviteEmailSent ? {} : { tempPassword: result.tempPassword }),
      },
    })
  } catch (error) {
    next(error)
  }
})

usersRouter.post('/:id/reset-temp-password', authenticate, authorizePermission('users.manage'), async (req, res, next) => {
  try {
    const userId = String(req.params.id)
    const body = resetTempPasswordSchema.parse(req.body ?? {})
    const result = await rotateTemporaryPassword(userId, { sendEmail: body.sendEmail })

    res.json({
      success: true,
      message: body.sendEmail
        ? result.inviteEmailSent
          ? 'Senha temporaria redefinida e enviada por e-mail'
          : 'Senha temporaria redefinida, mas o e-mail falhou.'
        : 'Senha temporaria redefinida com sucesso',
      data: result.serialized,
      meta: {
        tempPassword: result.tempPassword,
        ...(result.inviteEmailSent !== undefined ? { inviteEmailSent: result.inviteEmailSent } : {}),
      },
    })
  } catch (error) {
    next(error)
  }
})

usersRouter.delete('/:id', authenticate, authorizePermission('users.manage'), async (req, res, next) => {
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
