'use client'

import { useDashboardContext } from '@/context/DashboardContext'

/**
 * Hook para acessar dados da session no dashboard.
 * Lê do DashboardContext (injetado pelo DashboardLayout) — nunca chama useSession() diretamente,
 * o que elimina a causa raiz do erro "includes of undefined" no next-auth v5 beta.
 */
export function useAuth() {
  const ctx = useDashboardContext()
  return {
    role: ctx.role,
    isAdmin: ctx.isAdmin,
    allowedModules: ctx.allowedModules,
    userName: ctx.userName,
    userEmail: ctx.userEmail,
    photoUrl: ctx.photoUrl,
    accessToken: ctx.accessToken,
    mustChangePassword: ctx.mustChangePassword,
    status: ctx.status,
    updateSession: ctx.updateSession,
    session: null as null,
  }
}
