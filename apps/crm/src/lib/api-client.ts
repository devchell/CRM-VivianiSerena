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

// In-memory GET cache: avoids re-fetching same read-only endpoints on navigation.
// Keyed by URL. Entries expire after TTL_MS (default 60s).
// Only caches GET requests (no body). Mutations always bypass.
const TTL_MS = 60_000
type CacheEntry = { data: unknown; expiresAt: number }
const _cache = new Map<string, CacheEntry>()

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
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json() as T

  if (isGet && !noCache && ttl > 0) {
    _cache.set(url, { data, expiresAt: Date.now() + ttl })
  }

  return data
}
