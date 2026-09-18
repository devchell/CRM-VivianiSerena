import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisGet = vi.fn()
const redisSet = vi.fn()

const refreshAccessToken = vi.fn()
const getAccessToken = vi.fn()
const setCredentials = vi.fn()
const encryption = vi.hoisted(() => ({
  encrypt: vi.fn((value: string) => `encrypted:${value}`),
  decrypt: vi.fn((value: string) => value.replace(/^encrypted:/, '')),
}))

vi.mock('../lib/redis', () => ({
  redis: {
    get: redisGet,
    set: redisSet,
    del: vi.fn(),
  },
}))

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('./security/EncryptionService', () => ({
  EncryptionService: encryption,
}))

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        constructor(_clientId?: string, _clientSecret?: string, _redirectUri?: string) {}

        setCredentials = setCredentials
        refreshAccessToken = refreshAccessToken
        getAccessToken = getAccessToken
        generateAuthUrl = vi.fn(() => 'https://accounts.google.com/o/oauth2/auth')
        getToken = vi.fn()
      },
    },
    calendar: vi.fn(),
  },
}))

describe('googleCalendar integration helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    redisGet.mockResolvedValue(null)
    redisSet.mockResolvedValue(undefined)
    refreshAccessToken.mockReset()
    getAccessToken.mockReset()
    setCredentials.mockReset()

    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
    process.env.GOOGLE_REDIRECT_URI = 'https://api.example.com/api/v1/auth/google/callback'
  })

  it('preserves refresh_token when Google refresh returns only a new access token', async () => {
    redisGet.mockResolvedValue({
      access_token: 'old-access',
      refresh_token: 'persist-me',
      expiry_date: Date.now() + 60 * 1000,
    })
    refreshAccessToken.mockResolvedValue({
      credentials: {
        access_token: 'new-access',
        expiry_date: Date.now() + 3600 * 1000,
      },
    })

    const { getAuthenticatedGoogleClient } = await import('./googleCalendar')
    await getAuthenticatedGoogleClient()

    expect(redisSet).toHaveBeenCalledTimes(1)
    const persisted = redisSet.mock.calls[0][1]
    expect(typeof persisted).toBe('string')
    const decrypted = JSON.parse(encryption.decrypt(persisted)) as { access_token: string; refresh_token: string }
    expect(decrypted.access_token).toBe('new-access')
    expect(decrypted.refresh_token).toBe('persist-me')
  })

  it('reports missing OAuth configuration and required scopes', async () => {
    delete process.env.GOOGLE_CLIENT_SECRET

    const { getGoogleCalendarConnectionStatus, GOOGLE_OAUTH_SCOPES } = await import('./googleCalendar')
    const status = await getGoogleCalendarConnectionStatus()

    expect(status.configured).toBe(false)
    expect(status.connected).toBe(false)
    expect(status.missingConfiguration).toEqual(['GOOGLE_CLIENT_SECRET'])
    expect(status.scopes).toEqual(GOOGLE_OAUTH_SCOPES)
  })
})
