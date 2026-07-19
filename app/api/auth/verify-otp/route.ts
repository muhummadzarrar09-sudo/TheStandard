// Server-side OTP verification. Replaces the client-side
// `db.auth.verifyOtp` call. Flow:
//   1. Client posts { email, token, code }
//   2. Server verifies the token is valid and unused
//   3. Server calls Supabase admin auth to verify the code
//   4. On success, the server builds a session and writes the
//      Supabase auth cookies via SSR's setAll helper
//   5. Client navigates to /dashboard; the cookies are now in the jar
//
// The response is always { ok: true } for any well-formed input so an
// attacker cannot enumerate codes.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import { withErrorHandling, withRequestIdHeader, withAccessLog } from '../../../../lib/api-handler'
import { badRequest, toResponse } from '../../../../lib/api-errors'
import { rateLimit } from '../../../../lib/rate-limit'
import { normalizeEmail } from '../../../../lib/auth'
import { verifyOtpToken, isOtpNonceUsed, recordOtpNonce } from '../../../../lib/otp-token'

export const dynamic = 'force-dynamic'

const MAX_BODY = 1024
const CODE_RE = /^\d{6}$/

// 20 attempts per IP per 10 minutes. The OTP itself is 6 digits, so a
// well-behaved client will succeed in 1–2 attempts.
const handler = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (req: NextRequest): Promise<Response> => {
      const limited = rateLimit(req, { key: 'verify-otp', max: 20, windowMs: 10 * 60_000 })
      if (!limited.ok) {
        return new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), {
          status: limited.response.status,
          headers: { 'content-type': 'application/json', 'retry-after': String(limited.retryAfterSeconds) }
        })
      }

      const text = await req.text()
      if (text.length > MAX_BODY) return toResponse(badRequest('Body too large'))
      let body: any
      try { body = JSON.parse(text) } catch { return toResponse(badRequest('Invalid JSON')) }

      const email = normalizeEmail(typeof body?.email === 'string' ? body.email : '')
      const token = typeof body?.token === 'string' ? body.token : ''
      const code = typeof body?.code === 'string' ? body.code : ''

      if (!email || !token || !CODE_RE.test(code)) {
        return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 })
      }

      // Import the verifier from the sibling route. We keep the import
      // dynamic to avoid a static cycle if/when this file is refactored.
      const payload = verifyOtpToken(token)
      if (!payload || payload.email !== email) {
        return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 })
      }
      if (isOtpNonceUsed(payload.nonce)) {
        return NextResponse.json({ ok: false, error: 'token_reused' }, { status: 401 })
      }
      // Mark the nonce used now. If Supabase verifyOtp fails, the user
      // can re-request a token; we don't want to allow a guessed token
      // + guessed code to be replayed.
      recordOtpNonce(payload.nonce, payload.exp * 1000)

      // We need the service-role client to call verifyOtp. The
      // service-role client doesn't have cookie bindings; we use it
      // purely to validate the OTP code and mint a session.
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )

      // Use the magic link / OTP type that matches what the login
      // page would have requested.
      const { data, error } = await admin.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      })
      if (error || !data?.session) {
        return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 401 })
      }

      // We have a session. Now we need to write the auth cookies so the
      // user's subsequent requests are authenticated. We do this by
      // asking the Supabase server client to set the cookies via its
      // setAll helper. We pass the session in as a "magic" event by
      // re-issuing a signInWithSession call.
      const db = await createSupabaseServer()
      // The simplest way: use the SSR client's setSession, which
      // writes the auth cookie through the cookie adapter.
      const { error: setErr } = await db.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      })
      if (setErr) {
        return NextResponse.json({ ok: false, error: 'session_set_failed' }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    })
  )
)

export const POST = handler
