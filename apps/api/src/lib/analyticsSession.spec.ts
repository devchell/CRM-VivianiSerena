import { beforeEach, describe, expect, it } from 'vitest'
import { createAnalyticsSessionProof, isValidAnalyticsSession } from './analyticsSession'

describe('analytics session proof', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-analytics-session-proofs'
  })

  it('accepts a proof only for the same session id', () => {
    const proof = createAnalyticsSessionProof('session_1')

    expect(isValidAnalyticsSession('session_1', proof)).toBe(true)
    expect(isValidAnalyticsSession('session_2', proof)).toBe(false)
    expect(isValidAnalyticsSession('session_1', `${proof.slice(0, -1)}0`)).toBe(false)
  })
})
