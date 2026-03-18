import { NextRequest, NextResponse } from 'next/server'

interface WebVitalPayload {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  id: string
  navigationType: string
  url?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: WebVitalPayload = await request.json()

    // Validate shape
    if (!body.name || typeof body.value !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // In production, forward to your analytics backend or logging service
    // For now, log to console (Next.js server logs)
    if (process.env.NODE_ENV === 'production') {
      console.info('[WebVital]', {
        name: body.name,
        value: Math.round(body.value),
        rating: body.rating,
        id: body.id,
        navigationType: body.navigationType,
        url: body.url,
        ts: new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
