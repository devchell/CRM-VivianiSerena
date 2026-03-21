import type { DefaultSession } from 'next-auth'
import type { AppPermission, UserProfile } from '@viviani/types'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string
    error?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      allowedModules: string[]
      profile?: UserProfile
      permissions?: AppPermission[]
      mustChangePassword?: boolean
      photoUrl?: string | null
    }
  }

  interface User {
    id: string
    role: string
    allowedModules: string[]
    profile?: UserProfile
    permissions?: AppPermission[]
    mustChangePassword?: boolean
    photoUrl?: string | null
    accessToken?: string
    refreshToken?: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string
    role?: string
    allowedModules?: string[]
    profile?: UserProfile
    permissions?: AppPermission[]
    mustChangePassword?: boolean
    photoUrl?: string | null
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }
}
