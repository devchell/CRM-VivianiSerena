'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
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
  { prefix: '/colaboradores', adminOnly: true },
] as const

function resolveAuthorizedFallback(isAdmin: boolean, allowedModules: string[]): string {
  if (isAdmin) return '/dashboard'

  const preferredModule = MODULE_ROUTE_MATCHERS.find((item) => {
    return 'module' in item && allowedModules.includes(item.module)
  })

  if (preferredModule && 'module' in preferredModule) {
    return preferredModule.prefix
  }

  return '/configuracoes'
}

function canAccessPath(pathname: string, isAdmin: boolean, allowedModules: string[]): boolean {
  const matcher = MODULE_ROUTE_MATCHERS.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))

  if (!matcher) {
    return true
  }

  if (!('module' in matcher)) {
    return isAdmin
  }

  return isAdmin || allowedModules.includes(matcher.module)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = (session?.user as any) ?? {}
  const role: string = typeof u.role === 'string' ? u.role : 'user'
  const allowedModules: string[] = Array.isArray(u.allowedModules) ? u.allowedModules : []
  const userName: string | null = session?.user?.name ?? null
  const userEmail: string | null = session?.user?.email ?? null
  const photoUrl: string | null = u.photoUrl ?? session?.user?.image ?? null
  const accessToken: string = (session as any)?.accessToken ?? ''
  const mustChangePassword: boolean = u.mustChangePassword ?? false
  const isAdmin = role === 'ADMIN' || role === 'admin'
  const hasRouteAccess = canAccessPath(pathname ?? '/', isAdmin, allowedModules)
  const fallbackRoute = resolveAuthorizedFallback(isAdmin, allowedModules)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = session as any
    if (status === 'authenticated' && s?.error === 'RefreshAccessTokenError') router.push('/login')
    if (status === 'authenticated' && s?.user?.mustChangePassword) router.push('/definir-senha')
  }, [status, router, session])

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

  if (!session || !session.user) return null

  const contextValue = {
    role,
    isAdmin,
    allowedModules,
    userName,
    userEmail,
    photoUrl,
    accessToken,
    mustChangePassword,
    status,
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
