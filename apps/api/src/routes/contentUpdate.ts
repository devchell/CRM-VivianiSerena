import { z } from 'zod'

const MAX_CONTENT_BYTES = 200_000
const MAX_CONTENT_DEPTH = 8

function getDepth(value: unknown, depth = 0): number {
  if (!value || typeof value !== 'object') return depth
  return Math.max(...Object.values(value as Record<string, unknown>).map((entry) => getDepth(entry, depth + 1)), depth)
}

export const contentUpdateSchema = z.object({ value: z.unknown() }).superRefine((body, context) => {
  if (!Object.prototype.hasOwnProperty.call(body, 'value')) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'value is required',
    })
  }

  const serialized = JSON.stringify(body.value) ?? 'null'
  if (serialized.length > MAX_CONTENT_BYTES) {
    context.addIssue({ code: z.ZodIssueCode.too_big, maximum: MAX_CONTENT_BYTES, type: 'string', inclusive: true, path: ['value'], message: 'value excede o limite de tamanho' })
  }
  if (getDepth(body.value) > MAX_CONTENT_DEPTH) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'value excede a profundidade permitida' })
  }
})
