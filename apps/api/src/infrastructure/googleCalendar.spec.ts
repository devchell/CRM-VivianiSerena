import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisGet = vi.fn()
const redisSetex = vi.fn()

const refreshAccessToken = vi.fn()
const getAccessToken = vi.fn()
const setCredentials = vi.fn()

vi.mock('../lib/redis', () => ({
  redis: {
    get: redisGet,
    setex: redisSetex,
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
    redisSetex.mockResolvedValue(undefined)
    refreshAccessToken.mockReset()
    getAccessToken.mockReset()
    setCredentials.mockReset()

    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
    process.env.GOOGLE_REDIRECT_URI = 'https://api.example.com/api/v1/auth/google/callback'
  })

  it('preserves refresh_token when Google refresh returns only a new access token', async () => {
    redisGet.mockResolvedValue(JSON.stringify({
      access_token: 'old-access',
      refresh_token: 'persist-me',
      expiry_date: Date.now() + 60 * 1000,
    }))
    refreshAccessToken.mockResolvedValue({
      credentials: {
        access_token: 'new-access',
        expiry_date: Date.now() + 3600 * 1000,
      },
    })

    const { getAuthenticatedGoogleClient } = await import('./googleCalendar')
    await getAuthenticatedGoogleClient()

    expect(redisSetex).toHaveBeenCalledTimes(1)
    const persisted = JSON.parse(redisSetex.mock.calls[0][2])
    expect(persisted.access_token).toBe('new-access')
    expect(persisted.refresh_token).toBe('persist-me')
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
