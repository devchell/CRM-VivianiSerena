const FALLBACK_SITE_URL = 'https://vivianicoaching.com'

function resolveSiteUrl() {
  const configured = process.env.SITE_URL?.trim()
  if (!configured) return FALLBACK_SITE_URL

  try {
    return new URL(configured).toString().replace(/\/$/, '')
  } catch {
    return FALLBACK_SITE_URL
  }
}

export const SITE_URL = resolveSiteUrl()
