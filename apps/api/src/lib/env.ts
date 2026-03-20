const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

type StorageDriver = 'local' | 's3'

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`)
  }
  return value
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

function parseUrl(name: string, value: string, allowLocalHost = false): URL {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`[env] Invalid URL for ${name}: ${value}`)
  }

  if (!allowLocalHost && LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`[env] ${name} must not point to localhost in this deployment model`)
  }

  return parsed
}

function readRequiredUrl(name: string, allowLocalHost = false): string {
  const value = readRequiredEnv(name)
  parseUrl(name, value, allowLocalHost)
  return value.replace(/\/+$/, '')
}

function readOptionalUrl(name: string, allowLocalHost = false): string | undefined {
  const value = process.env[name]?.trim()
  if (!value) {
    return undefined
  }
  parseUrl(name, value, allowLocalHost)
  return value.replace(/\/+$/, '')
}

function readOptionalBoolean(name: string): boolean | undefined {
  const value = process.env[name]?.trim().toLowerCase()

  if (!value) {
    return undefined
  }

  if (value === 'true') return true
  if (value === 'false') return false

  throw new Error(`[env] Invalid boolean for ${name}: ${value}`)
}

function readRequiredOrigins(name: string): string[] {
  const raw = readRequiredEnv(name)
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (origins.length === 0) {
    throw new Error(`[env] ${name} must contain at least one origin`)
  }

  origins.forEach((origin) => {
    parseUrl(name, origin)
  })

  return origins
}

function readPort(): number {
  const raw = process.env.PORT ?? process.env.API_PORT ?? '4000'
  const value = Number.parseInt(raw, 10)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`[env] Invalid API port: ${raw}`)
  }
  return value
}

function readStorageDriver(): StorageDriver {
  const raw = process.env.STORAGE_DRIVER?.trim().toLowerCase() || 'local'

  if (raw === 'local' || raw === 's3') {
    return raw
  }

  throw new Error(`[env] Invalid STORAGE_DRIVER: ${raw}`)
}

const storageDriver = readStorageDriver()

function readS3Config() {
  if (storageDriver !== 's3') {
    return undefined
  }

  return {
    endpoint: readOptionalUrl('S3_ENDPOINT', true),
    region: readRequiredEnv('S3_REGION'),
    bucket: readRequiredEnv('S3_BUCKET'),
    accessKeyId: readRequiredEnv('S3_ACCESS_KEY_ID'),
    secretAccessKey: readRequiredEnv('S3_SECRET_ACCESS_KEY'),
    prefix: readOptionalEnv('S3_PREFIX') || 'uploads',
    forcePathStyle: readOptionalBoolean('S3_FORCE_PATH_STYLE') ?? false,
  }
}

export const apiEnv = {
  nodeEnv: process.env.NODE_ENV?.trim() || 'production',
  apiHost: process.env.API_HOST?.trim() || '0.0.0.0',
  apiPort: readPort(),
  appVersion:
    process.env.NEXT_PUBLIC_APP_VERSION?.trim()
    || process.env.APP_VERSION?.trim()
    || process.env.RENDER_GIT_COMMIT?.trim()
    || '1.0.0',
  databaseUrl: readRequiredEnv('DATABASE_URL'),
  redisUrl: readRequiredEnv('REDIS_URL'),
  apiBaseUrl: readRequiredUrl('API_BASE_URL'),
  crmUrl: readRequiredUrl('CRM_URL'),
  corsOrigins: readRequiredOrigins('CORS_ORIGIN'),
  jwtPrivateKey: readRequiredEnv('JWT_PRIVATE_KEY'),
  jwtPublicKey: readRequiredEnv('JWT_PUBLIC_KEY'),
  nextAuthSecret: readRequiredEnv('NEXTAUTH_SECRET'),
  encryptionKey: readRequiredEnv('ENCRYPTION_KEY'),
  anonymizationSalt: readRequiredEnv('ANONYMIZATION_SALT'),
  landingRevalidateUrl: readOptionalUrl('LANDING_REVALIDATE_URL'),
  revalidateSecret: process.env.REVALIDATE_SECRET?.trim() || undefined,
  storageDriver,
  uploadDir: process.env.UPLOAD_DIR?.trim() || './uploads',
  uploadPublicBaseUrl:
    storageDriver === 's3'
      ? readRequiredUrl('UPLOAD_PUBLIC_BASE_URL', true)
      : undefined,
  s3: readS3Config(),
  logDir: process.env.LOG_DIR?.trim() || './logs',
} as const
