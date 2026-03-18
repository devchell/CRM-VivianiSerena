import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter (per edge instance)
const ipRequestMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT = 100 // requests
const RATE_WINDOW = 60_000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = ipRequestMap.get(ip)

  if (!record || now > record.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) return false

  record.count++
  return true
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') ?? ''

  // Redirect www → non-www
  if (hostname.startsWith('www.')) {
    url.hostname = hostname.replace(/^www\./, '')
    return NextResponse.redirect(url, { status: 301 })
  }

  // Rate limiting for API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '0.0.0.0'

    if (!checkRateLimit(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(RATE_LIMIT),
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}
