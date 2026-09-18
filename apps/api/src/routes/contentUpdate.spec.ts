import { describe, expect, it } from 'vitest'
import { contentUpdateSchema } from './contentUpdate'

describe('contentUpdateSchema', () => {
  it('rejects a body without value', () => {
    expect(() => contentUpdateSchema.parse({})).toThrow()
  })

  it('accepts explicit JSON values, including null and empty objects', () => {
    expect(contentUpdateSchema.parse({ value: null })).toEqual({ value: null })
    expect(contentUpdateSchema.parse({ value: {} })).toEqual({ value: {} })
  })

  it('rejects oversized and deeply nested content before persistence', () => {
    let nested: Record<string, unknown> = { leaf: true }
    for (let depth = 0; depth < 9; depth += 1) nested = { nested }

    expect(() => contentUpdateSchema.parse({ value: nested })).toThrow()
    expect(() => contentUpdateSchema.parse({ value: 'x'.repeat(200_001) })).toThrow()
  })
})
