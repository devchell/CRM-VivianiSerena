import type { DefaultSession } from 'next-auth'

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
      mustChangePassword?: boolean
      photoUrl?: string | null
    }
  }

  interface User {
    id: string
    role: string
    allowedModules: string[]
    mustChangePassword?: boolean
    photoUrl?: string | null
    accessToken?: string
    refreshToken?: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: string
    allowedModules?: string[]
    mustChangePassword?: boolean
    photoUrl?: string | null
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }
}
