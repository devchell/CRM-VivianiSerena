export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER'

export interface User {
  id: string
  email: string
  role: UserRole
  createdAt: Date
  lastLogin: Date | null
}

export interface AuthTokenPayload {
  sub: string
  email: string
  name?: string | null
  role: UserRole
  allowedModules?: string[]
  mustChangePassword?: boolean
  photoUrl?: string | null
  iat: number
  exp: number
}

export interface LoginCredentials {
  email: string
  password: string
  totpCode?: string
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: number
}
