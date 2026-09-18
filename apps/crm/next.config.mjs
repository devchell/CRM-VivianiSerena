/** @type {import('next').NextConfig} */
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || '').origin
  } catch {
    return "'self'"
  }
})()
const apiWebSocketOrigin = apiOrigin.startsWith('http') ? apiOrigin.replace(/^http/, 'ws') : apiOrigin
const landingOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_LANDING_URL || '').origin
  } catch {
    return "'self'"
  }
})()

const nextConfig = {
  // next-auth v5 beta tem incompatibilidade com React Strict Mode (double-render)
  reactStrictMode: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' ${apiOrigin} ${apiWebSocketOrigin}; frame-src 'self' ${landingOrigin}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
          },
        ],
      },
    ]
  },
  transpilePackages: ['@viviani/ui', '@viviani/utils', '@viviani/types'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
