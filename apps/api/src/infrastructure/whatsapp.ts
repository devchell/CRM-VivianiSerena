import crypto from 'crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { apiEnv } from '../lib/env'
import { AppError } from '../middleware/errorHandler'
import { EncryptionService } from './security/EncryptionService'

type WhatsAppChannelConfigRecord = {
  connected: boolean
  connectedByUserId: string | null
  accessTokenEncrypted: string | null
  businessAccountId: string | null
  wabaId: string | null
  phoneNumberId: string | null
  displayPhoneNumber: string | null
  verifiedName: string | null
  qualityRating: string | null
  codeVerificationStatus: string | null
  nameStatus: string | null
  appScopedUserId: string | null
  webhookSubscribed: boolean
  connectedAt: string | null
  disconnectedAt: string | null
  lastError: string | null
}

export type WhatsAppChannelStatus = {
  configured: boolean
  connected: boolean
  missingConfiguration: string[]
  graphApiVersion: string
  webhookPath: string
  embeddedSignupReady: boolean
  displayPhoneNumber: string | null
  verifiedName: string | null
  qualityRating: string | null
  codeVerificationStatus: string | null
  nameStatus: string | null
  phoneNumberId: string | null
  businessAccountId: string | null
  wabaId: string | null
  webhookSubscribed: boolean
  connectedAt: string | null
  disconnectedAt: string | null
  lastError: string | null
}

export type WhatsAppConnectInput = {
  code: string
  phoneNumberId?: string | null
  wabaId?: string | null
  businessAccountId?: string | null
  appScopedUserId?: string | null
}

type WhatsAppGraphError = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeStoredConfig(value: unknown): WhatsAppChannelConfigRecord {
  const details = asJsonObject(value)
  return {
    connected: asBoolean(details.connected),
    connectedByUserId: asOptionalString(details.connectedByUserId),
    accessTokenEncrypted: asOptionalString(details.accessTokenEncrypted),
    businessAccountId: asOptionalString(details.businessAccountId),
    wabaId: asOptionalString(details.wabaId),
    phoneNumberId: asOptionalString(details.phoneNumberId),
    displayPhoneNumber: asOptionalString(details.displayPhoneNumber),
    verifiedName: asOptionalString(details.verifiedName),
    qualityRating: asOptionalString(details.qualityRating),
    codeVerificationStatus: asOptionalString(details.codeVerificationStatus),
    nameStatus: asOptionalString(details.nameStatus),
    appScopedUserId: asOptionalString(details.appScopedUserId),
    webhookSubscribed: asBoolean(details.webhookSubscribed),
    connectedAt: asOptionalString(details.connectedAt),
    disconnectedAt: asOptionalString(details.disconnectedAt),
    lastError: asOptionalString(details.lastError),
  }
}

function getMissingConfiguration() {
  const missing: string[] = []
  if (!apiEnv.whatsappAppId) missing.push('WHATSAPP_APP_ID')
  if (!apiEnv.whatsappAppSecret) missing.push('WHATSAPP_APP_SECRET')
  if (!apiEnv.whatsappEmbeddedSignupConfigId) missing.push('WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID')
  if (!apiEnv.whatsappWebhookVerifyToken) missing.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
  return missing
}

function getWebhookPath() {
  return '/api/v1/whatsapp/webhook'
}

async function getLatestConfigEntry() {
  const entries = await prisma.auditLog.findMany({
    where: { resource: 'WhatsappChannelConfig' },
    orderBy: { timestamp: 'desc' },
    take: 20,
  })

  const latest = entries.find((entry) => entry.action === 'UPSERT' || entry.action === 'DISCONNECT')
  return latest
}

async function getStoredConfig() {
  const latest = await getLatestConfigEntry()
  if (!latest) return null
  return normalizeStoredConfig(latest.details)
}

function requireBusinessConfiguration() {
  const missing = getMissingConfiguration()
  if (missing.length > 0) {
    throw new AppError(400, `WhatsApp Business nao esta configurado no ambiente: ${missing.join(', ')}`)
  }
}

async function graphRequest<T>(path: string, params: {
  method?: 'GET' | 'POST'
  token: string
  body?: Record<string, unknown>
  query?: Record<string, string | undefined>
}) {
  const method = params.method ?? 'GET'
  const url = new URL(`https://graph.facebook.com/${apiEnv.whatsappGraphApiVersion}/${path.replace(/^\/+/, '')}`)
  for (const [key, value] of Object.entries(params.query ?? {})) {
    if (value) url.searchParams.set(key, value)
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: method === 'POST' ? JSON.stringify(params.body ?? {}) : undefined,
  })

  const payload = await response.json() as T & WhatsAppGraphError
  if (!response.ok) {
    throw new AppError(response.status, payload.error?.message ?? 'Falha ao comunicar com WhatsApp Business Platform')
  }

  return payload
}

async function exchangeCodeForAccessToken(code: string) {
  requireBusinessConfiguration()
  const appId = apiEnv.whatsappAppId
  const appSecret = apiEnv.whatsappAppSecret
  if (!appId || !appSecret) {
    throw new AppError(400, 'WhatsApp Business nao esta configurado no ambiente')
  }
  const url = new URL(`https://graph.facebook.com/${apiEnv.whatsappGraphApiVersion}/oauth/access_token`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('code', code)

  const response = await fetch(url)
  const payload = await response.json() as { access_token?: string } & WhatsAppGraphError
  if (!response.ok || !payload.access_token) {
    throw new AppError(response.status || 400, payload.error?.message ?? 'Nao foi possivel concluir a conexao com o WhatsApp Business')
  }

  return payload.access_token
}

async function fetchPhoneNumberProfile(phoneNumberId: string, token: string) {
  return graphRequest<{
    id: string
    display_phone_number?: string
    verified_name?: string
    quality_rating?: string
    code_verification_status?: string
    name_status?: string
  }>(phoneNumberId, {
    token,
    query: {
      fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status',
    },
  })
}

async function subscribeAppToWaba(wabaId: string, token: string) {
  try {
    await graphRequest<{ success?: boolean }>(`${wabaId}/subscribed_apps`, {
      method: 'POST',
      token,
    })
    return true
  } catch {
    return false
  }
}

function buildPersistedDetails(input: {
  connected: boolean
  connectedByUserId: string
  accessToken?: string | null
  businessAccountId?: string | null
  wabaId?: string | null
  phoneNumberId?: string | null
  displayPhoneNumber?: string | null
  verifiedName?: string | null
  qualityRating?: string | null
  codeVerificationStatus?: string | null
  nameStatus?: string | null
  appScopedUserId?: string | null
  webhookSubscribed?: boolean
  lastError?: string | null
}) {
  return {
    connected: input.connected,
    connectedByUserId: input.connectedByUserId,
    accessTokenEncrypted: input.accessToken ? EncryptionService.encrypt(input.accessToken) : null,
    businessAccountId: input.businessAccountId ?? null,
    wabaId: input.wabaId ?? null,
    phoneNumberId: input.phoneNumberId ?? null,
    displayPhoneNumber: input.displayPhoneNumber ?? null,
    verifiedName: input.verifiedName ?? null,
    qualityRating: input.qualityRating ?? null,
    codeVerificationStatus: input.codeVerificationStatus ?? null,
    nameStatus: input.nameStatus ?? null,
    appScopedUserId: input.appScopedUserId ?? null,
    webhookSubscribed: Boolean(input.webhookSubscribed),
    connectedAt: input.connected ? new Date().toISOString() : null,
    disconnectedAt: input.connected ? null : new Date().toISOString(),
    lastError: input.lastError ?? null,
  }
}

export function isWhatsAppBusinessConfigured() {
  return getMissingConfiguration().length === 0
}

export async function getWhatsAppChannelStatus(): Promise<WhatsAppChannelStatus> {
  const stored = await getStoredConfig()
  const missingConfiguration = getMissingConfiguration()
  return {
    configured: missingConfiguration.length === 0,
    connected: Boolean(stored?.connected && stored.phoneNumberId && stored.accessTokenEncrypted),
    missingConfiguration,
    graphApiVersion: apiEnv.whatsappGraphApiVersion,
    webhookPath: getWebhookPath(),
    embeddedSignupReady: Boolean(apiEnv.whatsappAppId && apiEnv.whatsappEmbeddedSignupConfigId),
    displayPhoneNumber: stored?.displayPhoneNumber ?? null,
    verifiedName: stored?.verifiedName ?? null,
    qualityRating: stored?.qualityRating ?? null,
    codeVerificationStatus: stored?.codeVerificationStatus ?? null,
    nameStatus: stored?.nameStatus ?? null,
    phoneNumberId: stored?.phoneNumberId ?? null,
    businessAccountId: stored?.businessAccountId ?? null,
    wabaId: stored?.wabaId ?? null,
    webhookSubscribed: Boolean(stored?.webhookSubscribed),
    connectedAt: stored?.connectedAt ?? null,
    disconnectedAt: stored?.disconnectedAt ?? null,
    lastError: stored?.lastError ?? null,
  }
}

export async function connectWhatsAppBusinessChannel(input: WhatsAppConnectInput, actor: { userId: string; ip?: string | null }) {
  requireBusinessConfiguration()
  if (!input.code.trim()) {
    throw new AppError(400, 'Codigo de autorizacao do WhatsApp Business ausente')
  }
  if (!input.phoneNumberId?.trim() || !input.wabaId?.trim()) {
    throw new AppError(400, 'Meta nao retornou phone_number_id ou waba_id. Refaça a conexao pelo Embedded Signup.')
  }

  const accessToken = await exchangeCodeForAccessToken(input.code.trim())
  const [phoneProfile, webhookSubscribed] = await Promise.all([
    fetchPhoneNumberProfile(input.phoneNumberId.trim(), accessToken),
    subscribeAppToWaba(input.wabaId.trim(), accessToken),
  ])

  const details = buildPersistedDetails({
    connected: true,
    connectedByUserId: actor.userId,
    accessToken,
    businessAccountId: input.businessAccountId?.trim() || null,
    wabaId: input.wabaId.trim(),
    phoneNumberId: input.phoneNumberId.trim(),
    displayPhoneNumber: phoneProfile.display_phone_number ?? null,
    verifiedName: phoneProfile.verified_name ?? null,
    qualityRating: phoneProfile.quality_rating ?? null,
    codeVerificationStatus: phoneProfile.code_verification_status ?? null,
    nameStatus: phoneProfile.name_status ?? null,
    appScopedUserId: input.appScopedUserId?.trim() || null,
    webhookSubscribed,
  })

  await prisma.auditLog.create({
    data: {
      userId: actor.userId,
      action: 'UPSERT',
      resource: 'WhatsappChannelConfig',
      ip: actor.ip ?? null,
      details: details as unknown as Prisma.InputJsonObject,
    },
  })

  return getWhatsAppChannelStatus()
}

export async function disconnectWhatsAppBusinessChannel(actor: { userId: string; ip?: string | null }) {
  const stored = await getStoredConfig()
  const details = buildPersistedDetails({
    connected: false,
    connectedByUserId: actor.userId,
    businessAccountId: stored?.businessAccountId ?? null,
    wabaId: stored?.wabaId ?? null,
    phoneNumberId: stored?.phoneNumberId ?? null,
    displayPhoneNumber: stored?.displayPhoneNumber ?? null,
    verifiedName: stored?.verifiedName ?? null,
    qualityRating: stored?.qualityRating ?? null,
    codeVerificationStatus: stored?.codeVerificationStatus ?? null,
    nameStatus: stored?.nameStatus ?? null,
    appScopedUserId: stored?.appScopedUserId ?? null,
    webhookSubscribed: Boolean(stored?.webhookSubscribed),
  })

  await prisma.auditLog.create({
    data: {
      userId: actor.userId,
      action: 'DISCONNECT',
      resource: 'WhatsappChannelConfig',
      ip: actor.ip ?? null,
      details: details as unknown as Prisma.InputJsonObject,
    },
  })

  return getWhatsAppChannelStatus()
}

export async function sendWhatsAppBusinessMessage(input: {
  to: string
  body: string
}) {
  const stored = await getStoredConfig()
  if (!stored?.connected || !stored.phoneNumberId || !stored.accessTokenEncrypted) {
    throw new AppError(409, 'Canal oficial do WhatsApp nao esta conectado')
  }
  if (!input.body.trim()) {
    throw new AppError(400, 'Mensagem de WhatsApp vazia')
  }

  const accessToken = EncryptionService.decrypt(stored.accessTokenEncrypted)
  const response = await graphRequest<{
    messages?: Array<{ id: string }>
  }>(`${stored.phoneNumberId}/messages`, {
    method: 'POST',
    token: accessToken,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to,
      type: 'text',
      text: {
        preview_url: false,
        body: input.body,
      },
    },
  })

  return {
    providerMessageId: response.messages?.[0]?.id ?? null,
  }
}

export function verifyWhatsAppWebhookSignature(signatureHeader: string | undefined, rawBody: Buffer | undefined) {
  if (!signatureHeader || !rawBody || !apiEnv.whatsappAppSecret) {
    return false
  }

  const expected = `sha256=${crypto.createHmac('sha256', apiEnv.whatsappAppSecret).update(rawBody).digest('hex')}`
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
  } catch {
    return false
  }
}

export function verifyWhatsAppWebhookChallenge(input: { mode?: string; verifyToken?: string; challenge?: string }) {
  if (input.mode !== 'subscribe' || input.verifyToken !== apiEnv.whatsappWebhookVerifyToken) {
    throw new AppError(403, 'WhatsApp webhook verification failed')
  }

  return input.challenge ?? ''
}

function mapWebhookStatus(status: string) {
  if (status === 'read') return 'read'
  if (status === 'delivered') return 'delivered'
  if (status === 'failed') return 'not_delivered'
  return 'sent'
}

export async function ingestWhatsAppWebhook(payload: unknown) {
  const stored = await getStoredConfig()
  if (!stored?.connectedByUserId) {
    return { processed: 0 }
  }

  const body = asJsonObject(payload)
  const entries = Array.isArray(body.entry) ? body.entry : []
  let processed = 0

  for (const entry of entries) {
    const entryObject = asJsonObject(entry)
    const changes = Array.isArray(entryObject.changes) ? entryObject.changes : []

    for (const change of changes) {
      const changeObject = asJsonObject(change)
      const value = asJsonObject(changeObject.value)
      const statuses = Array.isArray(value.statuses) ? value.statuses : []

      for (const statusEntry of statuses) {
        const statusObject = asJsonObject(statusEntry)
        await prisma.auditLog.create({
          data: {
            userId: stored.connectedByUserId,
            action: 'WEBHOOK',
            resource: 'DispatchReceipt',
            details: {
              resourceType: 'receipt',
              channel: 'whatsapp',
              providerMessageId: asOptionalString(statusObject.id),
              recipient: asOptionalString(statusObject.recipient_id),
              status: mapWebhookStatus(String(statusObject.status ?? 'sent')),
              rawStatus: asOptionalString(statusObject.status),
              conversationId: asOptionalString(asJsonObject(statusObject.conversation).id),
              timestamp: asOptionalString(statusObject.timestamp),
              pricingCategory: asOptionalString(asJsonObject(statusObject.pricing).category),
              errorMessage: asOptionalString(asJsonObject((Array.isArray(statusObject.errors) ? statusObject.errors[0] : null)).message),
            } as Prisma.InputJsonObject,
          },
        })
        processed += 1
      }
    }
  }

  return { processed }
}
