import { crmPublicEnv } from './public-env'

export const API_BASE_URL = crmPublicEnv.apiBaseUrl

export function buildApiUrl(path: string): string {
  return path.startsWith('/api/')
    ? `${API_BASE_URL}${path}`
    : `${API_BASE_URL}/api/v1${path.startsWith('/') ? path : `/${path}`}`
}

export function buildAuthHeaders(accessToken?: string, contentType?: string): HeadersInit {
  const headers: Record<string, string> = {}

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  if (contentType) {
    headers['Content-Type'] = contentType
  }

  return headers
}

// Mutations are broadcast over Socket.IO and invalidate every read cache.
// Reads are intentionally uncached by default so a reconnect or a navigation
// never exposes a stale audience, lead, appointment, or financial result.
const TTL_MS = 0
type CacheEntry = { data: unknown; expiresAt: number }
const _cache = new Map<string, CacheEntry>()

function extractErrorMessage(payload: string): string | undefined {
  if (!payload.trim()) return undefined

  try {
    const parsed: unknown = JSON.parse(payload)
    if (!parsed || typeof parsed !== 'object') return undefined

    const record = parsed as Record<string, unknown>
    if (typeof record.error === 'string' && record.error.trim()) return record.error
    if (typeof record.message === 'string' && record.message.trim()) return record.message
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
  }

  return undefined
}

export function invalidateApiCache(pathPrefix?: string) {
  if (!pathPrefix) { _cache.clear(); return }
  for (const key of _cache.keys()) {
    if (key.includes(pathPrefix)) _cache.delete(key)
  }
}

export async function apiFetchJson<T>(
  path: string,
  init?: RequestInit,
  options?: { ttl?: number; noCache?: boolean }
): Promise<T> {
  const url = buildApiUrl(path)
  const isGet = !init?.method || init.method.toUpperCase() === 'GET'
  const ttl = options?.ttl ?? TTL_MS
  const noCache = options?.noCache ?? false

  if (isGet && !noCache) {
    const entry = _cache.get(url)
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T
    }
  }

  const response = await fetch(url, init)
  if (!response.ok) {
    const payload = await response.text()
    const detail = extractErrorMessage(payload)
    throw new Error(detail ?? `HTTP ${response.status}`)
  }

  const data = await response.json() as T

  if (isGet && !noCache && ttl > 0) {
    _cache.set(url, { data, expiresAt: Date.now() + ttl })
  }

  return data
}
