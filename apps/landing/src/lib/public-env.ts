const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function readRequiredPublicUrl(name: 'NEXT_PUBLIC_API_URL', value: string | undefined): string {
  const normalized = value?.trim()
  if (!normalized) {
    throw new Error(`[env] Missing required public environment variable: ${name}`)
  }

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error(`[env] Invalid URL for ${name}: ${normalized}`)
  }

  if (process.env.NODE_ENV === 'production' && LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`[env] ${name} must not point to localhost in this deployment model`)
  }

  return normalized.replace(/\/+$/, '')
}

export const landingPublicEnv = {
  apiBaseUrl: readRequiredPublicUrl('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
} as const
