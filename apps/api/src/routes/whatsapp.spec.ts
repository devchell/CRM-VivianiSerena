import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../middleware/errorHandler'

const ingestWhatsAppWebhook = vi.fn()
const verifyWhatsAppWebhookChallenge = vi.fn()
const verifyWhatsAppWebhookSignature = vi.fn()

vi.mock('../infrastructure/whatsapp', () => ({
  ingestWhatsAppWebhook,
  verifyWhatsAppWebhookChallenge,
  verifyWhatsAppWebhookSignature,
}))

let whatsappRouter: typeof import('./whatsapp').whatsappRouter

beforeAll(async () => {
  const module = await import('./whatsapp')
  whatsappRouter = module.whatsappRouter
})

beforeEach(() => {
  vi.clearAllMocks()
})

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', whatsappRouter)
  app.use(errorHandler)
  return app
}

describe('GET /whatsapp/webhook', () => {
  it('returns the challenge when Meta validates the webhook', async () => {
    verifyWhatsAppWebhookChallenge.mockReturnValue('challenge-token')

    const response = await request(createApp())
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'token',
        'hub.challenge': 'challenge-token',
      })

    expect(response.status).toBe(200)
    expect(response.text).toBe('challenge-token')
  })
})

describe('POST /whatsapp/webhook', () => {
  it('ingests status updates and acknowledges the provider', async () => {
    ingestWhatsAppWebhook.mockResolvedValue({ processed: 2 })
    verifyWhatsAppWebhookSignature.mockReturnValue(true)

    const response = await request(createApp())
      .post('/webhook')
      .set('x-hub-signature-256', 'sha256=test')
      .send({ entry: [] })

    expect(response.status).toBe(200)
    expect(ingestWhatsAppWebhook).toHaveBeenCalled()
    expect(response.body).toMatchObject({
      success: true,
      data: { processed: 2 },
    })
  })
})
