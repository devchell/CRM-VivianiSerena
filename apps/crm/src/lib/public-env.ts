const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function readRequiredPublicUrl(name: 'NEXT_PUBLIC_API_URL' | 'NEXT_PUBLIC_LANDING_URL', value: string | undefined): string {
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

  if (LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`[env] ${name} must not point to localhost in this deployment model`)
  }

  return normalized.replace(/\/+$/, '')
}

export const crmPublicEnv = {
  apiBaseUrl: readRequiredPublicUrl('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
  landingUrl: readRequiredPublicUrl('NEXT_PUBLIC_LANDING_URL', process.env.NEXT_PUBLIC_LANDING_URL),
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION?.trim() || '1.0.0',
} as const
