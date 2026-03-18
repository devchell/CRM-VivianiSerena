'use client'

import { createContext, useContext } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UpdateFn = (data?: any) => Promise<any>

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
