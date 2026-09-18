/**
 * Login identifiers are normalized before lookup so usernames and e-mails
 * behave consistently regardless of casing or accidental surrounding spaces.
 */
export function normalizeLoginIdentifier(value: string): string {
  return value.trim().toLowerCase()
}
