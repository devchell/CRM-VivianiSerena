import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { EncryptionService } from './security/EncryptionService'

export type EmailSettingsOverview = {
  configured: boolean
  provider: string
  host: string | null
  port: string | null
  secure: boolean
  user: string | null
  from: string | null
  fromName: string | null
  adminEmail: string | null
  source: 'database' | 'environment'
  passwordConfigured: boolean
}

export type ActiveEmailSettings = {
  configured: boolean
  host: string | null
  port: number
  secure: boolean
  user: string | null
  password: string | null
  from: string | null
  fromName: string | null
  adminEmail: string | null
  source: 'database' | 'environment'
}

type PersistedEmailSettingsInput = {
  host: string
  port: number
  secure: boolean
  user: string
  password?: string
  from: string
  fromName: string
  adminEmail: string
}

const SETTINGS_ID = 'default'

function inferEmailProvider(host?: string | null) {
  if (!host) return 'Não configurado'
  const normalized = host.toLowerCase()

  if (normalized.includes('resend')) return 'Resend'
  if (normalized.includes('gmail')) return 'Gmail'
  if (normalized.includes('brevo') || normalized.includes('sendinblue')) return 'Brevo'
  if (normalized.includes('outlook')) return 'Outlook'

  return host
}

function isMissingEmailSettingsTable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021'
}

async function loadPersistedSettings() {
  try {
    return await prisma.emailSettings.findUnique({
      where: { id: SETTINGS_ID },
    })
  } catch (error) {
    if (isMissingEmailSettingsTable(error)) {
      return null
    }

    throw error
  }
}

function readEnvSettings(): ActiveEmailSettings {
  const host = process.env.SMTP_HOST?.trim() ?? null
  const user = process.env.SMTP_USER?.trim() ?? null
  const password = process.env.SMTP_PASS?.trim() ?? null
  const from = process.env.EMAIL_FROM?.trim() ?? null
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || 'Viviani Serena'
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@vivianiserena.com'

  return {
    configured: Boolean(host && user && password && from),
    host,
    port: Number.parseInt(process.env.SMTP_PORT?.trim() || '587', 10),
    secure: process.env.SMTP_SECURE?.trim() === 'true',
    user,
    password,
    from,
    fromName,
    adminEmail,
    source: 'environment',
  }
}

export async function getActiveEmailSettings(): Promise<ActiveEmailSettings> {
  const persisted = await loadPersistedSettings()

  if (!persisted) {
    return readEnvSettings()
  }

  return {
    configured: true,
    host: persisted.host,
    port: persisted.port,
    secure: persisted.secure,
    user: persisted.user,
    password: EncryptionService.decrypt(persisted.passwordEncrypted),
    from: persisted.fromEmail,
    fromName: persisted.fromName,
    adminEmail: persisted.adminEmail,
    source: 'database',
  }
}

export async function getEmailSettingsOverview(): Promise<EmailSettingsOverview> {
  const active = await getActiveEmailSettings()

  return {
    configured: active.configured,
    provider: inferEmailProvider(active.host),
    host: active.host,
    port: String(active.port),
    secure: active.secure,
    user: active.user,
    from: active.from,
    fromName: active.fromName,
    adminEmail: active.adminEmail,
    source: active.source,
    passwordConfigured: Boolean(active.password),
  }
}

export async function saveEmailSettings(
  input: PersistedEmailSettingsInput,
  updatedBy: string
): Promise<EmailSettingsOverview> {
  const existing = await loadPersistedSettings()
  const nextPassword = input.password?.trim()
  const persistedPasswordEncrypted = existing?.passwordEncrypted ?? null

  if (!nextPassword && !persistedPasswordEncrypted) {
    throw new Error('A senha SMTP e obrigatoria no primeiro salvamento.')
  }

  const passwordEncrypted = nextPassword
    ? EncryptionService.encrypt(nextPassword)
    : persistedPasswordEncrypted

  await prisma.emailSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      host: input.host.trim(),
      port: input.port,
      secure: input.secure,
      user: input.user.trim(),
      passwordEncrypted,
      fromEmail: input.from.trim(),
      fromName: input.fromName.trim(),
      adminEmail: input.adminEmail.trim(),
      updatedBy,
    },
    update: {
      host: input.host.trim(),
      port: input.port,
      secure: input.secure,
      user: input.user.trim(),
      passwordEncrypted,
      fromEmail: input.from.trim(),
      fromName: input.fromName.trim(),
      adminEmail: input.adminEmail.trim(),
      updatedBy,
    },
  })

  return getEmailSettingsOverview()
}
