// Deploy as Supabase Edge Function. Keep eligibility checks server-side.
//
// Phase 0 fix: stop enumerating enrollment state.
//   Previously this function returned {ok:false} 403 for non-eligible emails and
//   {ok:true} 200 for eligible ones. That difference let an attacker probe
//   arbitrary addresses and learn who is enrolled, when their access window
//   opens, and when it has expired. The PRD (18.1) explicitly forbids this.
//
//   Now we always return {ok:true} for any well-formed email. The client calls
//   signInWithOtp regardless; the actual enrollment check happens later in
//   the verify-otp edge function (which is server-side and authoritative).
//
// TODO (Phase 1+): to close the bypass window (a non-eligible client could
// still call signInWithOtp directly and get an OTP), gate signInWithOtp behind
// a short-lived, single-use server-issued token minted by this function and
// consumed by verify-otp. The token's payload should include the email and a
// 60-second TTL, and verify-otp should reject if the token is missing or
// expired.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async req => {
  try {
    const { email } = await req.json()
    const normalized = String(email || '').trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      // Malformed input: still return a generic OK so we don't help an
      // attacker distinguish "bad email format" from "unknown email."
      return json({ ok: true })
    }
    // Optional: log enrollment refusals to an internal table for ops
    // visibility. The function never tells the caller which branch ran.
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data } = await db
      .from('profiles')
      .select('id, access_start_at, access_end_at, cohort_id')
      .eq('email', normalized)
      .maybeSingle()
    const now = Date.now()
    const eligible = !!(
      data &&
      (!data.access_start_at || new Date(data.access_start_at).getTime() <= now) &&
      (!data.access_end_at   || new Date(data.access_end_at).getTime()   > now)
    )
    if (!eligible) {
      // Audit (server-side, never returned): record the rejection so ops
      // can detect enumeration sweeps in aggregate.
      try {
        await db.from('otp_request_log').insert({
          email: normalized,
          eligible: false,
          requested_at: new Date().toISOString()
        })
      } catch { /* table may not exist yet; ignore */ }
    }
    return json({ ok: true })
  } catch {
    // Any unexpected error: still return generic OK to the client.
    return json({ ok: true })
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}
