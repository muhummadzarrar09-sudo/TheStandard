// One-time-token issuance. Replaces the request-otp Edge Function's
// client-facing surface (the Edge Function still runs for non-cohort
// admin paths and is no longer the public entry point).
//
// Flow:
//   1. Client POSTs { email } to /api/auth/request-otp
//   2. Server checks the email is enrolled + the access window is open
//      (same rules as before, but the response is a *signed token* that
//      binds the email to a 5-minute TTL)
//   3. Client stores the token in sessionStorage
//   4. Client POSTs the token + the OTP code to /api/auth/verify-otp
//   5. /api/auth/verify-otp validates the token, calls Supabase's
//      admin.verifyOtp server-side, and on success sets the auth
//      cookies on the response. The client never calls
//      signInWithOtp directly anymore.
//
// The response is always { ok: true } for any well-formed email so an
// attacker cannot enumerate who is enrolled (same as the prior edge
// function).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidEmail, normalizeEmail, OTP_EXPIRY_SECONDS } from '../../../../lib/auth'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import { withErrorHandling, withRequestIdHeader, withAccessLog } from '../../../../lib/api-handler'
import { badRequest, toResponse } from '../../../../lib/api-errors'
import { rateLimit } from '../../../../lib/rate-limit'
import {
  signOtpToken,
  verifyOtpToken,
  isOtpNonceUsed,
  recordOtpNonce,
  _newOtpNonce
} from '../../../../lib/otp-token'

export const dynamic = 'force-dynamic'

const TOKEN_TTL_SECONDS = 300 // 5 minutes
const MAX_BODY = 1024

async function isEligible(db: Awaited<ReturnType<typeof createSupabaseServer>>, email: string): Promise<boolean> {
  const { data } = await db
    .from('profiles')
    .select('id, access_start_at, access_end_at, cohort_id')
    .eq('email', email)
    .maybeSingle()
  if (!data) return false
  // If a cohort is set, the cohort itself must also be open.
  if (data.cohort_id) {
    const { data: cohort } = await db
      .from('cohorts')
      .select('status')
      .eq('id', data.cohort_id)
      .maybeSingle()
    if (cohort && (cohort.status === 'closed' || cohort.status === 'archived')) return false
  }
  const now = Date.now()
  if (data.access_start_at && new Date(data.access_start_at).getTime() > now) return false
  if (data.access_end_at && new Date(data.access_end_at).getTime() <= now) return false
  return true
}

async function auditRequest(db: Awaited<ReturnType<typeof createSupabaseServer>>, email: string, eligible: boolean) {
  try {
    await db.from('otp_request_log').insert({
      email,
      eligible,
      requested_at: new Date().toISOString(),
      source: 'api'
    })
  } catch {
    // Table may not exist in early dev; ignore.
  }
}

// The handler. Rate-limited to 5 attempts per email per 10 minutes so
// a misbehaving client can't exhaust the HMAC table.
const handler = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (req: NextRequest): Promise<Response> => {
      const limited = rateLimit(req, { key: 'request-otp', max: 5, windowMs: 10 * 60_000 })
      if (!limited.ok) {
        return new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), {
          status: limited.response.status,
          headers: { 'content-type': 'application/json', 'retry-after': String(limited.retryAfterSeconds) }
        })
      }

      const text = await req.text()
      if (text.length > MAX_BODY) {
        return toResponse(badRequest('Body too large'))
      }
      let body: any
      try { body = JSON.parse(text) } catch { return toResponse(badRequest('Invalid JSON')) }

      const email = normalizeEmail(typeof body?.email === 'string' ? body.email : '')
      if (!isValidEmail(email)) {
        // Generic OK to prevent enumeration; still no token issued.
        return NextResponse.json({ ok: true, token: null })
      }

      // This endpoint runs before authentication. Use the service-role
      // client for the server-side enrollment lookup so anonymous RLS
      // does not hide enrolled profiles. This key stays server-side.
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const eligible = await isEligible(db, email)
      await auditRequest(db, email, eligible)

      if (!eligible) {
        // Generic OK; no token.
        return NextResponse.json({ ok: true, token: null })
      }

      const nonce = _newOtpNonce()
      const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
      const token = signOtpToken({ email, exp, nonce })
      // Record the nonce so the verify-otp endpoint can detect reuse.
      recordOtpNonce(nonce, exp * 1000)

      return NextResponse.json({
        ok: true,
        token,
        // Hint to the client when to start the countdown.
        expires_in: OTP_EXPIRY_SECONDS
      })
    })
  )
)

export const POST = handler

// Internal helpers shared with the verify-otp and send-code routes.
// Imported as named exports; the verify/send routes use them.
export const tokenOps = {
  verifyToken: verifyOtpToken,
  isNonceUsed: isOtpNonceUsed,
  recordNonce: recordOtpNonce
}
