import { logger } from '../lib/logger'
import { maskPhone } from '../lib/redact'

async function send(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  // Sem provedor configurado, o código não pode afirmar que o OTP foi enviado.
  if (!sid || !authToken || !from) {
    logger.warn('SMS not sent - provider not configured', { to: maskPhone(to) })
    return false
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const client = require('twilio')(sid, authToken) as {
      messages: { create: (opts: { body: string; from: string; to: string }) => Promise<void> }
    }
    await client.messages.create({ body, from, to })
    logger.info('SMS sent', { to: maskPhone(to) })
    return true
  } catch (err) {
    logger.error('SMS send failed:', err)
    return false
  }
}

export const smsService = {
  async sendOtp(phone: string, code: string): Promise<boolean> {
    const body = `Viviani Serena CRM: Seu código de verificação é ${code}. Válido por 5 minutos. Não compartilhe.`
    return send(phone, body)
  },
}
