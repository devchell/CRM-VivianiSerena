const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function readRequiredServerUrl(names: Array<'API_BASE_URL' | 'NEXT_PUBLIC_API_URL'>): string {
  const value = names
    .map((name) => process.env[name]?.trim())
    .find((candidate): candidate is string => Boolean(candidate))

  if (!value) {
    throw new Error(`[env] Missing required server environment variable: ${names.join(' or ')}`)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`[env] Invalid server API URL: ${value}`)
  }

  if (process.env.NODE_ENV === 'production' && LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error('[env] API_BASE_URL must not point to localhost in this deployment model')
  }

  return value.replace(/\/+$/, '')
}

export const landingServerEnv = {
  apiBaseUrl: readRequiredServerUrl(['API_BASE_URL', 'NEXT_PUBLIC_API_URL']),
} as const
