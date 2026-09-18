import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const SECRET = process.env.REVALIDATE_SECRET ?? ''

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ error: 'REVALIDATE_SECRET not configured' }, { status: 500 })
  }

  const secret = req.headers.get('x-revalidate-secret')

  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  revalidatePath('/')
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() })
}
