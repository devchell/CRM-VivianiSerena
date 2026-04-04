import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function requireRemoteUrl(name, value) {
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`)
  }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`[env] Invalid URL for ${name}: ${value}`)
  }

  if (LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`[env] ${name} must not point to localhost in this deployment model`)
  }

  return value.replace(/\/+$/, '')
}

const apiBaseUrl = requireRemoteUrl('API_BASE_URL', process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL)
const crmUrl = requireRemoteUrl('CRM_URL', process.env.CRM_URL)
const apiOrigin = new URL(apiBaseUrl).origin
const crmOrigin = new URL(crmUrl).origin
const apiImageHost = new URL(apiBaseUrl).hostname
const apiImageProtocol = new URL(apiBaseUrl).protocol.replace(':', '')

/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: ${apiOrigin} https://static.wixstatic.com https://images.unsplash.com https://res.cloudinary.com https://www.google-analytics.com`,
      `connect-src 'self' ${apiOrigin} https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://connect.facebook.net`,
      "frame-src 'self' https://www.google.com",
      `frame-ancestors 'self' ${crmOrigin}`,
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  compress: true,
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['@viviani/ui', '@viviani/utils', '@viviani/types'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: apiImageProtocol, hostname: apiImageHost },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'static.wixstatic.com' },
    ],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}

export default nextConfig
