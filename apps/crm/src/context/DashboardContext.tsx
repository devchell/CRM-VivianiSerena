'use client'

import { createContext, useContext } from 'react'
import type { Session } from 'next-auth'
import type { AppPermission, CrmModule, UserProfile } from '@viviani/types'

type SessionUpdatePayload = Partial<Omit<Session, 'user'>> & {
  user?: Partial<Session['user']>
}

type UpdateFn = (data?: SessionUpdatePayload) => Promise<Session | null>

export interface DashboardContextValue {
  userId: string | null
  role: string
  profile: UserProfile | null
  isAdmin: boolean
  allowedModules: string[]
  permissions: AppPermission[]
  userName: string | null
  userEmail: string | null
  photoUrl: string | null
  accessToken: string
  mustChangePassword: boolean
  status: string
  hasPermission: (permission: AppPermission) => boolean
  canAccessModule: (module: CrmModule) => boolean
  updateSession: UpdateFn
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: DashboardContextValue
}) {
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (ctx) {
    return ctx
  }

  return {
    userId: null,
    role: 'VIEWER',
    profile: null,
    isAdmin: false,
    allowedModules: [],
    permissions: [],
    userName: null,
    userEmail: null,
    photoUrl: null,
    accessToken: '',
    mustChangePassword: false,
    status: 'loading',
    hasPermission: () => false,
    canAccessModule: () => false,
    updateSession: async () => null,
  }
}
