const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function readRequiredPublicUrl(name: 'NEXT_PUBLIC_API_URL'): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`[env] Missing required public environment variable: ${name}`)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`[env] Invalid URL for ${name}: ${value}`)
  }

  if (LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`[env] ${name} must not point to localhost in this deployment model`)
  }

  return value.replace(/\/+$/, '')
}

export const landingPublicEnv = {
  apiBaseUrl: readRequiredPublicUrl('NEXT_PUBLIC_API_URL'),
} as const
