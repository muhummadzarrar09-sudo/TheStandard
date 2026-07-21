// Send the magic-link sign-in email. Gated by the email-bound
// token minted by /api/auth/request-otp. Uses Supabase's
// signInWithOtp with an emailRedirectTo, which sends the user
// an email containing a one-click magic link that redirects
// back to /verify with the session tokens in the URL hash.
//
// Why a custom server-side send: we want the magic-link email
// to be sent through Supabase's email infrastructure (so the
// format and deliverability are consistent with the rest of the
// app), but we don't want the client to call signInWithOtp
// directly. The gate token is proof that the client has been
// pre-approved by the eligibility check in /request-otp.

import { NextRequest, NextResponse } from 'next/server'
// We import @supabase/supabase-js directly (not via @supabase/ssr) to
// get the admin generateLink API. The supabase-js package exports a
// named `createClient` factory; calling it with the service-role key
// gives us a client that bypasses RLS for the link-generation call
// (which Supabase requires). This is safe because the route gates
// the call on a valid OTP token first.
import { createClient } from '@supabase/supabase-js'
import { withErrorHandling, withRequestIdHeader, withAccessLog } from '../../../../lib/api-handler'
import { badRequest, toResponse } from '../../../../lib/api-errors'
import { rateLimit } from '../../../../lib/rate-limit'
import { normalizeEmail } from '../../../../lib/auth'
import { verifyOtpToken, isOtpNonceUsed } from '../../../../lib/otp-token'
import { checkAndRecordResend } from '../../../../lib/otp-cooldown'
import { assertServerEnv } from '../../../../lib/env'

export const dynamic = 'force-dynamic'

const MAX_BODY = 1024

// 5 sends per IP per 10 minutes. Each send is one email.
const handler = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (req: NextRequest): Promise<Response> => {
      assertServerEnv()
      const limited = rateLimit(req, { key: 'send-code', max: 5, windowMs: 10 * 60_000 })
      if (!limited.ok) {
        return new Response(JSON.stringify({ ok: false }), {
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
      if (!email || !token) {
        return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 })
      }

      // Resend cooldown: PRD §8.1 says "resend cooldown" so a
      // user can't flood the email provider. Refuse the resend
      // and tell the client how long to wait.
      const cooldown = checkAndRecordResend(email)
      if (!cooldown.allowed) {
        return new Response(JSON.stringify({ ok: false, error: 'cooldown', retryAfterSeconds: cooldown.retryAfterSeconds }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': String(cooldown.retryAfterSeconds) }
        })
      }

      const payload = verifyOtpToken(token)
      if (!payload || payload.email !== email) {
        return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 })
      }
      if (isOtpNonceUsed(payload.nonce)) {
        return NextResponse.json({ ok: false, error: 'token_reused' }, { status: 401 })
      }
      // Don't mark the nonce used here — only verify-otp does. This
      // way a failed send can be retried while the token is still
      // valid; the nonce is consumed only on a successful verify.

      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )

      // Ask Supabase Auth to send a magic-link email. The user
      // clicks the link in the email and is redirected back to
      // /verify with the session tokens in the URL hash. The
      // verify page then picks up the session via getSession().
      const { error } = await admin.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: new URL('/verify', req.url).toString()
        }
      })
      if (error) {
        return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
      }
      return NextResponse.json({ ok: true })
    })
  )
)

export const POST = handler
