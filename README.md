# The Standard — Discipline OS v2

Clean rebuild. Same database, same env vars, auth that actually works.

## What changed from v1

The old project used a broken auth flow — magic links arrived but the callback
handler either didn't exist, got blocked by middleware, or couldn't exchange
the code for a session. This version fixes ALL of that:

- **Auth uses `@supabase/ssr`** — the official SSR cookie helper, not the
  deprecated auth-helpers-nextjs that caused redirect bugs.
- **`/auth/callback` route handler** properly calls
  `exchangeCodeForSession(code)` and redirects to `/dashboard`.
- **Middleware explicitly whitelists `/auth/callback`** — it never gets blocked.
- **`/auth/confirm` fallback handler** — handles both Supabase redirect patterns.
- **`signInWithOtp` with email** — this IS the magic link flow in the latest
  Supabase JS SDK (signInWithMagicLink was merged into signInWithOtp). The
  email contains a clickable link, not a 6-digit code.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your existing Supabase credentials (same ones from the old project).

# 3. Configure Supabase Dashboard (CRITICAL — read SUPABASE_SETUP.md)
#    - Set Site URL
#    - Add redirect URLs for /auth/callback and /auth/confirm
#    - Configure SMTP if needed

# 4. Typecheck, test, build
npm run typecheck
npm test
npm run build

# 5. Run
npm run dev
# Open http://localhost:3000
```

## Auth flow (the whole thing, end to end)

```
User enters email on /login
  → signInWithOtp({ email, options: { emailRedirectTo: '/auth/callback' } })
  → Supabase sends magic link email
  → User clicks link in email
  → Browser navigates to /auth/callback?code=XXXXX
  → /auth/callback handler: exchangeCodeForSession(code)
  → Session cookies set
  → Redirect to /dashboard
  → Dashboard server component: supabase.auth.getUser() → has user ✅
  → Profile/enrollment check → show dashboard content
```

If ANY step fails, the user gets redirected back to `/login` with an error message
explaining what happened. No silent failures, no mystery redirects.

## Repository layout

```
app/
  page.tsx                    — Landing page (public)
  login/page.tsx              — Magic link login (client component)
  auth/callback/route.ts      — THE critical auth callback handler
  auth/confirm/route.ts       — Fallback confirm handler
  (app)/layout.tsx            — Protected layout (auth + enrollment check)
  (app)/dashboard/page.tsx    — Main dashboard
  (app)/schedule/page.tsx     — Daily schedule + mark blocks complete
  (app)/streaks/page.tsx      — Streak stats
  (app)/leaderboard/page.tsx  — Cohort leaderboard
  admin/layout.tsx            — Admin layout (role check)
  admin/page.tsx              — Admin overview (cohort stats)
  api/
    auth/logout/route.ts      — Sign out
    schedule/complete/route.ts — Mark block complete
    health/route.ts           — Health check

lib/supabase/
  client.ts                   — Browser client (@supabase/ssr)
  server.ts                   — Server client (@supabase/ssr)
  admin.ts                    — Service-role client (server only)
  middleware.ts               — Session refresh helper for middleware

middleware.ts                 — Auth guard + session refresh
```

## Environment variables

Same as the old project. No new vars required:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  (or your production domain)
```

## Database

This project connects to the **same Supabase database** as v1. It uses the same
tables: `profiles`, `cohorts`, `block_completions`, `leaderboard_projection`,
`canonical_schedule_blocks`. No new migrations needed — just swap the frontend.

## What's NOT here yet (to be layered in later)

- Themes (6 presets)
- Team chat
- Push notifications
- PWA / offline support
- i18n
- Admin enrollment UI
- Cutoff processing
- Reports
- Device/session management

These can be added incrementally once auth is rock-solid.
