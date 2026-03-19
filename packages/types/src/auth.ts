import { CRM_MODULES, type CrmModule } from './crm'

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER'
export type UserProfile = 'ADMIN' | 'COLLABORATOR' | 'VIEWER'

export const USER_PROFILES = ['ADMIN', 'COLLABORATOR', 'VIEWER'] as const

const MODULE_PERMISSION_ACTIONS = {
  dashboard: ['view'],
  leads: ['view', 'update', 'delete', 'export', 'gdpr'],
  agenda: ['view', 'create', 'update', 'delete'],
  financeiro: ['view', 'create', 'update', 'delete', 'export'],
  'editar-site': ['view', 'update', 'delete', 'publish', 'history', 'restore', 'upload'],
  seguranca: ['view', 'manage'],
} as const

type ModulePermissionMap = typeof MODULE_PERMISSION_ACTIONS

type ModulePermission = {
  [Module in keyof ModulePermissionMap]: `${Module}.${ModulePermissionMap[Module][number]}`
}[keyof ModulePermissionMap]

export type AppPermission =
  | ModulePermission
  | 'users.manage'
  | 'privacy.manage'

export const APP_PERMISSIONS = [
  'dashboard.view',
  'leads.view',
  'leads.update',
  'leads.delete',
  'leads.export',
  'leads.gdpr',
  'agenda.view',
  'agenda.create',
  'agenda.update',
  'agenda.delete',
  'financeiro.view',
  'financeiro.create',
  'financeiro.update',
  'financeiro.delete',
  'financeiro.export',
  'editar-site.view',
  'editar-site.update',
  'editar-site.delete',
  'editar-site.publish',
  'editar-site.history',
  'editar-site.restore',
  'editar-site.upload',
  'seguranca.view',
  'seguranca.manage',
  'users.manage',
  'privacy.manage',
] as const satisfies readonly AppPermission[]

const VIEW_ONLY_PERMISSIONS = new Set<AppPermission>([
  'dashboard.view',
  'leads.view',
  'agenda.view',
  'financeiro.view',
])

const COLLABORATOR_PERMISSION_PRESETS: Record<CrmModule, AppPermission[]> = {
  dashboard: ['dashboard.view'],
  leads: ['leads.view', 'leads.update', 'leads.delete', 'leads.export', 'leads.gdpr'],
  agenda: ['agenda.view', 'agenda.create', 'agenda.update', 'agenda.delete'],
  financeiro: ['financeiro.view', 'financeiro.create', 'financeiro.update', 'financeiro.delete', 'financeiro.export'],
  'editar-site': [],
  seguranca: [],
}

const VIEWER_PERMISSION_PRESETS: Record<CrmModule, AppPermission[]> = {
  dashboard: ['dashboard.view'],
  leads: ['leads.view'],
  agenda: ['agenda.view'],
  financeiro: ['financeiro.view'],
  'editar-site': [],
  seguranca: [],
}

function dedupe<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

export function isUserProfile(value: string): value is UserProfile {
  return (USER_PROFILES as readonly string[]).includes(value)
}

export function isCrmModuleGrant(value: string): value is CrmModule {
  return (CRM_MODULES as readonly string[]).includes(value)
}

export function isAppPermission(value: string): value is AppPermission {
  return (APP_PERMISSIONS as readonly string[]).includes(value)
}

export function getPersistedRoleForProfile(profile: UserProfile): UserRole {
  switch (profile) {
    case 'ADMIN':
      return 'ADMIN'
    case 'COLLABORATOR':
      return 'MANAGER'
    case 'VIEWER':
      return 'VIEWER'
  }
}

export function getPermissionsForProfile(profile: Exclude<UserProfile, 'ADMIN'>, modules: readonly CrmModule[]): AppPermission[] {
  const source = profile === 'COLLABORATOR'
    ? COLLABORATOR_PERMISSION_PRESETS
    : VIEWER_PERMISSION_PRESETS

  return dedupe(modules.flatMap((module) => source[module] ?? []))
}

function getLegacyPermissions(role: UserRole, module: CrmModule): AppPermission[] {
  if (role === 'ADMIN') {
    return [...APP_PERMISSIONS]
  }

  if (role === 'MANAGER') {
    return COLLABORATOR_PERMISSION_PRESETS[module] ?? []
  }

  return VIEWER_PERMISSION_PRESETS[module] ?? []
}

export function resolvePermissions(role: UserRole, grants?: readonly string[]): AppPermission[] {
  if (role === 'ADMIN') {
    return [...APP_PERMISSIONS]
  }

  const normalizedGrants = Array.isArray(grants) ? grants : []
  const explicitPermissions = normalizedGrants.filter(isAppPermission)
  const legacyModules = normalizedGrants.filter(isCrmModuleGrant)
  const derivedPermissions = legacyModules.flatMap((module) => getLegacyPermissions(role, module))

  return dedupe([...explicitPermissions, ...derivedPermissions])
}

export function resolveAllowedModules(role: UserRole, grants?: readonly string[]): CrmModule[] {
  if (role === 'ADMIN') {
    return [...CRM_MODULES]
  }

  const normalizedGrants = Array.isArray(grants) ? grants : []
  const explicitModules = resolvePermissions(role, normalizedGrants)
    .map((permission) => permission.split('.')[0])
    .filter(isCrmModuleGrant)

  return dedupe([
    ...normalizedGrants.filter(isCrmModuleGrant),
    ...explicitModules,
  ])
}

export function inferUserProfile(role: UserRole, grants?: readonly string[]): UserProfile {
  if (role === 'ADMIN') {
    return 'ADMIN'
  }

  if (role === 'MANAGER') {
    return 'COLLABORATOR'
  }

  const explicitPermissions = (Array.isArray(grants) ? grants : []).filter(isAppPermission)
  if (explicitPermissions.length === 0) {
    return 'VIEWER'
  }

  return explicitPermissions.every((permission) => VIEW_ONLY_PERMISSIONS.has(permission))
    ? 'VIEWER'
    : 'COLLABORATOR'
}

export function hasPermission(
  role: UserRole,
  grants: readonly string[] | undefined,
  permission: AppPermission
): boolean {
  return resolvePermissions(role, grants).includes(permission)
}

export function hasModuleAccess(
  role: UserRole,
  grants: readonly string[] | undefined,
  module: CrmModule
): boolean {
  return resolveAllowedModules(role, grants).includes(module)
}

export function buildStoredGrantsForProfile(profile: UserProfile, modules: readonly CrmModule[]): string[] {
  if (profile === 'ADMIN') {
    return []
  }

  return getPermissionsForProfile(profile, modules)
}

export interface User {
  id: string
  email: string
  role: UserRole
  profile?: UserProfile
  permissions?: AppPermission[]
  allowedModules?: CrmModule[]
  createdAt: Date
  lastLogin: Date | null
}

export interface AuthTokenPayload {
  sub: string
  email: string
  name?: string | null
  role: UserRole
  profile?: UserProfile
  permissions?: AppPermission[]
  allowedModules?: CrmModule[]
  mustChangePassword?: boolean
  photoUrl?: string | null
  iat: number
  exp: number
}

export interface LoginCredentials {
  email: string
  password: string
  totpCode?: string
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: number
}
