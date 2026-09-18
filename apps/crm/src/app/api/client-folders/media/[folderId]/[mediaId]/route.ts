import { type NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

function resolveApiBaseUrl(): string | null {
  const value = process.env.API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) return null
    return value.replace(/\/+$/, '')
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; mediaId: string }> },
) {
  const { folderId, mediaId } = await params
  const apiBaseUrl = resolveApiBaseUrl()
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const accessToken = typeof token?.accessToken === 'string' ? token.accessToken : null
  if (!apiBaseUrl || !accessToken) return NextResponse.json({ success: false }, { status: 401 })

  const response = await fetch(`${apiBaseUrl}/api/v1/client-folders/${encodeURIComponent(folderId)}/media/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!response.ok) return NextResponse.json({ success: false }, { status: response.status })

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'image/webp',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
