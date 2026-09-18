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
  normalizeUserRole,
  resolveAllowedModules,
  type AppPermission,
  type CrmModule,
  type UserRole,
} from '@viviani/types'
import Sidebar from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardProvider } from '@/context/DashboardContext'
import { useSidebar } from '@/hooks/useSidebar'
import { API_BASE_URL, invalidateApiCache } from '@/lib/api-client'
import { REALTIME_EVENT, parseRealtimePayload, type RealtimeDataEvent } from '@/lib/realtime'

const MODULE_ROUTE_MATCHERS = [
  { prefix: '/dashboard', module: 'dashboard' },
  { prefix: '/leads', module: 'leads' },
  { prefix: '/clientes', module: 'leads' },
  { prefix: '/agenda', module: 'agenda' },
  { prefix: '/financeiro', module: 'financeiro' },
  { prefix: '/editar-site', module: 'editar-site' },
  { prefix: '/site', module: 'editar-site' },
  { prefix: '/seguranca', module: 'seguranca' },
  { prefix: '/colaboradores', permission: 'users.manage' },
  { prefix: '/administracao', permission: 'users.manage' },
] as const

function toKnownRole(value: string | undefined): UserRole {
  return normalizeUserRole(value)
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
  const sidebar = useSidebar()

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

  useEffect(() => {
    if (!accessToken) return

    let cancelled = false
    let socket: import('socket.io-client').Socket | null = null

    const broadcast = (event: RealtimeDataEvent) => {
      invalidateApiCache()
      window.dispatchEvent(new CustomEvent<RealtimeDataEvent>(REALTIME_EVENT, { detail: event }))
    }

    const connect = async () => {
      const { io } = await import('socket.io-client')
      if (cancelled) return

      socket = io(API_BASE_URL, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
      })

      socket.on('connect', () => socket?.emit('join:dashboard'))
      socket.on('data_changed', (payload: unknown) => {
        const event = parseRealtimePayload(payload)
        if (event) broadcast(event)
      })
    }

    void connect().catch((error: unknown) => {
      console.warn('[realtime] Não foi possível conectar ao canal em tempo real.', error)
    })

    const fallbackTimer = window.setInterval(() => {
      if (!socket?.connected) {
        broadcast({ resource: '*', method: 'POLL', at: new Date().toISOString() })
      }
    }, 30_000)

    const reconnectWhenOnline = () => socket?.connect()
    window.addEventListener('online', reconnectWhenOnline)

    return () => {
      cancelled = true
      window.clearInterval(fallbackTimer)
      window.removeEventListener('online', reconnectWhenOnline)
      socket?.disconnect()
    }
  }, [accessToken])

  useEffect(() => {
    const timers = new WeakMap<HTMLElement, number>()

    const revealScrollbar = (element: HTMLElement) => {
      element.classList.add('is-scrolling')
      const previousTimer = timers.get(element)
      if (previousTimer !== undefined) window.clearTimeout(previousTimer)

      const timer = window.setTimeout(() => {
        element.classList.remove('is-scrolling')
        timers.delete(element)
      }, 700)

      timers.set(element, timer)
    }

    const handleElementScroll = (event: Event) => {
      const target = event.target
      revealScrollbar(target instanceof HTMLElement ? target : document.documentElement)
    }

    const handleWindowScroll = () => revealScrollbar(document.documentElement)

    document.addEventListener('scroll', handleElementScroll, { capture: true, passive: true })
    window.addEventListener('scroll', handleWindowScroll, { passive: true })

    return () => {
      document.removeEventListener('scroll', handleElementScroll, true)
      window.removeEventListener('scroll', handleWindowScroll)
      document.documentElement.classList.remove('is-scrolling')
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (mustChangePassword) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
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
      <div className="crm-panel flex h-screen min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
        <Sidebar {...sidebar} />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header onMobileMenuClick={sidebar.toggleMobile} />
          <main className="relative min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
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
