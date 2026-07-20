# Environment variables

A complete reference for what runs where. **Set the variables
in the right environment for what you're deploying.** A Vercel
deploy reads `.env` (or the Vercel dashboard); a Supabase edge
function deploy reads the edge function's secret store (or
`supabase/.env` for `supabase functions serve`).

## At a glance

| Variable | Where it lives | Required? | Used by |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | **Yes** | `lib/supabase/{browser,server}.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | **Yes** | `lib/supabase/{browser,server}.ts`, `/api/auth/send-code`, `/api/auth/verify-otp` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel | **Yes** (if you ship push) | `components/pwa/PushSubscription.tsx` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + Supabase | **Yes** | `app/api/auth/*`, every admin route, every server `db.from(...)` call |
| `CRON_SECRET` | Vercel + Supabase | **Yes** (if you run crons) | The two edge functions guard with `x-cron-secret`; the Vercel cron sends it on every invocation |
| `VAPID_SUBJECT` | Vercel + Supabase | No (default `mailto:ops@example.com`) | `send-push` (web-push library, future) |
| `VAPID_PRIVATE_KEY` | Vercel + Supabase | No (until web-push library lands) | `send-push` |
| `OTP_TOKEN_SECRET` | Vercel | No (falls back to `SUPABASE_SERVICE_ROLE_KEY`) | `lib/otp-token.ts` |
| `DEFAULT_CUTOFF_HOUR` | Supabase | No (default 3) | `supabase/functions/process-cutoffs/index.ts` |
| `LOG_SINK` + OTLP options | Vercel | No (default `console`) | `lib/log-bootstrap.ts` |

## How to generate the secrets

```bash
# CSRF / cron / OTP secrets — 32 random bytes hex
openssl rand -hex 32

# VAPID keys (a public/private pair)
npx web-push generate-vapid-keys
```

The public half goes to `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; the
private half goes to `VAPID_PRIVATE_KEY`.

## Vercel setup

1. Project → Settings → Environment Variables.
2. Add the variables from the **Vercel section** of `.env.example`
   for each of: Production, Preview, Development.
3. `NEXT_PUBLIC_*` are read at build time; redeploy after
   changing them.
4. The non-`NEXT_PUBLIC_*` are read at runtime; no rebuild
   needed.

## Supabase setup

For each edge function:

1. Edge Functions → select the function → Settings → Secrets.
2. Add the variables from the **Supabase section** of
   `supabase/.env.example`.
3. The functions read `Deno.env.get(...)` at invocation time.

For local dev with `supabase functions serve`, the CLI
auto-loads `supabase/.env` (rename from `.env.example`).

## What's the deal with `SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL`?

They are the same value. Two names because:
- Next.js requires `NEXT_PUBLIC_*` for any variable the
  client bundle can read. The browser calls Supabase
  directly via `@supabase/ssr`, so the URL must be public.
- The Deno edge functions are a separate global scope.
  Supabase's own conventions use `SUPABASE_URL`.

Set both to the same value. The Vercel env and the
`supabase/.env` are independent files; keep them in sync.

## What's `OTP_TOKEN_SECRET` for?

The OTP gate token (the signed blob the verify-otp route
checks) is HMAC-SHA256. The HMAC key defaults to
`SUPABASE_SERVICE_ROLE_KEY` if `OTP_TOKEN_SECRET` is unset.

The default is fine for dev. In production, set
`OTP_TOKEN_SECRET` so you can rotate the service-role key
without invalidating every outstanding OTP token.

## What if I don't set the OTLP variables?

`LOG_SINK` defaults to `console`. The app writes JSON to
stdout; Vercel's log explorer captures it. Nothing else
breaks.

To wire a real aggregator, set:
```
LOG_SINK=otlp+console
LOG_OTLP_ENDPOINT=https://your-collector.example.com/v1/logs
LOG_OTLP_HEADERS={"Authorization":"Bearer xxx"}
```

(`otlp+console` keeps the human-readable line in Vercel
+ ships the OTLP-shaped envelope to a real collector.)

## What's the deal with `VAPID_SUBJECT` and `VAPID_PRIVATE_KEY`?

Web-push (Phase 9) is the planned delivery path. The
current `send-push` function is a no-op — it records
`last_success_at` and emits a structured "subscription
delivered" log line, but doesn't actually push.

Until the `web-push` library lands in the Deno bundle, you
can leave these blank. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is
required because the client reads it on every page load
to construct the subscription; without it the
PushSubscription component routes to the "Not supported
here" state.

## Cross-checks before you deploy

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set in Vercel (Production + Preview).
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Vercel.
- [ ] `SUPABASE_URL` set in Supabase (same value).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Supabase (same value).
- [ ] `CRON_SECRET` set in both, matching.
- [ ] `OTP_TOKEN_SECRET` set in Vercel.
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set in Vercel.
- [ ] VAPID pair generated and keys rotated once.
- [ ] `LOG_SINK=otlp+console` if you want a real aggregator.

If you run the e2e suite locally, you also need
`@playwright/test` installed and chromium available
(`npx playwright install --with-deps chromium`). The
suite uses placeholder Supabase env so it doesn't
require a real backend.
