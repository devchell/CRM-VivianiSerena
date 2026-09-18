import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import {
  inferUserProfile,
  isAppPermission,
  isUserProfile,
  normalizeUserRole,
  resolveAllowedModules,
  type AppPermission,
  type UserProfile,
  type UserRole,
} from '@viviani/types'

const ACCESS_TOKEN_LIFETIME_MS = 14 * 60 * 1000

type KnownRole = UserRole

type ApiAuthUser = {
  id: string
  name?: string | null
  email: string
  username?: string | null
  role: string
  profile?: UserProfile
  permissions?: AppPermission[]
  allowedModules?: string[]
  mustChangePassword?: boolean
  photoUrl?: string | null
}

type JwtCallbackParams = Parameters<NonNullable<NonNullable<NextAuthConfig['callbacks']>['jwt']>>[0]
type SessionCallbackParams = Parameters<
  NonNullable<NonNullable<NextAuthConfig['callbacks']>['session']>
>[0]

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readPermissions(value: unknown): AppPermission[] {
  return readStringArray(value).filter(isAppPermission)
}

function getApiBaseUrl(): string {
  const value = process.env.API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!value) {
    throw new Error('[auth] Missing API_BASE_URL or NEXT_PUBLIC_API_URL')
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`[auth] Invalid API URL: ${value}`)
  }

  if (
    process.env.NODE_ENV === 'production' &&
    ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)
  ) {
    throw new Error('[env] API_BASE_URL must not point to localhost in this deployment model')
  }

  return value.replace(/\/+$/, '')
}

function toKnownRole(value: string | undefined): KnownRole {
  return normalizeUserRole(value)
}

function toKnownProfile(value: unknown): UserProfile | undefined {
  return typeof value === 'string' && isUserProfile(value) ? value : undefined
}

function normalizeAuthUser(user: ApiAuthUser) {
  const role = toKnownRole(user.role)
  const permissions = Array.isArray(user.permissions) ? user.permissions : []
  const allowedModules = Array.isArray(user.allowedModules)
    ? user.allowedModules
    : resolveAllowedModules(role, permissions)
  const profile =
    user.profile ?? inferUserProfile(role, permissions.length > 0 ? permissions : allowedModules)

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    username: user.username ?? null,
    role,
    profile,
    permissions,
    allowedModules,
    mustChangePassword: user.mustChangePassword ?? false,
    photoUrl: user.photoUrl ?? null,
  }
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const apiBaseUrl = getApiBaseUrl()
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data: { accessToken: string; refreshToken?: string } }
    return {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken ?? refreshToken,
    }
  } catch {
    return null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Usuário ou e-mail', type: 'text' },
        password: { label: 'Password', type: 'password' },
        twoFactorSessionToken: { label: '2FA Session Token', type: 'text' },
      },
      async authorize(credentials) {
        const apiBaseUrl = getApiBaseUrl()

        if (credentials?.twoFactorSessionToken) {
          const parsed = z.object({ twoFactorSessionToken: z.string() }).safeParse(credentials)
          if (!parsed.success) return null

          const res = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: credentials.identifier ?? '',
              password: credentials.password ?? '',
              twoFactorSessionToken: parsed.data.twoFactorSessionToken,
            }),
          })

          if (!res.ok) {
            const errBody = await res.text().catch(() => '')
            console.error('[auth] 2FA login failed:', res.status, errBody)
            return null
          }

          const data = (await res.json()) as {
            data: {
              user: ApiAuthUser
              accessToken: string
              refreshToken: string
            }
          }

          const user = normalizeAuthUser(data.data.user)
          return {
            ...user,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          }
        }

        const parsed = z
          .object({
            identifier: z.string().trim().min(1).max(254),
            password: z.string().min(8),
          })
          .safeParse(credentials)

        if (!parsed.success) {
          console.error('[auth] Zod validation failed:', parsed.error.flatten())
          return null
        }

        const res = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        })

        if (!res.ok) {
          const errBody = await res.text().catch(() => '')
          console.error('[auth] Login API error:', res.status, errBody)
          return null
        }

        const data = (await res.json()) as {
          data: {
            requiresTwoFactor?: boolean
            user?: ApiAuthUser
            accessToken?: string
            refreshToken?: string
          }
        }

        if (
          data.data?.requiresTwoFactor ||
          !data.data.user ||
          !data.data.accessToken ||
          !data.data.refreshToken
        ) {
          return null
        }

        const user = normalizeAuthUser(data.data.user)
        return {
          ...user,
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: JwtCallbackParams) {
      if (trigger === 'update' && session?.user) {
        if (session.user.name) token.name = session.user.name
        if (session.user.image !== undefined) token.photoUrl = session.user.image ?? null
        if (typeof session.user.role === 'string') token.role = session.user.role
        if (typeof session.user.profile === 'string') token.profile = session.user.profile
        if (Array.isArray(session.user.permissions)) token.permissions = session.user.permissions
        if (Array.isArray(session.user.allowedModules))
          token.allowedModules = session.user.allowedModules
      }

      if (user) {
        const currentUser = user as ApiAuthUser & {
          accessToken: string
          refreshToken: string
        }
        const normalized = normalizeAuthUser(currentUser)

        token.name = normalized.name ?? token.email?.split('@')[0] ?? 'Usuário'
        token.userId = normalized.id
        token.role = normalized.role
        token.profile = normalized.profile
        token.permissions = normalized.permissions
        token.allowedModules = normalized.allowedModules
        token.mustChangePassword = normalized.mustChangePassword
        token.photoUrl = normalized.photoUrl
        token.accessToken = currentUser.accessToken
        token.refreshToken = currentUser.refreshToken
        token.expiresAt = Date.now() + ACCESS_TOKEN_LIFETIME_MS
        return token
      }

      token.name =
        typeof token.name === 'string' && token.name.length > 0
          ? token.name
          : typeof token.email === 'string'
            ? token.email.split('@')[0]
            : 'Usuário'

      const role = toKnownRole(typeof token.role === 'string' ? token.role : undefined)
      token.role = role

      const permissions = readPermissions(token.permissions)
      token.permissions = permissions

      const allowedModules = readStringArray(token.allowedModules)
      token.allowedModules =
        allowedModules.length > 0 ? allowedModules : resolveAllowedModules(role, permissions)

      token.profile =
        toKnownProfile(token.profile) ??
        inferUserProfile(role, permissions.length > 0 ? permissions : allowedModules)

      token.mustChangePassword =
        typeof token.mustChangePassword === 'boolean' ? token.mustChangePassword : false

      token.photoUrl = token.photoUrl ?? null

      if (Date.now() < ((token.expiresAt as number) ?? 0)) {
        return token
      }

      const refreshed = await refreshAccessToken(token.refreshToken as string)
      if (!refreshed) {
        return { ...token, error: 'RefreshAccessTokenError' }
      }

      let updatedName = token.name as string
      let updatedRole = role
      let updatedProfile = toKnownProfile(token.profile)
      let updatedPermissions: AppPermission[] = [...readPermissions(token.permissions)]
      let updatedModules: string[] = [...readStringArray(token.allowedModules)]
      let updatedPhoto: string | null = typeof token.photoUrl === 'string' ? token.photoUrl : null
      let updatedMustChange =
        typeof token.mustChangePassword === 'boolean' ? token.mustChangePassword : false

      try {
        const apiBaseUrl = getApiBaseUrl()
        const res = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${refreshed.accessToken}` },
        })

        if (res.ok) {
          const json = await res.json()
          const currentUser = normalizeAuthUser((json?.data ?? json ?? {}) as ApiAuthUser)
          updatedName = currentUser.name ?? updatedName
          updatedRole = currentUser.role
          updatedProfile = currentUser.profile
          updatedPermissions = currentUser.permissions
          updatedModules = currentUser.allowedModules
          updatedPhoto = currentUser.photoUrl
          updatedMustChange = currentUser.mustChangePassword
        }
      } catch (error) {
        // Keep the token values when the refresh companion request fails.
        console.warn('[auth] Refresh companion request failed.', error)
      }

      return {
        ...token,
        name: updatedName,
        role: updatedRole,
        profile: updatedProfile,
        permissions: updatedPermissions,
        allowedModules: updatedModules,
        photoUrl: updatedPhoto,
        mustChangePassword: updatedMustChange,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: Date.now() + ACCESS_TOKEN_LIFETIME_MS,
        error: undefined,
      }
    },

    async session({ session, token }: SessionCallbackParams) {
      session.user.name =
        typeof token.name === 'string' && token.name.length > 0
          ? token.name
          : typeof session.user.email === 'string'
            ? session.user.email.split('@')[0]
            : 'Usuário'

      session.user.id =
        typeof token.userId === 'string' && token.userId.length > 0
          ? token.userId
          : typeof token.sub === 'string'
            ? token.sub
            : ''

      session.user.role =
        typeof token.role === 'string' && token.role.length > 0 ? token.role : 'VIEWER'

      session.user.profile =
        toKnownProfile(token.profile) ??
        inferUserProfile(
          toKnownRole(session.user.role),
          readPermissions(token.permissions).length > 0
            ? readPermissions(token.permissions)
            : readStringArray(token.allowedModules)
        )

      session.user.permissions = [...readPermissions(token.permissions)]

      session.user.allowedModules = readStringArray(token.allowedModules)
      if (session.user.allowedModules.length === 0) {
        session.user.allowedModules = resolveAllowedModules(
          toKnownRole(session.user.role),
          session.user.permissions
        )
      }

      session.user.mustChangePassword =
        typeof token.mustChangePassword === 'boolean' ? token.mustChangePassword : false

      session.user.photoUrl = typeof token.photoUrl === 'string' ? token.photoUrl : null

      session.accessToken = typeof token.accessToken === 'string' ? token.accessToken : ''

      if (typeof token.error === 'string') session.error = token.error

      return session
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
})
