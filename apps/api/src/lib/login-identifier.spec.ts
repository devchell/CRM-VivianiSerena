import { describe, expect, it } from 'vitest'
import { normalizeLoginIdentifier } from './login-identifier'

describe('normalizeLoginIdentifier', () => {
  it('normalizes username casing and surrounding spaces', () => {
    expect(normalizeLoginIdentifier(' Viviani ')).toBe('viviani')
    expect(normalizeLoginIdentifier('VIVIANI')).toBe('viviani')
    expect(normalizeLoginIdentifier('ViViaNI')).toBe('viviani')
  })
})
