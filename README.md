# The Standard — Discipline OS

A 30-day execution system for a private, paid cohort. Members see a local-time
schedule, mark blocks complete, get a daily check-in, see a streak on a
consistency-first leaderboard, work in a 3–4 person team with a shared chat,
read published reports, and get a daily reminder. The whole product is gated
by email OTP against a cohort the admin provisions manually.

The product definition is `docs/discipline-community-pwa-prd.md` (the PRD).
The audit-and-refinement plan is `docs/codebase-audit-and-refinement-plan.md`.
The execution log for the severity-1 and severity-2 fixes is `PHASE0_LOG.md`.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and the
# Supabase service role + VAPID + cron secrets described in .env.example.

# 3. Typecheck, test, and build
npm run typecheck
npm test
npm run build

# 4. Apply Supabase migrations in order
#    supabase/migrations/001 through 020 (use the Supabase CLI):
supabase db push

# 5. Deploy the Edge Functions
supabase functions deploy request-otp
supabase functions deploy process-cutoffs
supabase functions deploy process-notifications
supabase functions deploy send-push
supabase functions deploy complete-block
supabase functions deploy register-device

# 6. Run the app
npm run dev
# Open http://localhost:3000
```

Node 22 is required (`engines` in `package.json`).

## Repository layout

- `app/` — Next.js App Router. `(public)` for unauthenticated routes,
  `(app)` for the member experience, `admin/` for the cohort-admin experience.
- `components/` — UI and feature components.
- `themes/` — six theme presets and the provider.
- `lib/` — Supabase, auth, domain, validation, notifications, offline
  helpers, the structured logger, the request-id context, the
  per-IP rate limiter, the API error + handler wrappers, and the
  i18n copy table.
- `supabase/` — migrations and Edge Functions. See `supabase/README.md`
  (or the comments in each function) for deploy details.
- `tests/` — Vitest unit tests for the domain layer.
- `public/` — service worker, manifest, offline fallback, icons.
- `types/` — shared TypeScript types.
- `docs/` — the PRD, phase plans, audit and refinement plan.
- `prototypes/` — disposable visual prototypes. Not part of the production
  build. Kept as a reference for the design language.

## Scripts

- `npm run dev` — Next dev server.
- `npm run build` — production build.
- `npm run start` — Next production server.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — Vitest run.
- `npm run audit:deps` — `npm audit --omit=dev`.

## Auth, RLS, and the security model

The PRD's threat model is in `docs/discipline-community-pwa-prd.md` § 8 and
§ 18. The non-negotiables:

- Supabase Auth with email OTP only (no magic links, no passwords).
- Server-side eligibility and enrollment-window checks before any code is
  sent. The `request-otp` Edge Function returns the same generic response
  for any well-formed email so an attacker cannot enumerate enrolled
  addresses.
- All member-facing tables have Row Level Security policies. The
  `is_admin()` and `is_team_member(t uuid)` helpers in
  `supabase/migrations/001_phase2_foundation.sql` are the canonical
  predicates.
- Admin operations are server-only (`requireServerAdmin` in
  `lib/admin/server-guard.ts`). The browser-side admin guard in
  `lib/admin/guard.ts` is dead and has been removed.
- The `profiles_self_update` policy and `profiles_guard_admin_fields`
  trigger (migration 007) prevent a member from promoting themselves to
  admin or rewriting their own cohort/access window.
- `team_messages` (migration 010) and `team_milestones` (migration 011)
  have explicit per-column triggers preventing privilege escalation.

Run the RLS adversarial test checklist in `supabase/tests/rls-checklist.sql`
in a staging project with two real users before launch.

## Streak and leaderboard math

`lib/domain/streaks.ts` and `lib/domain/leaderboard.ts` define the
client-displayable math. The canonical server-side computation is the
`refresh_leaderboard_for_cohort(uuid)` PL/pgSQL function in
`supabase/migrations/009_leaderboard_join_time_and_streaks.sql`. Both
implementations are tested in `tests/domain.test.ts`.

PRD semantics:

- `day_complete = 1` only when all required blocks are completed.
- Streak walks back from today. If today is not yet done, the walk skips
  it once. The first day with two missing in a row breaks the streak.
- Critical blocks are: `deep-1`, `deep-2`, `team-deep-work`, `reflection`.

## Cutoff processing

`run_cutoff_for_all_cohorts()` in
`supabase/migrations/012_cutoff_processing.sql` walks every active cohort,
every member, and inserts `block_completions.status = 'missed'` rows for
required blocks whose local cutoff has passed. The schedule template is
held in the new `canonical_schedule_blocks` table so the cutoff job and
the TypeScript `STANDARD_SCHEDULE` stay in sync. Schedule the
`process-cutoffs` Edge Function to run every 5 minutes via Vercel Cron
or pg_cron with the `CRON_SECRET` header.

## PWA / offline

The service worker is `public/sw.js` (cache version 2). It:

- Caches the app shell (login, verify, offline.html).
- Uses stale-while-revalidate for `/reports/{id}`.
- Never caches `/api/*`.
- Never caches authenticated HTML pages (anything outside the public
  path list in the SW's `isAuthenticatedHtmlPath` check).
- Surfaces update availability through the registration component.

The inline `<script>` in `app/layout.tsx` reads the saved theme from
`localStorage` and sets `data-theme` on `<html>` before React hydrates,
preventing the flash of the default theme on light presets.

## Notifications

`lib/notifications/schedule.ts` decides whether a notification should be
delivered based on the member's `notification_preferences` row and the
member's local time. Categories: `daily_reminder`, `report_alerts`,
`team_messages`, `critical_block`. Quiet hours cross midnight (e.g.
`22:00`–`06:00`) are handled correctly.

The job queue lives in `notification_jobs`. `process-notifications` drains
queued jobs whose `scheduled_at` has passed and calls `send-push` per
job. `send-push` fans out to all enabled subscriptions for the user.
Real web-push delivery (with VAPID) is a TODO inside `send-push` — the
function records `last_success_at` and disables permanently-failed
subscriptions, but the actual network send is stubbed pending the
VAPID library bundle.

## Testing

- `tests/domain.test.ts` — schedule, cutoff timezone math, streaks,
  leaderboard tie-breakers.
- `tests/auth.test.ts` — email validation, device-id plausibility.
- `tests/notifications.test.ts` — quiet hours, category gating.

Run `npm test` in CI on Node 20 and Node 22 (matrix in
`.github/workflows/ci.yml`). The RLS smoke test runs nightly against
a real Postgres instance when `SUPABASE_DB_URL` is configured as a
repo secret.

## Scripts

- `scripts/backup.sh` — daily `pg_dump` with custom format + 14-day
  local retention. See `docs/backup-and-retention.md`.
- `scripts/rls-test.sh` — runs the per-table RLS assertions in
  `supabase/tests/rls_smoke.sql` and reports pass/fail per block.

## Deployment

See `docs/vercel-deployment.md` for the full checklist. The short
version:

- Vercel: Node 22, the `vercel.json` in this repo pins the framework
  to Next.js and the build/install commands.
- Set the production domain before creating push subscriptions;
  changing origin invalidates PWA scope and subscriptions.
- Supabase Edge Function secrets are separate from Vercel variables.
- Configure a Vercel Cron or external scheduler to call
  `process-cutoffs` and `process-notifications` with `CRON_SECRET`.
- Add `/api/health` to deployment monitoring.

## Audit history

- `e71f16c` — initial codebase.
- `00b63e7` — Phase 0: 10 severity-1 fixes (RLS holes, cutoff math,
  request-otp enumeration, hardcoded UI, leaderboard, push
  subscription, device revocation, dashboard, demo-team).
- `ac00a99` — Phase 1: 17 severity-2 fixes (delete dead code, wire
  admin forms, real server auth on every API, team chat pagination
  and reconciliation, theme provider, SW hardening, cutoff worker,
  notification jobs, RLS subtable policies, Edge Function
  implementations).

See `PHASE0_LOG.md` for the per-item record with file paths.
