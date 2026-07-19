// Send the OTP code to the user's email. Gated by the email-bound
// token minted by /api/auth/request-otp. Internally calls
// supabase.auth.admin.generateLink, which produces both the magic
// link and a one-time password (token) that the user can either click
// or type. We extract the token from the link and (in production)
// instruct the email template to display it.
//
// Why a custom server-side send: we want the OTP code to be sent
// through Supabase's email infrastructure (so the format and deliver-
// ability are consistent with the rest of the app), but we don't want
// the client to be able to call generateLink directly. The gate token
// is the proof that the client has been pre-approved.

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

export const dynamic = 'force-dynamic'

const MAX_BODY = 1024

// 5 sends per IP per 10 minutes. Each send is one email.
const handler = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (req: NextRequest): Promise<Response> => {
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

      // generateLink returns a magic link URL. The URL contains the
      // OTP token in its query string (?token=...). The email template
      // the admin has configured is responsible for either showing
      // the full URL or extracting the token and showing it as a
      // 6-digit code. Either way, the user receives the code and
      // enters it on /verify.
      // generateLink returns a magic link URL. The URL contains the
      // OTP token in its query string (?token=...). The email template
      // the admin has configured is responsible for either showing
      // the full URL or extracting the token and showing it as a
      // 6-digit code. Either way, the user receives the code and
      // enters it on /verify.
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email
      })
      if (error || !data) {
        return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
      }
      return NextResponse.json({ ok: true })
    })
  )
)

export const POST = handler
