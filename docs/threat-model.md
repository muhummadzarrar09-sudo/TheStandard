# Threat model

A short list of the threats this codebase is designed to resist, and
the ones it knowingly does not. Review this when adding new entry
points, before shipping major changes, and any time a security
incident is investigated.

## What we defend against

### Enumeration of enrolled emails (PRD 18.1)

**Threat:** an attacker probes the auth endpoint to learn which
emails are enrolled in the cohort, when their access window opens,
and when it closes.

**Defense:** `/api/auth/request-otp` returns `{ ok: true }` for *any*
well-formed email. The response does not include a token unless the
email is enrolled, the access window is open, and the cohort is not
closed. A caller cannot distinguish "email is enrolled" from "email
is unknown" by inspecting the response. Malformed emails also return
200, so even the format check cannot be used to discover valid
addresses. Audited in `supabase/tests/rls_smoke.sql` (the audit
table is server-side only — never returned to the client).

### Replay of the OTP gate token (Phase 4)

**Threat:** an attacker who has captured a `request-otp` token (e.g.
via a referer leak or a malicious browser extension) reuses it.

**Defense:** the token is single-use. The nonce embedded in the
token is recorded in the process-local `usedNonces` map on the
first successful verify; subsequent attempts to use the same token
return 401. The token is also time-bound (5 minutes), so a captured
token has a small window of usefulness even if nonce tracking is
bypassed. In a multi-instance deployment, swap the process-local map
for a Redis SET with EX TTL — the public surface stays the same.

### Direct call to `signInWithOtp` (Phase 0 follow-up, closed in Phase 4)

**Threat:** an attacker bypasses the request-otp endpoint and calls
Supabase's `signInWithOtp` directly to get an OTP for an
un-enrolled email.

**Defense:** the client no longer calls `signInWithOtp` at all. The
OTP is sent server-side via `admin.generateLink` in
`/api/auth/send-code`, which is gated on a valid `request-otp`
token. The login page has no way to reach the OTP-sending code path
without first presenting a valid token. This closes the bypass
flagged with a TODO in Phase 0.

### Self-promotion to admin (PRD 1.3)

**Threat:** a member updates their own `profiles.role` to `'admin'`.

**Defense:** the `profiles_self_update_lock` trigger (migration 007)
raises if a non-service role attempts to change `role`, `cohort_id`,
or `access_*` columns. The RLS policy on `profiles` is also
column-scoped — `profiles_self` allows members to read and update
their own row but only via the API whitelists. The PATCH endpoint
(`/api/profile`) explicitly enumerates the writable columns and
refuses to update anything else.

### Cross-user reads of private data

**Threat:** member A reads member B's check-in, reflection, or
team message.

**Defense:** every member-scoped table has a per-row RLS policy
that scopes to `user_id = auth.uid()`. Audited in
`supabase/tests/rls_smoke.sql`. The API also never returns another
user's data — `/api/checkins` and `/api/milestones` filter by
`user_id` in the query.

### Device-session theft (PRD 1.7)

**Threat:** an attacker who has stolen a session cookie uses it from
their own device.

**Defense:** the `getActiveUser` helper checks `x-device-id` against
the `device_sessions` table. A revoked session returns 401 even
with a valid auth cookie. Members can see their active sessions on
`/settings/devices` and revoke any of them.

### Bypass of the daily cutoff (PRD 18.6)

**Threat:** a member marks a block complete *after* the day has
closed, retroactively extending their streak.

**Defense:** `/api/schedule/complete` and `/api/checkins` PUT
both compute the day cutoff (`cutoffForLocalDate`) for the member's
timezone and reject the write if `now > cutoff`. The cutoff hour is
3 AM by default (next day's start). DST is handled by the closed-form
implementation in `lib/domain/schedule.ts`, which is property-tested
against 8 zones including the Chatham half-hour offset.

### Brute-force of the OTP code

**Threat:** an attacker with a valid token tries every 6-digit
code.

**Defense:** `/api/auth/verify-otp` is rate-limited at 20 attempts
per IP per 10 minutes. At 6 digits, that's ~120k attempts per hour
per IP — well below the 1M attempts needed to clear the 1M-1 odds.
The token is also single-use, so the brute-force window is at most
5 minutes.

### Brute-force of the per-IP rate limiter itself

**Threat:** an attacker rotates IPs to defeat the rate limit.

**Defense:** the rate limiter (`lib/rate-limit.ts`) is
process-local. On Vercel serverless each cold start gets its own
counter; an attacker who rotates IPs spreads the load across
instances but still faces the 5/min cap *per instance*. For a
sustained attack, switch the rate-limiter storage to Upstash
Redis with per-IP counters — the `rateLimit()` function surface
stays the same.

## What we knowingly do not defend against

### Cross-site request forgery (CSRF) on state-changing API routes

**Defense (Phase 9):** the middleware now enforces a
double-submit CSRF token on every state-changing API route.
The `csrf` cookie is set on the first safe request; the
client-side `CsrfBootstrap` shim copies the cookie into a
`x-csrf-token` header on every `POST`/`PUT`/`PATCH`/`DELETE`
to a protected `/api/*` path. A 403 fires on a missing
cookie, missing header, or mismatch. The auth + log +
health + push-subscribe paths are explicitly unprotected
(rate limit + OTP lockout are the defense there). The
`Supabase SSR` `SameSite=Lax` cookie is now belt-and-suspenders
rather than the only line.

**When this stops being true:** if you add a cross-origin
embed that needs to call `/api/*` with state-changing
methods, the shim is client-only — the embed-side caller
would need to set the header explicitly. The `lib/csrf.ts`
`UNPROTECTED_PREFIXES` list is the gate to add a new
end-point to if you intend to skip the check.

### Compromised service-role key

**Why we accept this:** the service-role key bypasses RLS by
design. Every admin route is gated by `requireServerAdmin` (which
checks the `profiles.role` column) and every cohort-scoped route
filters by `cohort_id`. So even a leaked service-role key can only
be used to call our admin endpoints, and our admin endpoints are
already auth'd and scope-checked.

**When this stops being true:** if you add admin endpoints that
*don't* call `requireServerAdmin` or that *don't* filter by
`cohort_id`, revisit. The audit must include "is every admin
endpoint still gated?".

### Compromised `OTP_TOKEN_SECRET`

**Why we accept this:** the secret is used to HMAC-sign the OTP
gate tokens. A leaked secret lets the holder mint valid tokens,
but the tokens are still single-use (the nonce bookkeeping rejects
replays) and the verify step still requires the actual OTP code
delivered to the user's email. So a leaked secret + a leaked OTP
code together are required to impersonate.

**When this stops being true:** if you remove the nonce bookkeeping
or extend the token TTL, revisit. The secret should also be
rotated on a schedule (every 90 days) and on any suspected
compromise; rotation invalidates outstanding tokens but the
single-use + 5-min TTL keeps the blast radius small.

### DoS at the edge

**Why we accept this:** Vercel + Supabase have their own rate
limiting and DoS protection. Our per-IP rate limit on
`/api/auth/*` is the second line of defense; Cloudflare (if
fronted) is the first.

**When this stops being true:** if you start seeing 5xx spikes from
the Vercel log explorer, add Cloudflare in front with rate-limit
rules at the edge. The application-level rate limiter is a
backstop, not a primary defense.

### Long-lived session tokens

**Why we accept this:** Supabase's default session lifetime is 1
hour (access token) + 7 days (refresh token). Combined with the
device-session check on every API call, a stolen token is
short-lived and can be revoked per-device.

**When this stops being true:** if the cohort is paid + high-trust,
shorten the refresh-token TTL to 24 hours and require
re-authentication for sensitive admin actions.

## Reporting

Found a gap in this model? Open a security issue. The audit
checklist in `PHASE0_LOG.md` is the runbook for the current state;
any new entry point added in a future phase should be reviewed
against the defenses above.
