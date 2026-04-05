import jwt from 'jsonwebtoken'
import type { AppPermission, AuthTokenPayload, UserProfile, UserRole } from '@viviani/types'
import { apiEnv } from './env'

function normalizePemKey(raw: string): string {
  const withNewlines = raw.replace(/\\n/g, '\n').replace(/\r/g, '').trim()
  if (withNewlines.startsWith('-----')) return withNewlines
  const decoded = Buffer.from(raw.trim(), 'base64').toString('utf8').replace(/\r/g, '')
  if (decoded.startsWith('-----')) return decoded
  return withNewlines
}

const PRIVATE_KEY = normalizePemKey(apiEnv.jwtPrivateKey)
const PUBLIC_KEY = normalizePemKey(apiEnv.jwtPublicKey)
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export function signAccessToken(payload: {
  sub: string
  email: string
  name?: string | null
  role: UserRole
  profile?: UserProfile
  permissions?: AppPermission[]
  allowedModules?: string[]
  mustChangePassword?: boolean
  photoUrl?: string | null
}): string {
  return jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: ACCESS_EXPIRES,
    issuer: 'viviani-api',
    audience: 'viviani-client',
  } as jwt.SignOptions)
}

export function signRefreshToken(sub: string): string {
  return jwt.sign({ sub }, PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: REFRESH_EXPIRES,
    issuer: 'viviani-api',
  } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: 'viviani-api',
    audience: 'viviani-client',
  }) as AuthTokenPayload
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: 'viviani-api',
  }) as { sub: string }
}
