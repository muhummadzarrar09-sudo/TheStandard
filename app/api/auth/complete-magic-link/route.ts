import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import { badRequest, toResponse } from '../../../../lib/api-errors'
import { withErrorHandling } from '../../../../lib/api-handler'

export const dynamic = 'force-dynamic'

// Exchanges the browser client's magic-link session for SSR cookies.
// The access and refresh tokens are accepted only over the same-origin
// HTTPS request and are never logged.
export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  let body: any
  try { body = await req.json() } catch { return toResponse(badRequest('Invalid JSON body')) }
  const accessToken = typeof body?.access_token === 'string' ? body.access_token : ''
  const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : ''
  if (!accessToken || !refreshToken) return toResponse(badRequest('Missing session tokens'))

  const db = await createSupabaseServer()
  const { error } = await db.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })
  if (error) return NextResponse.json({ ok: false, error: 'session_failed' }, { status: 401 })
  return NextResponse.json({ ok: true })
})
