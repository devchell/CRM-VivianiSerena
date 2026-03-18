/**
 * Utilitários de segurança contra runtime errors.
 * Importar em TODOS os componentes e hooks que lidam com dados externos.
 */

/** Retorna um array seguro. Se o valor não for array, retorna []. */
export function safeArray<T = unknown>(value: unknown): T[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return []
  return value as T[]
}

/** Retorna uma string segura. Se o valor não for string, retorna o fallback. */
export function safeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

/** Retorna um número seguro e finito. Se inválido, retorna o fallback. */
export function safeNumber(value: unknown, fallback = 0): number {
  if (value === undefined || value === null) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Retorna um boolean seguro. */
export function safeBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

/** Retorna um objeto seguro. Se não for objeto (ou for null/array), retorna fallback. */
export function safeObject<T extends Record<string, unknown>>(
  value: unknown,
  fallback: T = {} as T
): T {
  if (value === null || value === undefined) return fallback
  if (typeof value !== 'object') return fallback
  if (Array.isArray(value)) return fallback
  return value as T
}

/** JSON.parse seguro. Nunca lança erro. */
export function safeJsonParse<T = unknown>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

/** Acessa propriedade profunda com segurança. Nunca lança erro. */
export function safeGet<T>(fn: () => T, fallback: T): T {
  try {
    const result = fn()
    return result === undefined || result === null ? fallback : result
  } catch {
    return fallback
  }
}

/** Remove valores null/undefined de um array. */
export function compactArray<T>(arr: unknown): NonNullable<T>[] {
  return safeArray<T>(arr).filter(
    (item): item is NonNullable<T> => item !== null && item !== undefined
  )
}

/** Verifica se é array não-vazio. */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0
}

/** Executa callback de forma segura (para props opcionais). */
export function safeCall<T extends (...args: unknown[]) => unknown>(
  fn: T | undefined | null,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  if (typeof fn === 'function') {
    try {
      return fn(...args) as ReturnType<T>
    } catch {
      return undefined
    }
  }
  return undefined
}
