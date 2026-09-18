export function maskEmail(value: string): string {
  const [local, domain] = value.split('@', 2)
  if (!local || !domain) return '[redacted]'
  return `${local.slice(0, 1)}***@${domain}`
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '[redacted]'
}
