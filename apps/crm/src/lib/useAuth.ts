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
    userId: ctx.userId,
    role: ctx.role,
    profile: ctx.profile,
    isAdmin: ctx.isAdmin,
    allowedModules: ctx.allowedModules,
    permissions: ctx.permissions,
    userName: ctx.userName,
    userEmail: ctx.userEmail,
    photoUrl: ctx.photoUrl,
    accessToken: ctx.accessToken,
    mustChangePassword: ctx.mustChangePassword,
    status: ctx.status,
    hasPermission: ctx.hasPermission,
    canAccessModule: ctx.canAccessModule,
    updateSession: ctx.updateSession,
    session: null as null,
  }
}
