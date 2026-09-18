import { google, calendar_v3 } from 'googleapis'
import { logger } from '../lib/logger'
import { redis } from '../lib/redis'
import { EncryptionService } from './security/EncryptionService'

export const GOOGLE_OAUTH_TOKEN_KEY = 'google:oauth:tokens'
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'
export const GOOGLE_BUSINESS_SCOPE = 'https://www.googleapis.com/auth/business.manage'
export const GOOGLE_OAUTH_SCOPES = [GOOGLE_CALENDAR_SCOPE, GOOGLE_BUSINESS_SCOPE]
export const GOOGLE_REQUIRED_ENV_VARS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'] as const
const SLOT_DURATION_MINUTES = 60
const BUSINESS_HOURS = { start: 9, end: 18 }
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

type GoogleOAuthTokens = {
  access_token?: string
  refresh_token?: string
  expiry_date?: number
  scope?: string
  token_type?: string
}

function createOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

async function persistGoogleTokens(tokens: Record<string, unknown>) {
  const encrypted = EncryptionService.encrypt(JSON.stringify(tokens))
  await redis.set(GOOGLE_OAUTH_TOKEN_KEY, encrypted, { ex: 365 * 24 * 60 * 60 })
}

async function readGoogleTokens(): Promise<GoogleOAuthTokens | null> {
  const stored = await redis.get<GoogleOAuthTokens | string>(GOOGLE_OAUTH_TOKEN_KEY)
  if (!stored) return null

  if (typeof stored !== 'string') {
    // Compatibilidade temporária com tokens gravados antes da criptografia.
    return stored
  }

  try {
    return JSON.parse(EncryptionService.decrypt(stored)) as GoogleOAuthTokens
  } catch (error) {
    logger.warn('Google OAuth token could not be decrypted', {
      error: error instanceof Error ? error.message : 'unknown error',
    })
    return null
  }
}

function getMissingGoogleCalendarEnv() {
  return GOOGLE_REQUIRED_ENV_VARS.filter((name) => !process.env[name]?.trim())
}

function mergeGoogleTokens(existing: GoogleOAuthTokens, incoming: GoogleOAuthTokens): GoogleOAuthTokens {
  return {
    ...existing,
    ...incoming,
    refresh_token: incoming.refresh_token ?? existing.refresh_token,
  }
}

export async function getAuthenticatedGoogleClient(): Promise<InstanceType<typeof google.auth.OAuth2>> {
  if (!isGoogleCalendarConfigured()) {
    throw new Error('Google Calendar not configured. Missing OAuth environment variables.')
  }

  const oauth2Client = createOAuth2Client()
  const tokens = await readGoogleTokens()
  if (!tokens) {
    throw new Error('Google Calendar not connected. Please authorize via OAuth.')
  }
  oauth2Client.setCredentials(tokens)

  // Auto-refresh if near expiry
  if (tokens.expiry_date && tokens.expiry_date - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    const mergedTokens = mergeGoogleTokens(tokens, credentials as GoogleOAuthTokens)
    await persistGoogleTokens(mergedTokens as unknown as Record<string, unknown>)
    oauth2Client.setCredentials(mergedTokens)
  }

  return oauth2Client
}

export async function getGoogleAccessToken() {
  const client = await getAuthenticatedGoogleClient()
  const accessToken = await client.getAccessToken()
  if (!accessToken.token) {
    throw new Error('Google access token unavailable')
  }

  return accessToken.token
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim()
    && process.env.GOOGLE_CLIENT_SECRET?.trim()
    && process.env.GOOGLE_REDIRECT_URI?.trim()
  )
}

export async function getGoogleCalendarConnectionStatus() {
  const tokens = await readGoogleTokens()
  const missingConfiguration = getMissingGoogleCalendarEnv()
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() ?? null
  const configured = missingConfiguration.length === 0

  if (!configured || !tokens || !(tokens.access_token || tokens.refresh_token)) {
    return {
      configured,
      connected: false,
      calendarId: CALENDAR_ID,
      expiresAt: null as string | null,
      hasRefreshToken: false,
      scopes: GOOGLE_OAUTH_SCOPES,
      redirectUri,
      missingConfiguration,
    }
  }

  return {
    configured,
    connected: true,
    calendarId: CALENDAR_ID,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    hasRefreshToken: Boolean(tokens.refresh_token),
    scopes: GOOGLE_OAUTH_SCOPES,
    redirectUri,
    missingConfiguration,
  }
}

export async function disconnectGoogleCalendar() {
  await redis.del(GOOGLE_OAUTH_TOKEN_KEY)
}

export class GoogleCalendarService {
  async createEvent(params: {
    summary: string
    description?: string
    start: Date
    end?: Date
    attendeeEmail?: string
  }): Promise<calendar_v3.Schema$Event | null> {
    try {
      const auth = await getAuthenticatedGoogleClient()
      const calendar = google.calendar({ version: 'v3', auth })
      const end = params.end ?? new Date(params.start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)

      const event: calendar_v3.Schema$Event = {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.start.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' },
        attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
        reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 30 }] },
      }

      const response = await calendar.events.insert({ calendarId: CALENDAR_ID, requestBody: event })
      logger.info('Google Calendar event created', { eventId: response.data.id })
      return response.data
    } catch (err) {
      logger.error('Failed to create Google Calendar event:', err)
      return null
    }
  }

  async updateEvent(googleEventId: string, params: {
    summary?: string
    description?: string
    start?: Date
    end?: Date
  }): Promise<boolean> {
    try {
      const auth = await getAuthenticatedGoogleClient()
      const calendar = google.calendar({ version: 'v3', auth })
      const patch: calendar_v3.Schema$Event = {}
      if (params.summary) patch.summary = params.summary
      if (params.description) patch.description = params.description
      if (params.start) {
        const end = params.end ?? new Date(params.start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)
        patch.start = { dateTime: params.start.toISOString(), timeZone: 'America/Sao_Paulo' }
        patch.end = { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' }
      }
      await calendar.events.patch({ calendarId: CALENDAR_ID, eventId: googleEventId, requestBody: patch })
      return true
    } catch (err) {
      logger.error('Failed to update Google Calendar event:', err)
      return false
    }
  }

  async deleteEvent(googleEventId: string): Promise<boolean> {
    try {
      const auth = await getAuthenticatedGoogleClient()
      const calendar = google.calendar({ version: 'v3', auth })
      await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: googleEventId })
      return true
    } catch (err) {
      logger.error('Failed to delete Google Calendar event:', err)
      return false
    }
  }

  async listEvents(from: Date, to: Date): Promise<calendar_v3.Schema$Event[]> {
    try {
      const auth = await getAuthenticatedGoogleClient()
      const calendar = google.calendar({ version: 'v3', auth })
      const response = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      })
      return response.data.items ?? []
    } catch (err) {
      logger.error('Failed to list Google Calendar events:', err)
      return []
    }
  }

  async getAvailableSlots(daysAhead = 30): Promise<{ start: Date; end: Date }[]> {
    const status = await getGoogleCalendarConnectionStatus()
    if (!status.configured || !status.connected) {
      logger.warn('Google Calendar availability requested without an active OAuth connection')
      return []
    }

    const now = new Date()
    const until = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    const events = await this.listEvents(now, until)

    const busySlots = events.map(e => ({
      start: new Date(e.start?.dateTime ?? e.start?.date ?? ''),
      end: new Date(e.end?.dateTime ?? e.end?.date ?? ''),
    }))

    const available: { start: Date; end: Date }[] = []
    const cursor = new Date(now)
    cursor.setMinutes(0, 0, 0)
    cursor.setHours(BUSINESS_HOURS.start)

    while (cursor < until) {
      const dayOfWeek = cursor.getDay()
      // Skip weekends (0=Sun, 6=Sat)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        for (let h = BUSINESS_HOURS.start; h < BUSINESS_HOURS.end; h++) {
          const slotStart = new Date(cursor)
          slotStart.setHours(h, 0, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)

          if (slotStart <= now) continue

          const overlaps = busySlots.some(b => slotStart < b.end && slotEnd > b.start)
          if (!overlaps) {
            available.push({ start: slotStart, end: slotEnd })
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(BUSINESS_HOURS.start, 0, 0, 0)
    }

    return available
  }

  getAuthUrl(state: string): string {
    const oauth2Client = createOAuth2Client()
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_OAUTH_SCOPES,
      prompt: 'consent',
      state,
    })
  }

  async handleCallback(code: string): Promise<void> {
    const oauth2Client = createOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    await persistGoogleTokens(tokens as Record<string, unknown>)
    logger.info('Google Calendar OAuth tokens stored')
  }
}

export const googleCalendar = new GoogleCalendarService()
