const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function localUrlsAllowed(): boolean {
  return (process.env.NODE_ENV?.trim() || 'production') !== 'production'
}

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

function readRequiredUrl(name: string, allowLocalHost = localUrlsAllowed()): string {
  const value = readRequiredEnv(name)
  parseUrl(name, value, allowLocalHost)
  return value.replace(/\/+$/, '')
}

function readOptionalUrl(name: string, allowLocalHost = localUrlsAllowed()): string | undefined {
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
    parseUrl(name, origin, localUrlsAllowed())
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

function readRedisConfig() {
  return {
    url: readRequiredEnv('REDIS_URL'),
  }
}

type DeploymentStage = 'development' | 'homologacao' | 'production'

function readDeploymentStage(): DeploymentStage {
  const value = process.env.DEPLOYMENT_STAGE?.trim().toLowerCase()
    || (process.env.NODE_ENV?.trim() === 'production' ? 'production' : 'development')

  if (value === 'development' || value === 'homologacao' || value === 'production') {
    return value
  }

  throw new Error(`[env] Invalid DEPLOYMENT_STAGE: ${value}`)
}

const redisConfig = readRedisConfig()
const deploymentStage = readDeploymentStage()

export const apiEnv = {
  nodeEnv: process.env.NODE_ENV?.trim() || 'production',
  deploymentStage,
  apiHost: process.env.API_HOST?.trim() || '0.0.0.0',
  apiPort: readPort(),
  appVersion:
    process.env.NEXT_PUBLIC_APP_VERSION?.trim()
    || process.env.APP_VERSION?.trim()
    || '1.0.0',
  databaseUrl: readRequiredEnv('DATABASE_URL'),
  redisUrl: redisConfig.url,
  apiBaseUrl: readRequiredUrl('API_BASE_URL'),
  crmUrl: readRequiredUrl('CRM_URL'),
  corsOrigins: readRequiredOrigins('CORS_ORIGIN'),
  jwtPrivateKey: readRequiredEnv('JWT_PRIVATE_KEY'),
  jwtPublicKey: readRequiredEnv('JWT_PUBLIC_KEY'),
  nextAuthSecret: readRequiredEnv('NEXTAUTH_SECRET'),
  encryptionKey: readRequiredEnv('ENCRYPTION_KEY'),
  anonymizationSalt: readRequiredEnv('ANONYMIZATION_SALT'),
  allowBaselineReset: readOptionalBoolean('ALLOW_BASELINE_RESET') ?? false,
  baselineResetPassword: readOptionalEnv('BASELINE_RESET_PASSWORD'),
  landingRevalidateUrl: readOptionalUrl('LANDING_REVALIDATE_URL'),
  revalidateSecret: process.env.REVALIDATE_SECRET?.trim() || undefined,
  whatsappAppId: readOptionalEnv('WHATSAPP_APP_ID'),
  whatsappAppSecret: readOptionalEnv('WHATSAPP_APP_SECRET'),
  whatsappEmbeddedSignupConfigId: readOptionalEnv('WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID'),
  whatsappWebhookVerifyToken: readOptionalEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
  whatsappGraphApiVersion: readOptionalEnv('WHATSAPP_GRAPH_API_VERSION') || 'v22.0',
  uploadDir: process.env.UPLOAD_DIR?.trim() || './uploads',
  privateUploadDir: process.env.PRIVATE_UPLOAD_DIR?.trim() || './private-uploads',
  logDir: process.env.LOG_DIR?.trim() || './logs',
} as const
