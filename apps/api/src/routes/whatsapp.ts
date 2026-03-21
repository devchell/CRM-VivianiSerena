import { Router } from 'express'
import { ingestWhatsAppWebhook, verifyWhatsAppWebhookChallenge, verifyWhatsAppWebhookSignature } from '../infrastructure/whatsapp'

export const whatsappRouter: Router = Router()

whatsappRouter.get('/webhook', async (req, res, next) => {
  try {
    const challenge = verifyWhatsAppWebhookChallenge({
      mode: typeof req.query['hub.mode'] === 'string' ? req.query['hub.mode'] : undefined,
      verifyToken: typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : undefined,
      challenge: typeof req.query['hub.challenge'] === 'string' ? req.query['hub.challenge'] : undefined,
    })
    res.status(200).send(challenge)
  } catch (error) {
    next(error)
  }
})

whatsappRouter.post('/webhook', async (req, res, next) => {
  try {
    const signature = typeof req.headers['x-hub-signature-256'] === 'string'
      ? req.headers['x-hub-signature-256']
      : undefined
    const rawBody = (req as { rawBody?: Buffer }).rawBody

    if (signature && rawBody && !verifyWhatsAppWebhookSignature(signature, rawBody)) {
      res.status(403).json({ success: false, error: 'Invalid WhatsApp webhook signature' })
      return
    }

    const result = await ingestWhatsAppWebhook(req.body)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})
