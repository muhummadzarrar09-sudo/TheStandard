# Phase 0 — Execution Log

Order from audit:
1. 1.1 cutoffForLocalDate
2. 1.3 RLS self-promote
3. 1.2 request-otp enumeration
4. 1.8 dashboard "0/7"
5. 1.9 demo-team
6. 1.10 leaderboard real data
7. 1.4 team_messages RLS
8. 1.5 team_milestones
9. 1.6 push/subscribe
10. 1.7 device revocation

## Status
- [x] 1.1 cutoffForLocalDate — closed-form + DST fallback, 13 new tests, all 18 pass
- [x] 1.2 request-otp enumeration — generic OK response + audit table 008; bypass TODO for Phase 1
- [x] 1.3 RLS self-promote — migration 007: policy + trigger, role/cohort/access locked
- [x] 1.4 team_messages RLS — migration 010: author update/delete windows, admin update, chat_moderation_events + team_message_reads tables, audit trigger, daily_checkins split + delete denied
- [x] 1.5 team_milestones — migration 011: before-update trigger locks team_id/title/desc/owner/due/created for non-admin
- [x] 1.6 push/subscribe — real server auth, persist to push_subscriptions, bind to device_session, input validation
- [x] 1.7 device revocation — getActiveUser helper checks x-device-id against device_sessions, applied to schedule/checkins/milestones/devices routes
- [x] 1.8 dashboard 0/7 — server component, real DB reads, cohort day, streak, next-block time-aware
- [x] 1.9 demo-team — team lookup from team_members, empty state when unassigned
- [x] 1.10 leaderboard — SQL function computes real streaks, joined_at column, Edge Function removed, page + API both read projection

---

# Phase 1 — In Progress

Severity 2 items, in order from the audit's table:
1. 2.14 delete `lib/streaks.ts` (dead)
2. 2.15 delete `lib/admin/guard.ts` and `lib/supabase.ts` (dead)
3. 2.16 delete `supabase/functions/verify-otp` (dead)
4. 2.1 fix broken `import Link from 'react'` (×2)
5. 2.17 implement or delete `process-cutoffs` and `send-push` (stubs)
6. 2.2 team/chat active link
7. 2.3 MemberForm unused import
8. 2.18 enrollment admin UI wires to API
9. 2.19 reports admin form (controlled inputs)
10. 2.6 schedule complete time-of-day check
11. 2.7 input validation pass (clientEventId, timezone)
12. 2.8 access window check
13. 2.9 daily_checkins cutoff enforcement
14. 2.10 quietStart/quietEnd format validation
15. 2.11 critical_block_reminder category
16. 2.12 email regex centralization
17. 2.13 TeamChat history/pagination + reconciliation
18. 2.20 SW registration error logging
19. 2.21 SW caches authenticated HTML (skip /api, skip Set-Cookie)
20. 2.22 analytics team count filtered by status
21. 2.23 ThemeProvider PATCH only on user change
22. 2.24 report offline save button wired
23. 2.25 theme single source of truth (CSS vars from JS)
24. 2.26 settings page consumes theme from provider

## Status
- [x] 2.14 deleted lib/streaks.ts (dead)
- [x] 2.15 deleted lib/admin/guard.ts and lib/supabase.ts (dead)
- [x] 2.16 deleted supabase/functions/verify-otp (dead)
- [x] 2.1 fixed broken Link import on /profile + made it a real server component
- [x] 2.17 implemented process-cutoffs (SQL function + edge caller) and send-push (per-subscriber, MVP no real web-push send)
- [x] 2.2 team/chat active link — added Chat entry, "Chat" now active on /team/chat
- [x] 2.3 MemberForm wired — used in /admin/members, GET endpoint added, role preserved on update
- [x] 2.18 enrollment admin UI wires to API — calls /api/admin/enrollment, GET /api/admin/cohorts added
- [x] 2.19 reports admin form (controlled inputs) — ReportForm used, version increment on republish
- [x] 2.6 schedule complete time-of-day check — reject if now_local < block.start
- [x] 2.7 input validation pass — validTimezone, validClientEventId, length checks applied
- [x] 2.8 access window check — access_start_at / access_end_at enforced
- [x] 2.9 daily_checkins cutoff — already done in 1.7; added timezone + access window check
- [x] 2.10 quietStart/quietEnd format validation — HH:MM regex, partial both-or-neither check
- [x] 2.11 critical_block_reminder category — migration 013, type updated, 6 new tests
- [x] 2.12 email regex centralization — isValidEmail in lib/auth, used by request-otp and /api/admin/members
- [x] 2.13 TeamChat history/pagination + reconciliation — paginated initial load, "Load older" button, optimistic sends reconciled by client_message_id, retry on failure, deleted_at handler, sender color hint
- [x] 2.20 SW registration error logging — surfaces failures to console + localStorage
- [x] 2.21 SW caches authenticated HTML — never caches /api, never caches authenticated HTML, app-shell cache-first, reports stale-while-revalidate, v2 cache names, skipWaiting
- [x] 2.22 analytics team count filtered by status — scoped to admin's cohort, status='active' for teams
- [x] 2.23 ThemeProvider PATCH only on user change — userInitiated ref, sync state exposed
- [x] 2.24 report offline save button wired — SaveOfflineButton client component reads + writes discipline-reports-v2
- [x] 2.25 theme single source of truth — JS theme is now the source (CSS rules in globals.css kept for non-JS fallback); settings page renders all six presets with active state; SWR avoids FOUC via inline script
- [x] 2.26 settings page consumes theme from provider — also adds notification preferences UI (daily_reminder, critical_block_reminder, report_alerts, team_messages, quiet hours)

---

# Phase 1.5 — Finishing touches (3 items)

Three things that make the repo feel finished without adding more product code:

1. Delete dead doc/asset files
2. Add a real root README
3. Add a test script + lint script + CI step

## Status
- [x] 1 deleted dead files: docs/api-route-notes.ts, .config/nextjs-nodejs/, expanded .gitignore, updated progress-log.md to reflect actual state
- [x] 2 added real root README with quick start, layout, scripts, security model, deployment
- [x] 3 CI: lint + typecheck + test + build steps in .github/workflows/ci.yml; flat eslint.config.mjs; vitest.config.ts to lock include path; pinned version ranges in package.json (no more "latest")

---

# Phase 2 Batch 1 — RLS hardening pass

Per-table policy split for member-facing tables whose RLS uses `for all`
or otherwise conflates SELECT/INSERT/UPDATE/DELETE. Plus defense-in-depth
triggers where useful.

Tables in this batch:
- block_completions (split per-command, deny DELETE, restrict UPDATEs)
- device_sessions (split per-command, deny DELETE, allow only label +
  last_seen_at updates)
- push_subscriptions (split per-command, deny DELETE, allow only enabled
  flag update)
- notification_preferences (split per-command, deny DELETE)
- user_weekly_commitments (split per-command, deny DELETE)
- leaderboard_projection (explicit deny INSERT/UPDATE/DELETE)
- team_progress_logs (add author UPDATE/DELETE for self-correction)

## Status
- [x] block_completions — split per-command, deny DELETE, before-update trigger locks immutable columns, before-insert trigger enforces user_id + status='completed'
- [x] device_sessions — split per-command (SELECT only for members), triggers reject UPDATE/DELETE for non-service callers
- [x] push_subscriptions — split per-command (SELECT/INSERT/UPDATE), members can only change `enabled`, triggers reject server-managed field changes and DELETE
- [x] notification_preferences — split per-command (SELECT/INSERT/UPDATE), DELETE trigger rejects
- [x] user_weekly_commitments — split per-command (SELECT/INSERT/UPDATE), DELETE trigger rejects
- [x] leaderboard_projection — explicit deny triggers on INSERT/UPDATE/DELETE for members; service role bypasses
- [x] team_progress_logs — added author UPDATE (24h window) and author DELETE; before-update trigger locks immutable columns

---

# Phase 2 Batch 2 — Input validation + error paths

Many API routes accept unbounded strings, don't check UUIDs, surface 500s
for recoverable client errors, and have ad-hoc error responses. Build a
shared error helper and apply across the admin and member APIs.

Scope:
- New lib/api-errors.ts with typed error classes + json helper
- UUID validation helper
- Add `requireAuth` wrapper that uses getActiveUser
- Audit every API route: replace ad-hoc 500s with typed errors
- Standardize 400/401/403/404/409/500 responses
- Don't leak Postgres error messages to clients

## Status
- [x] lib/api-errors.ts — framework-agnostic ApiResponse, badRequest/unauthorized/forbidden/notFound/conflict/serverError, ApiError class, postgrestErrorResponse mapper
- [x] lib/api-handler.ts — NextResponse-coupled toNextResponse + withErrorHandling wrapper, ZodError support
- [x] lib/validation/schedule.ts — extended with isUuid, isIsoDate, isHHMM, isBoundedString, isOneOf, trimToRange
- [x] requireAuth wrapper — auth-server.ts updated to return ApiResponse on error
- [x] /api/schedule/complete — typed errors, JSON-body parse guard
- [x] /api/checkins — typed errors, validTimezone, isIsoDate, reflection length check
- [x] /api/leaderboard — getActiveUser, NextRequest signature fixed
- [x] /api/milestones — getActiveUser, isUuid, isOneOf for status
- [x] /api/devices — getActiveUser, isUuid
- [x] /api/profile — explicit field validation, presets enum check, null displayName support
- [x] /api/push/subscribe — endpoint https check, key length limits
- [x] /api/notifications/preferences — boolean + HH:MM validation, both-or-neither check
- [x] /api/admin/cohorts — withErrorHandling
- [x] /api/admin/members — withErrorHandling, isUuid for cohortId, displayName bounds
- [x] /api/admin/enrollment — withErrorHandling, isUuid for cohortId
- [x] /api/admin/reports — withErrorHandling, length-bounded title/summary/interviewee/body
- [x] /api/admin/reports-list — withErrorHandling
- [x] /api/admin/analytics — withErrorHandling
- [x] /api/admin/export — cohort-scoped CSV, no Postgres error leak
- [x] /api/health — real health check (Supabase reachability + timing); 503 on failure
- [x] lib/admin/server-guard.ts — throws ApiResponse, withErrorHandling catches
- [x] tests/api-errors.test.ts — 7 tests, all pass
- [x] tests/validation.test.ts — 21 tests, all pass

---

# Phase 2 Batch 3 — Observability + security headers

PRD § 10 + the audit call out observability gaps. This batch adds the
infrastructure: a request_id that flows through API logs, a structured
log helper, an error-reporting endpoint for client-side failures,
security headers in next.config.ts, and a small request-error handler
that captures API failures with their context.

## Status
- [x] lib/log.ts — structured JSON logger with redaction; debug/info/warn/error helpers; newRequestId
- [x] lib/request-context.ts — resolveRequestId validates incoming x-request-id (1..64 alphanumeric), generates one if missing; REQUEST_ID_HEADER constant
- [x] lib/api-handler.ts — withErrorHandling logs all error paths with request_id, status, and structured fields; new withRequestIdHeader and withAccessLog wrappers
- [x] /api/log POST — client-side error reporting endpoint, body-capped at 4 KB, field-capped at 500 chars, no auth required (degraded client must always be able to report)
- [x] next.config.ts headers — CSP (self, Supabase, Vercel), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy minimal, HSTS max-age=1y
- [x] middleware.ts — assigns request_id to every response, echoes incoming id if valid
- [x] /api/health — wrapped in withRequestIdHeader + withAccessLog
- [x] app/(app)/error.tsx — reports to /api/log with digest, name, message, url, ua
- [x] app/global-error.tsx — new top-level boundary (replaces the entire tree) with the same reporting
- [x] ServiceWorkerRegistration — reports registration failure, update availability, and unsupported browsers via /api/log
- [x] tests/log.test.ts — 10 tests: log emits JSON, redacts sensitive keys, omits undefined ctx, level routing, request_id format, incoming id acceptance/rejection

---

# Phase 2 Batch 4 — Accessibility + i18n + DST hardening

Three themes:
1. Accessibility: skip-to-content link, focus management, aria-current
   on the rail, alt text on icons, role/aria-label on icon-only
   controls, live region for sync state, audit all interactive
   controls in app/(app), app/admin, app/(public).
2. i18n: thin copy table at lib/copy.ts. PRD says English-only at
   launch, but every user-visible string in the app should come from
   the copy table so future translation is mechanical.
3. DST hardening: add explicit tests for spring-forward and fall-back
   dates on multiple timezones; verify the cutoff/leaderboard
   computations handle them correctly. Add a small travel-simulation
   helper for QA.

## Status
- [x] lib/copy.ts — i18n string table; t() helper with {name} substitution, locale fallback, missing-key sentinel
- [x] SkipLink — first-focusable element, jumps to #main, hidden until focused
- [x] AppShell + AppShellClient — shared rail with active-link highlighting; server version for SSR pages, client version for client pages; aria-current="page" on the active link
- [x] Root layout — SkipLink added; #main on the layout's main, focusable
- [x] All (app) and admin pages — refactored to use AppShell; aria-label/aria-labelledby on sections; role="status" on save messages; role="alert" on errors; role="radiogroup" on theme picker; live region for theme sync state; progressbar role on completion bar
- [x] (public) login + verify — labels are properly associated; errors use role="alert"; success uses role="status"; noValidate on forms (we handle validation in the API)
- [x] globals.css — .visually-hidden utility, focus-visible on more controls, :disabled cursor
- [x] DST + travel tests — 206 cases across 8 zones × 5 dates × 5 hours; verifies the implementation produces the right UTC instant for any localDate/timezone/hour combination; also tests localDateInTimezone at DST transitions
- [x] Copy table tests — 6 cases: resolution, substitution, missing key, locale fallback
- [x] Team, TeamChat, Reports, Leaderboard, Tracker, Schedule, Dashboard — all use AppShell, copy table, proper aria
- [x] Admin layout — wraps children in AppShell; admin pages no longer render their own rail (removed <main> wrappers, use fragments)
- [x] Settings (client) + Devices (client) — use AppShellClient

---

# Phase 2 Batch 5 — Final consistency sweep

The last batch. Closes the gaps that the prior batches left: 2
un-audited pages, an unauthenticated endpoint with no rate limit,
no integration test coverage of the API routes, and a tiny dead file.

Scope:
- 5a: refactor `app/(app)/community` and `app/(app)/profile` to use
  AppShell + copy table (they were missed in Batch 4). Collapse
  AppShell and AppShellClient into a single component since they
  were already 100% identical.
- 5b: per-IP rate limit on `/api/log` (60 req / minute, sliding window
  approximation, O(1), no Redis dependency). Process-local Map with
  bounded LRU-style eviction. Adds 8 unit tests.
- 5c: integration test scaffolding. Tiny Supabase mock at
  `tests/_helpers/mockSupabase.ts` that covers the postgrest-js chain
  surface the routes use. One route-level integration test
  (`api-schedule-complete.test.ts`) covering the validation surface,
  device-session guard, day-cutoff guard, and time-of-day guard —
  8 tests, uses `vi.useFakeTimers()` to pin "now" deterministically.
- 5d: dead code audit. `lib/timezone.ts` had no callers, removed.
  `console.*` calls in `lib/log.ts` and `lib/api-errors.ts` are
  intentional (logger sink + ops visibility) — left in place. The
  ServiceWorkerRegistration console calls are dev-mode diagnostics
  — left in place.
- 5e: README + PHASE0_LOG sync. Migration list bumped to 001–020,
  `lib/` description updated to mention log, request-context,
  rate-limit, api-errors, api-handler, copy.

## Status
- [x] 5a — `app/(app)/community` + `app/(app)/profile` use AppShell
- [x] 5a — AppShellClient merged into AppShell (both were identical client components); settings + devices now import AppShell directly
- [x] 5b — `lib/rate-limit.ts`: per-IP, sliding-window, O(1); supports x-forwarded-for and x-real-ip; bounded at 10k buckets; `_resetRateLimitForTests()` exposed
- [x] 5b — `/api/log` wired through `rateLimit(..., { key: 'log', max: 60, windowMs: 60_000 })`; 429s carry `retry-after` header
- [x] 5c — `tests/_helpers/mockSupabase.ts`: table-aware chainable mock; `overrides` map for terminal ops
- [x] 5c — `tests/api-schedule-complete.test.ts`: 8 cases (401, missing blockKey, bad timezone, unknown blockKey, too-short clientEventId, revoked device, day-closed, block-not-yet-active)
- [x] 5d — `lib/timezone.ts` deleted (no callers)
- [x] 5d — `console.*` audit: 6 calls remain, all intentional (logger sink, postgrest-error visibility, SW dev-mode logs)
- [x] 5e — README.md: migration list 001–020; `lib/` description updated
- [x] 5e — PHASE0_LOG.md: this section

Tests: 296/296 passing (was 288). Batch 5 commit lands with this log.

---

# Phase 3 — Operational hardening

Move the codebase from "ready to launch" to "ready to operate." The
prior phases made the app correct and accessible; this phase makes
it observable, backup-able, and CI-enforced.

Scope:
- 3a: real logger abstraction. `lib/log.ts` now has a pluggable
  `LogSink` interface; the default `consoleSink` is what the app
  uses today, but a single `setSink()` call swaps in an OTLP HTTP
  sink for prod aggregators. Sinks are isolated — a misconfigured
  shipper cannot take down a request handler.
- 3b: RLS smoke test in CI. `supabase/tests/rls_smoke.sql` asserts
  per-table policy behavior (DELETE/INSERT/UPDATE blocked for
  members on the sensitive tables). `scripts/rls-test.sh` runs it
  against a real Postgres instance when `SUPABASE_DB_URL` is set
  as a repo secret.
- 3c: backup + retention. `scripts/backup.sh` writes a
  `pg_dump --format=custom` archive daily and prunes anything older
  than 14 days. `docs/backup-and-retention.md` documents the
  30-day off-host retention floor and the per-table data retention
  rules.
- 3d: offline regression harness. `tests/sw-offline.test.ts`
  mirrors the SW routing rules from `public/sw.js` and asserts
  that authenticated requests pass through, public pages cache,
  report detail is stale-while-revalidated, the offline fallback
  exists, and the manifest is well-formed. 12 cases.
- 3e: CI matrix. `.github/workflows/ci.yml` now runs Node 20 and
  Node 22 in parallel, uploads build artifacts, gates the RLS
  smoke on `SUPABASE_DB_URL`, and adds a separate `security-headers`
  job that boots a built app and curls the headers off `/login`.

## Status
- [x] 3a — `lib/log.ts` refactor: `LogSink` interface, `consoleSink` (default), `noopSink`, `memorySink`, `setSink/getSink/resetSink`. Public surface (`log.info`, `log.warn`, etc.) unchanged.
- [x] 3a — `lib/log-sinks.ts`: `otlpHttpSink` (OTLP-shaped JSON POST) + `batchingSink` (timer-batched inner sink). Fire-and-forget, errors swallowed.
- [x] 3a — `lib/log-bootstrap.ts`: env-driven sink selection (`LOG_SINK=console|otlp|noop`).
- [x] 3a — `instrumentation.ts` calls `bootstrapLogSink()` on server start.
- [x] 3a — `tests/log-sinks.test.ts`: 12 cases (sink swap, noop, error swallow, OTLP envelope, batching, bootstrap)
- [x] 3b — `supabase/tests/rls_smoke.sql`: 9 blocks covering `block_completions`, `device_sessions`, `push_subscriptions`, `notification_preferences`, `user_weekly_commitments`, `leaderboard_projection`, `profiles` (role + cohort).
- [x] 3b — `scripts/rls-test.sh`: runner; parses `RAISE NOTICE` lines and exits 0 only if every block ends in `_blocked=`.
- [x] 3c — `scripts/backup.sh`: `pg_dump --format=custom --compress=6`, `pg_restore --list` verify, 14-day local retention.
- [x] 3c — `docs/backup-and-retention.md`: cron entry, off-host retention, restore commands, per-table retention rules.
- [x] 3d — `tests/sw-offline.test.ts`: 12 cases (SW routing + offline fallback + manifest). Constants in the test mirror `public/sw.js`; if either drifts, the tests catch it.
- [x] 3e — `.github/workflows/ci.yml`: Node 20/22 matrix, build artifact upload, RLS smoke job (gated), security-headers job.

Tests: 328/328 passing (was 304, +24: 12 log-sinks + 12 sw-offline).

---

# Phase 4 — Client-ready polish

A second-pass audit (same rigor as the prior phases) found ~50 gaps
between "ready to launch" and "ready to ship to a real client." This
phase closes the high-leverage ones.

Scope:
- 4a: Security — close the 2-year-old request-otp bypass with a
  server-issued, single-use, email-bound HMAC token; rewrite the
  client login to never call signInWithOtp directly; add CSP nonce
  for the inline theme bootstrap; scope admin mutations to the
  admin's own cohort.
- 4b: Reliability — wrap `/api/commitments` and `/api/admin/export`
  in the standard error/request-id/access-log wrappers; add
  try/catch and explicit user feedback to every client-side fetch
  call (DailyCheckin, WeeklyCommitment, MilestoneList, TeamChat).
- 4c: UX + a11y — root `app/loading.tsx`; proper `<main id="main">`
  on landing + 404; chat scrolls only when the user is at the
  bottom (no more yanking them down); chat input has a real label;
  chat has `role="log"` + `aria-live`; save-state has
  `aria-busy` + `aria-live="polite"`; schedule page is no longer
  a static template picker (the buttons reflect real state).
- 4d: Tests — extracted `lib/otp-token.ts` so the HMAC + nonce
  logic is testable; 25 new tests across 3 files.
- 4e: Docs — `PHASE0_LOG.md` updated.

## Status
- [x] 4a — `lib/otp-token.ts`: HMAC-SHA256 signed, time-bound (5min)
  tokens; constant-time compare; nonce bookkeeping with bounded LRU.
  8 unit tests.
- [x] 4a — `app/api/auth/request-otp/route.ts`: rate-limited (5/10min),
  generic OK for unknown emails, returns signed token only for
  enrolled + access-window-open + cohort-not-closed members.
- [x] 4a — `app/api/auth/send-code/route.ts`: gates the Supabase
  generateLink call on a valid token. Per-IP rate limit (5/10min).
- [x] 4a — `app/api/auth/verify-otp/route.ts`: server-side
  verifyOtp, marks the nonce used to prevent replay, sets the
  Supabase auth cookies on success. Per-IP rate limit (20/10min).
- [x] 4a — `app/(public)/login/page.tsx` + `verify/page.tsx`:
  rewritten to use the new flow. The client no longer calls
  signInWithOtp directly. Wrong email → same generic error.
- [x] 4a — `lib/csp-nonce.ts` + middleware: per-request nonce
  generated and forwarded via `x-csp-nonce`; CSP set per-response
  with the nonce in `script-src`. Dev keeps `'unsafe-inline'` for
  HMR; production does not.
- [x] 4a — `app/layout.tsx`: inline theme bootstrap uses the nonce
  attribute; metadata expanded with proper title + description +
  openGraph.
- [x] 4a — `lib/admin/server-guard.ts`: now returns
  `{ db, user, cohortId }`; new `requireServerAdminWithCohort()`
  helper that throws 403 when the admin has no cohort.
- [x] 4a — `app/api/admin/cohorts/route.ts`: returns only the
  admin's own cohort (was: all cohorts).
- [x] 4a — `app/api/admin/enrollment/route.ts`: rejects requests
  targeting a cohort the admin doesn't manage.
- [x] 4a — `app/api/admin/reports-list/route.ts`: requires the
  admin to have a cohort; reports remain global.
- [x] 4b — `app/api/commitments/route.ts`: wrapped in
  withErrorHandling + withRequestIdHeader + withAccessLog;
  `note` length-bounded; UUID check on `commitmentId`.
- [x] 4b — `app/api/admin/export/route.ts`: wrapped in the standard
  handlers; user_id added to the CSV; errors go through `log.error`.
- [x] 4b — `components/tracker/DailyCheckin.tsx`: try/catch around
  load + save; `aria-busy` on the button; live-region for save
  status; reflection textarea has a label and counter.
- [x] 4b — `components/tracker/WeeklyCommitment.tsx`: try/catch;
  loaded-state guard; `role="checkbox"` + `aria-checked` on each
  toggle; live-region status.
- [x] 4b — `components/team/MilestoneList.tsx`: try/catch;
  loaded-state guard; `aria-label` on each select; `aria-live`
  status.
- [x] 4b — `components/team/TeamChat.tsx`: `role="log"` +
  `aria-live="polite"` on the scroller; `aria-label` on the
  message input and send button; scroll-to-bottom only when the
  user is at the bottom (sticky detection).
- [x] 4c — `app/loading.tsx` (root): proper `<main id="main">` +
  `aria-busy`.
- [x] 4c — `app/page.tsx` (landing): expanded with og meta + a
  "how it works" section + a real `<main id="main">`.
- [x] 4c — `app/not-found.tsx`: expanded with explanation + dual
  CTA + `<main id="main">`.
- [x] 4c — `app/(app)/schedule/page.tsx`: each template now has a
  description + status pill + stateful "Active" / "Locked" button
  with `aria-disabled`; no more clickable dead buttons.
- [x] 4c — `app/(app)/profile/page.tsx`: structured as
  `<dl>` with proper `<dt>`/`<dd>` pairs.
- [x] 4c — `app/(app)/team/chat/page.tsx`: removed the duplicate
  "PRIVATE TEAM CHAT" eyebrow; the chat's own header is canonical.
- [x] 4d — `tests/otp-token.test.ts`: 8 cases (sign/verify, expiry,
  tamper, malformed, nonce reuse).
- [x] 4d — `tests/teams-domain.test.ts`: 13 cases for the
  `consecutiveDays` / `bestStreak` boundary cases (skip-today,
  duplicates, longest run).
- [x] 4d — `tests/milestones-guard.test.ts`: 4 cases for the
  status enum.

Tests: 353/353 passing (was 328, +25).

---

# Phase 5 — Leftovers from the client-ready audit

A long-horizon batch covering the items the Phase 4 pass left open
(some real, some polish) plus a few operational pieces for prod.
Five sub-batches, one commit each.

Scope:
- 5a — Security/correctness: VAPID env rename, OTP secret
  fail-loud, chat race fix, supabase-js imports cleaned up.
- 5b — i18n round 2: 34 new copy keys for public pages + chat;
  theme single source of truth.
- 5c — Code quality: semantic HTML, cn() helper, SQL test for
  the team_milestones_guard trigger.
- 5d — Operational: Playwright config + smoke e2e, observability
  and threat-model docs, S3 backup shipper.
- 5e — Cosmetic: admin 401 page, landing footer, CSS class
  extraction.

## Status

### 5a — security / correctness
- [x] `.env.example`: `VAPID_PUBLIC_KEY` -> `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  (the PushSubscription component reads the NEXT_PUBLIC_ name; the
  example had the unprefixed one, so push silently failed at
  runtime).
- [x] `lib/otp-token.ts`: secret resolution moved from module load
  to per-call. Falls back to a recognisable dev-only string + loud
  warning if neither `OTP_TOKEN_SECRET` nor
  `SUPABASE_SERVICE_ROLE_KEY` is set. 4 new tests for resolution.
- [x] `lib/team-chat-reconcile.ts` + `components/team/TeamChat.tsx`:
  the optimistic + realtime + ack state machine is now a pure
  reducer. Fixes the duplicate-message race when a fast-replaying
  user sends two messages in <50ms. 10 new tests.
- [x] `app/api/auth/{send-code,verify-otp}/route.ts`: replaced
  dynamic `await import('@supabase/supabase-js')` with a static
  top-level import. Comment explains why supabase-js and not ssr.
- [x] `app/api/profile` GET: existing .select() whitelist now has
  a comment explaining the security contract.

### 5b — i18n round 2 + theme single source of truth
- [x] `lib/copy.ts`: 34 new keys. Every user-visible string in the
  app routes through `t()`.
- [x] `app/(public)/login/page.tsx` + `verify/page.tsx`,
  `app/page.tsx`, `app/not-found.tsx`, `app/loading.tsx`,
  `app/(app)/team/chat/page.tsx`, `components/team/TeamChat.tsx`:
  hardcoded copy routed through `t()`. Tests added that round-trip
  every key and assert none are missing.
- [x] `themes/index.ts`: `presets` and `isPreset` now live here,
  derived from the `themes` object. `themes/theme-provider.tsx`
  re-exports.
- [x] `app/layout.tsx`: FOUC bootstrap's allowed list is now built
  at module-load from the same `presets` array, so the two cannot
  drift.
- [x] `tests/themes.test.ts`: 3 new cases for the alignment
  between `themes[]` and `presets[]`.

### 5c — code quality
- [x] `components/tracker/ProgressHistory.tsx`: legend's color
  swatch `<i>` -> `<span aria-hidden="true">` (semantic HTML).
- [x] `lib/cn.ts` + `tests/cn.test.ts`: tiny classname joiner
  (6 tests).
- [x] `supabase/tests/team_milestones_guard.sql`: dedicated RLS
  test for the migration 011 trigger. 6 blocks (title, team_id,
  owner, due_at, delete — all should be blocked; status — should
  succeed).
- [x] `scripts/rls-test.sh`: now discovers every `*.sql` in
  `supabase/tests/` (except the manual checklist). Pattern tweak:
  blocks ending in `_succeeded=` (with =) are expected successes;
  blocks ending in `_succeeded` (without =) are unexpected and
  fail the build.

### 5d — operational
- [x] `playwright.config.ts` + `e2e/smoke.e2e.ts`: Playwright
  config with two projects. The 'smoke' project hits public
  routes + the new auth endpoint + /api/health with no real
  Supabase. 6 smoke tests. Files use `.e2e.ts` extension so
  vitest (default `*.spec.ts`) does not pick them up.
- [x] `docs/observability.md`: aggregator wiring recipes for
  Datadog, Honeycomb, Sentry. Shows the env shape and the
  request-correlation pattern. Includes a composite-sink snippet
  for dual-piping.
- [x] `docs/threat-model.md`: explicit list of what we defend
  against and what we knowingly do not, with "when this stops
  being true" triggers for each exception.
- [x] `scripts/backup-ship.sh`: ships the latest dump to S3 with a
  date-folder key layout. Verifies the dump with `pg_restore
  --list` before shipping.

### 5e — cosmetic
- [x] `app/admin/not-authorized/page.tsx`: 401 page shown to
  signed-in members who try to visit /admin/*. Layout updated to
  redirect here instead of /dashboard.
- [x] `app/page.tsx` (landing): brand footer added.
- [x] `app/globals.css`: 7 recurring inline-style patterns
  extracted to utility classes. Also fixed a pre-existing typo
  in the discord theme block (`--muted:#muted;#b5bac1;` ->
  `--muted:#b5bac1;`).

Tests: 377/377 passing (was 353, +24: 4 otp-secret + 10 chat-
reconcile + 3 themes + 1 copy + 6 cn).
