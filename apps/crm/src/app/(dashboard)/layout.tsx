'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  hasModuleAccess,
  hasPermission,
  inferUserProfile,
  resolveAllowedModules,
  type AppPermission,
  type CrmModule,
  type UserRole,
} from '@viviani/types'
import Sidebar from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardProvider } from '@/context/DashboardContext'

const MODULE_ROUTE_MATCHERS = [
  { prefix: '/dashboard', module: 'dashboard' },
  { prefix: '/leads', module: 'leads' },
  { prefix: '/agenda', module: 'agenda' },
  { prefix: '/financeiro', module: 'financeiro' },
  { prefix: '/editar-site', module: 'editar-site' },
  { prefix: '/site', module: 'editar-site' },
  { prefix: '/seguranca', module: 'seguranca' },
  { prefix: '/colaboradores', permission: 'users.manage' },
  { prefix: '/administracao', permission: 'users.manage' },
] as const

function toKnownRole(value: string | undefined): UserRole {
  return value === 'ADMIN' || value === 'MANAGER' || value === 'VIEWER'
    ? value
    : 'VIEWER'
}

function resolveAuthorizedFallback(role: UserRole, grants: string[]): string {
  if (role === 'ADMIN') return '/dashboard'

  const preferredModule = MODULE_ROUTE_MATCHERS.find((item) => {
    if ('module' in item) {
      return hasModuleAccess(role, grants, item.module as CrmModule)
    }

    return hasPermission(role, grants, item.permission as AppPermission)
  })

  return preferredModule?.prefix ?? '/configuracoes'
}

function canAccessPath(pathname: string, role: UserRole, grants: string[]): boolean {
  const matcher = MODULE_ROUTE_MATCHERS.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))

  if (!matcher) {
    return true
  }

  if ('module' in matcher) {
    return hasModuleAccess(role, grants, matcher.module as CrmModule)
  }

  return hasPermission(role, grants, matcher.permission as AppPermission)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const typedSession = session as Session | null
  const user = typedSession?.user

  const role = toKnownRole(typeof user?.role === 'string' ? user.role : undefined)
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []
  const grants = permissions.length > 0
    ? permissions
    : (Array.isArray(user?.allowedModules) ? user.allowedModules : [])
  const allowedModules = resolveAllowedModules(role, grants)
  const profile = user?.profile ?? inferUserProfile(role, grants)
  const userId = typeof user?.id === 'string' ? user.id : null
  const userName = typedSession?.user?.name ?? null
  const userEmail = typedSession?.user?.email ?? null
  const photoUrl = user?.photoUrl ?? typedSession?.user?.image ?? null
  const accessToken = typedSession?.accessToken ?? ''
  const mustChangePassword = user?.mustChangePassword ?? false
  const isAdmin = role === 'ADMIN'
  const hasRouteAccess = canAccessPath(pathname ?? '/', role, grants)
  const fallbackRoute = resolveAuthorizedFallback(role, grants)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && typedSession?.error === 'RefreshAccessTokenError') router.push('/login')
    if (status === 'authenticated' && typedSession?.user?.mustChangePassword) router.replace('/definir-senha')
  }, [status, router, typedSession])

  useEffect(() => {
    if (status === 'authenticated' && !hasRouteAccess) {
      router.replace(fallbackRoute)
    }
  }, [fallbackRoute, hasRouteAccess, router, status])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-cream dark:bg-charcoal-900">
        <div className="w-8 h-8 border-2 border-rose-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (mustChangePassword) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream dark:bg-charcoal-900">
        <div className="w-8 h-8 border-2 border-rose-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || !session.user) return null

  const contextValue = {
    userId,
    role,
    profile,
    isAdmin,
    allowedModules,
    permissions,
    userName,
    userEmail,
    photoUrl,
    accessToken,
    mustChangePassword,
    status,
    hasPermission: (permission: AppPermission) => hasPermission(role, grants, permission),
    canAccessModule: (module: CrmModule) => hasModuleAccess(role, grants, module),
    updateSession: update,
  }

  return (
    <DashboardProvider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-cream dark:bg-charcoal-900">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 relative">
            {hasRouteAccess ? (
              <motion.div
                key={pathname}
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="min-h-full opacity-0"
              >
                {children}
              </motion.div>
            ) : null}
          </main>
        </div>
      </div>
    </DashboardProvider>
  )
}
