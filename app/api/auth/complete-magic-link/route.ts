import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { badRequest, toResponse } from '../../../../lib/api-errors'
import { withErrorHandling } from '../../../../lib/api-handler'

export const dynamic = 'force-dynamic'

// Exchanges the browser client's magic-link session for SSR cookies.
// The access and refresh tokens are accepted only over the same-origin
// HTTPS request and are never logged.
//
// CRITICAL: In Route Handlers, cookies() from next/headers does NOT
// automatically transfer cookies to the response. We must build the
// response first, then create a Supabase client that sets cookies
// directly on the response object.
export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  let body: any
  try { body = await req.json() } catch { return toResponse(badRequest('Invalid JSON body')) }
  const accessToken = typeof body?.access_token === 'string' ? body.access_token : ''
  const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : ''
  if (!accessToken || !refreshToken) return toResponse(badRequest('Missing session tokens'))

  // Build the response FIRST
  const response = NextResponse.json({ ok: true })

  // Create a Supabase client that sets cookies on the RESPONSE
  // instead of the request cookie store
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })
  if (error) return NextResponse.json({ ok: false, error: 'session_failed' }, { status: 401 })
  return response
})
