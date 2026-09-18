import { describe, expect, it } from 'vitest'
import { buildSecurityChecklist } from './securityChecklist'

function getItem(id: string, context: Parameters<typeof buildSecurityChecklist>[0]) {
  return buildSecurityChecklist(context).find((entry) => entry.id === id)
}

describe('buildSecurityChecklist', () => {
  it('does not report TLS or SSL as active on an HTTP presentation environment', () => {
    const context = {
      httpsActive: false,
      redisOk: true,
      backupConfigured: false,
      twoFactorConfigured: false,
      hstsEnabled: false,
      sslExpiryDays: 90,
    }

    expect(getItem('https', context)).toMatchObject({ ok: false })
    expect(getItem('ssl_expiry', context)).toMatchObject({ ok: false })
    expect(getItem('https', context)?.description).toContain('HTTP')
    expect(getItem('ssl_expiry', context)?.description).toContain('HTTP')
  })

  it('reports delivery-backed 2FA and TLS only when the runtime supports them', () => {
    const context = {
      httpsActive: true,
      redisOk: true,
      backupConfigured: true,
      twoFactorConfigured: true,
      hstsEnabled: true,
      sslExpiryDays: 90,
    }
    const checklist = buildSecurityChecklist(context)

    expect(checklist.every((entry) => entry.ok)).toBe(true)
    expect(getItem('ssl_expiry', context)).toMatchObject({ ok: true, daysLeft: 90 })
  })
})
