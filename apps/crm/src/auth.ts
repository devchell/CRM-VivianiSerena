import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { crmServerEnv } from './lib/server-env'

const API_BASE = crmServerEnv.apiBaseUrl

// Access token dura 15min — renovamos 1 minuto antes do vencimento
const ACCESS_TOKEN_LIFETIME_MS = 14 * 60 * 1000 // 14 min

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json() as { data: { accessToken: string; refreshToken?: string } }
    return { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken ?? refreshToken }
  } catch {
    return null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorSessionToken: { label: '2FA Session Token', type: 'text' },
      },
      async authorize(credentials) {
        // ── Conclusão de fluxo 2FA ──
        if (credentials?.twoFactorSessionToken) {
          const parsed = z.object({ twoFactorSessionToken: z.string() }).safeParse(credentials)
          if (!parsed.success) return null

          const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email ?? '',
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
              user: {
                id: string
                name?: string
                email: string
                role: string
                mustChangePassword?: boolean
                allowedModules?: string[]
                photoUrl?: string | null
              }
              accessToken: string
              refreshToken: string
            }
          }
          return {
            id: data.data.user.id,
            name: data.data.user.name ?? null,
            email: data.data.user.email,
            role: data.data.user.role,
            mustChangePassword: data.data.user.mustChangePassword ?? false,
            allowedModules: Array.isArray(data.data.user.allowedModules) ? data.data.user.allowedModules : [],
            photoUrl: data.data.user.photoUrl ?? null,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          }
        }

        // ── Login normal ──
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }).safeParse(credentials)
        if (!parsed.success) {
          console.error('[auth] Zod validation failed:', parsed.error.flatten())
          return null
        }

        const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
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
            user?: {
              id: string
              name?: string
              email: string
              role: string
              mustChangePassword?: boolean
              allowedModules?: string[]
              photoUrl?: string | null
            }
            accessToken?: string
            refreshToken?: string
          }
        }

        // Se requer 2FA, o NextAuth não consegue retornar — a página de login trata isso diretamente
        if (data.data?.requiresTwoFactor) return null

        const u = data.data.user! as { id: string; name?: string; email: string; role: string; mustChangePassword?: boolean; allowedModules?: string[]; photoUrl?: string | null }
        return {
          id: u.id, name: u.name ?? null, email: u.email, role: u.role,
          mustChangePassword: u.mustChangePassword ?? false,
          allowedModules: Array.isArray(u.allowedModules) ? u.allowedModules : [],
          photoUrl: u.photoUrl ?? null,
          accessToken: data.data.accessToken!,
          refreshToken: data.data.refreshToken!,
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, trigger, session }: any) {

      // ── Fluxo A: update() chamado pelo cliente (ex: salvar perfil) ──
      if (trigger === 'update' && session?.user) {
        if (session.user.name) token.name = session.user.name
        if (session.user.image !== undefined) token.photoUrl = session.user.image ?? null
        // Permitir atualizar allowedModules e role via update()
        if (Array.isArray(session.user.allowedModules)) token.allowedModules = session.user.allowedModules
        if (typeof session.user.role === 'string') token.role = session.user.role
      }

      // ── Fluxo B: Login inicial — armazena tokens e define quando expira ──
      if (user) {
        const u = user as { name?: string | null; role: string; accessToken: string; refreshToken: string; mustChangePassword?: boolean; allowedModules?: string[]; photoUrl?: string | null }
        token.name = u.name ?? token.email?.split('@')[0] ?? 'Usuario'
        token.role = u.role ?? 'user'
        token.accessToken = u.accessToken
        token.refreshToken = u.refreshToken
        token.mustChangePassword = u.mustChangePassword ?? false
        token.allowedModules = Array.isArray(u.allowedModules) ? u.allowedModules : []
        token.photoUrl = u.photoUrl ?? null
        token.expiresAt = Date.now() + ACCESS_TOKEN_LIFETIME_MS
        return token
      }

      // ── Fluxo C: Blindagem de campos — roda ANTES do check de expiração ──
      // Garante que campos SEMPRE existam, mesmo em tokens de sessões antigas
      token.name = typeof token.name === 'string' && token.name.length > 0
        ? token.name
        : (typeof token.email === 'string' ? token.email.split('@')[0] : 'Usuario')

      token.role = typeof token.role === 'string' && token.role.length > 0
        ? token.role
        : 'user'

      token.allowedModules = Array.isArray(token.allowedModules)
        ? token.allowedModules
        : []

      token.mustChangePassword = typeof token.mustChangePassword === 'boolean'
        ? token.mustChangePassword
        : false

      token.photoUrl = token.photoUrl ?? null

      // Token ainda válido
      if (Date.now() < ((token.expiresAt as number) ?? 0)) {
        return token
      }

      // ── Fluxo D: Access token expirou — tenta renovar ──
      const refreshed = await refreshAccessToken(token.refreshToken as string)
      if (!refreshed) {
        return { ...token, error: 'RefreshAccessTokenError' }
      }

      // Buscar dados COMPLETOS do usuário após refresh (não apenas nome)
      let updatedName = token.name as string
      let updatedRole = token.role as string
      let updatedModules: string[] = Array.isArray(token.allowedModules)
        ? (token.allowedModules as string[])
        : []
      let updatedPhoto: string | null = typeof token.photoUrl === 'string'
        ? token.photoUrl
        : null
      let updatedMustChange: boolean = typeof token.mustChangePassword === 'boolean'
        ? (token.mustChangePassword as boolean)
        : false

      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${refreshed.accessToken}` },
        })
        if (res.ok) {
          const json = await res.json()
          // A API pode retornar { data: { ... } } ou { ... } diretamente
          const u = json?.data ?? json ?? {}

          if (typeof u.name === 'string' && u.name.length > 0) {
            updatedName = u.name
          }
          if (typeof u.role === 'string' && u.role.length > 0) {
            updatedRole = u.role
          }
          if (Array.isArray(u.allowedModules)) {
            updatedModules = u.allowedModules.filter(
              (m: unknown): m is string => typeof m === 'string'
            )
          }
          if (u.photoUrl !== undefined) {
            updatedPhoto = typeof u.photoUrl === 'string' ? u.photoUrl : null
          }
          if (typeof u.mustChangePassword === 'boolean') {
            updatedMustChange = u.mustChangePassword
          }
        }
      } catch {
        // Se a API falhar, mantém os valores do token atual
        // Os fallbacks da blindagem acima já garantem que nada é undefined
      }

      return {
        ...token,
        name: updatedName,
        role: updatedRole,
        allowedModules: Array.isArray(updatedModules) ? updatedModules : [],
        photoUrl: updatedPhoto,
        mustChangePassword: updatedMustChange,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: Date.now() + ACCESS_TOKEN_LIFETIME_MS,
        error: undefined,
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      // Blindagem: garantir que session.user SEMPRE existe
      if (!session) session = { user: {} }
      if (!session.user) session.user = {}

      // Cada campo verificado individualmente com typeof — nunca confia no spread
      session.user.name = typeof token.name === 'string' && token.name.length > 0
        ? token.name
        : (typeof session.user.email === 'string'
          ? session.user.email.split('@')[0]
          : 'Usuario')

      session.user.role = typeof token.role === 'string' && token.role.length > 0
        ? token.role
        : 'user'

      // Cópia nova do array com [...] para evitar referência compartilhada
      // que o NextAuth v5 beta pode corromper durante serialização
      session.user.allowedModules = Array.isArray(token.allowedModules)
        ? [...token.allowedModules]
        : []

      session.user.mustChangePassword = typeof token.mustChangePassword === 'boolean'
        ? token.mustChangePassword
        : false

      session.user.photoUrl = typeof token.photoUrl === 'string'
        ? token.photoUrl
        : null

      session.accessToken = typeof token.accessToken === 'string'
        ? token.accessToken
        : ''

      if (token.error) session.error = token.error

      return session
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
})
