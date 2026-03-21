import { NextRequest, NextResponse } from 'next/server'
import { landingServerEnv } from '@/lib/server-env'

interface WebVitalPayload {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  id: string
  navigationType: string
  page?: string
  sessionId?: string
  url?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: WebVitalPayload = await request.json()

    if (!body.name || typeof body.value !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const response = await fetch(`${landingServerEnv.apiBaseUrl}/api/v1/analytics/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: body.name,
        value: body.value,
        rating: body.rating,
        id: body.id,
        navigationType: body.navigationType,
        page: body.page,
        sessionId: body.sessionId,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to forward vitals' }, { status: 502 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
