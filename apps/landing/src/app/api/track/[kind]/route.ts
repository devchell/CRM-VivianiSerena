import { NextRequest, NextResponse } from 'next/server'
import { landingServerEnv } from '@/lib/server-env'

const TRACK_KINDS = new Set(['pageview', 'event'])

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ kind: string }> }
) {
  try {
    const { kind } = await context.params

    if (!TRACK_KINDS.has(kind)) {
      return NextResponse.json({ error: 'Invalid tracking kind' }, { status: 400 })
    }

    const body = await request.json()
    const response = await fetch(`${landingServerEnv.apiBaseUrl}/api/v1/analytics/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to forward tracking' }, { status: 502 })
    }

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
