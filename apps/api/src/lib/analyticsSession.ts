import crypto from 'crypto'

function getSecret() {
  const secret = process.env.ENCRYPTION_KEY?.trim()
  if (!secret) throw new Error('ENCRYPTION_KEY is required for analytics session proofs')
  return secret
}

export function createAnalyticsSessionProof(sessionId: string) {
  return crypto.createHmac('sha256', getSecret()).update(`analytics-session:${sessionId}`).digest('hex')
}

export function isValidAnalyticsSession(sessionId: string | undefined, proof: string | undefined): sessionId is string {
  if (!sessionId || !proof || proof.length !== 64 || !process.env.ENCRYPTION_KEY?.trim()) return false
  const expected = createAnalyticsSessionProof(sessionId)
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(proof))
}
