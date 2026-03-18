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

export async function apiFetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(buildApiUrl(path), init)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}
