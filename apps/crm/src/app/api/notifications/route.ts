import { type NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

interface ApiNotification {
  id: string
  type: 'lead' | 'appointment' | 'security' | 'financial'
  title: string
  description: string
  timestamp: string
  read: boolean
  readAt: string | null
}

interface NotificationsResponse {
  success: true
  data: ApiNotification[]
}

function resolveApiBaseUrl(): string | null {
  const value = process.env.API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!value) {
    return null
  }

  try {
    const parsed = new URL(value)
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      return null
    }

    return value.replace(/\/+$/, '')
  } catch {
    return null
  }
}

async function getAccessToken(request: NextRequest): Promise<string | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  return typeof token?.accessToken === 'string' ? token.accessToken : null
}

export async function GET(request: NextRequest) {
  const apiBaseUrl = resolveApiBaseUrl()
  const accessToken = await getAccessToken(request)

  if (!apiBaseUrl || !accessToken) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/notifications?limit=12`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json([], { status: 200 })
    }

    const payload = await response.json() as NotificationsResponse
    return NextResponse.json(payload.data)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  const apiBaseUrl = resolveApiBaseUrl()
  const accessToken = await getAccessToken(request)

  if (!apiBaseUrl || !accessToken) {
    return NextResponse.json({ success: false }, { status: 200 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const response = await fetch(`${apiBaseUrl}/api/v1/notifications/read`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({ success: response.ok }))
    return NextResponse.json(payload, { status: response.ok ? 200 : 500 })
  } catch {
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
