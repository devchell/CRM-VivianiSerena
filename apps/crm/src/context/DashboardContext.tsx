'use client'

import { createContext, useContext } from 'react'
import type { Session } from 'next-auth'

type SessionUpdatePayload = Partial<Omit<Session, 'user'>> & {
  user?: Partial<Session['user']>
}

type UpdateFn = (data?: SessionUpdatePayload) => Promise<Session | null>

export interface DashboardContextValue {
  role: string
  isAdmin: boolean
  allowedModules: string[]
  userName: string | null
  userEmail: string | null
  photoUrl: string | null
  accessToken: string
  mustChangePassword: boolean
  status: string
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

/** Lê os dados da session a partir do contexto do Dashboard.
 *  Só pode ser usado dentro de componentes filhos do DashboardLayout. */
export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    // Fallback seguro — nunca deve acontecer dentro do dashboard
    return {
      role: 'user',
      isAdmin: false,
      allowedModules: [],
      userName: null,
      userEmail: null,
      photoUrl: null,
      accessToken: '',
      mustChangePassword: false,
      status: 'loading',
      updateSession: async () => null,
    }
  }
  return ctx
}
