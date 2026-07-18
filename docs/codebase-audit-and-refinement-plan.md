# Discipline OS Codebase Audit & Refinement Plan

**Audit date:** 18 July 2026  
**Reference:** `docs/discipline-community-pwa-prd.md` and the supplied sitemap/folder structure  
**Verdict:** The repository contains a strong architectural prototype and substantial scaffolding, but it is **not yet a runnable production MVP**. Several screens and SQL contracts exist; critical authentication, authorization, persistence, route protection, and operational behavior are still placeholders.

## 1. Executive summary

### What is genuinely implemented

- Next.js App Router route tree exists for public, authenticated, and admin destinations.
- Vercel configuration, Node engine declaration, environment template, manifest, service-worker foundation, and Supabase migration files exist.
- Core domain tables and initial RLS policies are modeled.
- Edge Function boundaries exist for OTP, devices, block completion, cutoff processing, and push.
- Reports, community, team-room, settings, device, tracker, analytics, enrollment, member, and report-publishing UI surfaces exist.
- Six theme token presets exist, and the provider persists a selected theme.
- Phase documentation and deployment notes are present.

### What is not yet implemented in production terms

- The login/OTP screens do not call Supabase.
- Admin API routes return placeholder JSON and do not authenticate or write to Supabase.
- `requireAdmin()` uses a browser client and is not suitable as a server authorization guard.
- Authenticated routes have no middleware/layout session gate.
- Admin routes have no enforced server-side admin gate.
- Team chat UI is not connected to Supabase Realtime or persisted message history.
- Schedule completion buttons do not write to Supabase or calculate authoritative streaks.
- Cutoff processing, leaderboard projection, and push sending are comments/stubs.
- Push subscription endpoint validates input but does not persist it.
- The service worker is not registered from the production Next app.
- Report offline caching is not implemented as the PRD requires.
- The PWA manifest has no icons.
- `/reports/[id]`, `/leaderboard`, `/team`, `/profile`, and several settings surfaces are still scaffolds.
- Production admin, moderation, export, and milestone behavior is not complete.
- There are no meaningful automated unit, integration, RLS, accessibility, or browser tests.

## 2. Route and sitemap audit

| Required route | Status | Finding |
|---|---|---|
| `/` | Partial | Landing exists; no real product install guidance. |
| `/login` | UI only | Email input is not submitted to Supabase. |
| `/verify` | UI only | Code input links to dashboard; no OTP verification. |
| `/dashboard` | UI/demo | Static blocks; no real data or server session. |
| `/schedule` | UI/demo | Template cards are not persisted or admin-controlled. |
| `/tracker` | Partial | Streak display is static. |
| `/leaderboard` | Scaffold | No ranking UI/data. |
| `/team` | Scaffold | No real team data or milestone/chat integration. |
| `/community` | UI/demo | Curated cards are hardcoded. |
| `/reports` | Partial | Hardcoded report cards; no database query. |
| `/reports/[id]` | Scaffold | No report detail or offline cache behavior. |
| `/settings` | Partial | Theme selection works locally; notification preferences do not persist. |
| `/settings/devices` | UI/demo | Local state only; no session revocation. |
| `/profile` | Scaffold | No profile data or editing policy. |
| `/admin/members` | UI/API demo | Client-side member list; API is placeholder. |
| `/admin/reports` | UI/API demo | Publishing is local/placeholder. |
| `/admin/enrollment` | UI/API demo | Toggle is local/placeholder. |
| `/admin/analytics` | UI/demo | Metrics are hardcoded. |

## 3. PRD requirement audit

### P0 authentication and access

**Missing/critical:**

- Supabase server client using `@supabase/ssr`.
- Cookie-based session handling.
- `middleware.ts` route protection.
- Eligibility checks on OTP issuance and verification.
- Real OTP resend cooldown, attempt tracking, lockout, and enrollment-close invalidation.
- Session/device revocation linked to authenticated sessions.
- Generic auth errors and rate limiting at the edge.
- Admin role enforcement on every admin server action.

**Plan:** create `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `middleware.ts`, authenticated route layout, admin layout, and server-only API functions. Do not use the browser client for server authorization.

### Strict daily schedule

**Modeled but not complete:** schedule template and completion tables exist; the UI and Edge Function do not enforce the full rules.

Missing:

- Versioned template seed data.
- Schedule instance generation.
- Local date/cutoff calculation using IANA timezone.
- Required/critical/optional block semantics.
- Server-side cutoff rejection/marking.
- Offline outbox and conflict resolution.
- DST/travel/clock-skew tests.

### Tracker and streaks

Missing:

- Daily check-in persistence.
- Weekly commitments.
- Server-derived streak function.
- Best streak and cohort-day calculations.
- Excused/missed/optional distinction in UI.
- Rebuild/reconciliation job.

### Leaderboard

**Critical missing feature:** no production leaderboard UI or projection job.

Need:

- Safe derived projection only.
- Server-side ranking and tie-breaks.
- Current streak, completion percentage, completed days.
- Personal rank outside visible top list.
- Team/current-week filters.
- Privacy review and anti-gaming tests.

### Team/startup mode

Partially modeled. Missing:

- Real team assignment UI.
- Canonical idea editing with admin approval.
- Progress log persistence.
- Milestone CRUD and ownership.
- Team chat Realtime subscription/history/unread state.
- Moderation, report, mute, delete, retention.

### Community and reports

Missing:

- Admin-curated content persistence.
- Report detail rendering from database.
- Report versioning/correction flow.
- Storage/media policy.
- Cache Storage/IndexedDB report cache.
- Cache invalidation and stale-content label.
- External links with graceful failure.

### Push notifications

Missing:

- VAPID dependency and sender implementation.
- Push subscription persistence.
- User permission flow from a user gesture.
- Daily local-time scheduler.
- New-report job.
- Quiet hours/preferences.
- Invalid endpoint cleanup.
- Delivery/error telemetry.
- iOS installation guidance in the real app.

### Six presets

Partially implemented. Missing:

- Theme-aware component tokens beyond global CSS.
- Actual typography loading strategy that works offline and without external CSS.
- Per-theme density/layout component differences.
- Contrast audit for every state.
- Persisting theme server-side across devices.
- Full parity on all screens.

## 4. Security audit

### High-risk findings

1. **Admin APIs are unauthenticated placeholders.** Anyone who can reach them could receive a success response. They must require a server-validated Supabase session and admin role.
2. **`requireAdmin()` is not a server guard.** It uses the browser Supabase client and must be replaced with a server client using cookies and a service-safe role query.
3. **No middleware protection.** Authenticated and admin routes can render without a session gate.
4. **Edge functions lack complete abuse controls.** Rate limiting, attempt storage, enrollment close invalidation, and audit writes are not implemented.
5. **RLS policies need adversarial execution.** SQL exists, but no test runner or two-user staging evidence exists.
6. **Push endpoint does not persist or bind subscription to the authenticated device.**
7. **The CSV export returns an empty static header and does not authorize ownership.**

### Medium-risk findings

- Admin `role` is in `profiles`; protect role mutation and avoid client update policy touching role.
- `profiles_self_update` should explicitly restrict mutable columns rather than allowing arbitrary profile updates.
- Service worker cache needs account-scoped private data rules and cache clearing on sign-out.
- Message moderation tables/functions are incomplete in the production migration chain.
- No security headers, CSP, or explicit frame policy are configured.
- No input validation library/schema layer exists.

## 5. Dependency and build audit

Current declared versions:

- Next.js 16.2.10
- React 19.2.7
- Supabase JS 2.109.0 in `package.json` but the lock/install history has also used 2.110.7; this must be normalized.
- Supabase SSR 0.12.3
- TypeScript 7.0.2

Findings:

- The latest Supabase JS package tested required Node 22; Vercel must use Node 22.
- `@supabase/ssr` peer compatibility must be locked consistently with Supabase JS.
- `npm audit` reported two moderate vulnerabilities during the audit session; run a clean `npm audit` under Node 22 and decide each remediation.
- `npm run build` has not passed in the current Node 20 sandbox.
- `next lint` is obsolete/unreliable in the current Next setup; use ESLint explicitly with a current config.
- There is no test script, typecheck script, or CI workflow.
- There are no UI/component dependencies, schema validation library, web-push library, or test runner yet.

## 6. Code quality and architecture findings

- Most production pages duplicate the sidebar instead of using a shared authenticated layout.
- `/components` is empty despite the intended architecture.
- Theme files are consolidated in one file rather than the specified per-preset modules.
- Several pages use inline styles, reducing theme consistency and maintainability.
- Prototype HTML and production TSX still have divergent designs.
- API handlers need shared error handling, request IDs, schemas, and authorization utilities.
- `docs/api-route-notes.ts` is a TypeScript file in documentation and should be moved to a non-code note or deleted.
- The app has no loading, error, empty, offline, or unauthorized route states as a coherent system.

## 7. Revised implementation plan

### Track A — Make the app actually secure

1. Add server/browser Supabase clients.
2. Add session middleware and route groups/layout gates.
3. Replace all placeholder admin APIs with server-authenticated mutations.
4. Lock profile update columns and admin role mutation.
5. Add request schemas and rate limits.
6. Add security headers/CSP.
7. Run two-user RLS tests in a staging project.

### Track B — Make Today real

1. Seed the evidence-based schedule template.
2. Generate local schedule instances.
3. Implement server-authoritative completion transaction.
4. Implement cutoff/missed states.
5. Add offline IndexedDB outbox and replay.
6. Add daily check-in and weekly commitment models.
7. Implement streak reconciliation.

### Track C — Complete accountability

1. Build leaderboard projection job and UI.
2. Build real team assignment and progress log.
3. Build milestone CRUD with RLS.
4. Connect team chat to Realtime and persisted history.
5. Add unread/read state, rate limits, moderation, and retention.

### Track D — Complete content and retention

1. Build admin report/community publishing forms.
2. Build report detail from database.
3. Add report versioning and cache metadata.
4. Implement service-worker registration and offline report cache.
5. Implement push subscription persistence and VAPID sender.
6. Implement local-time reminder and new-report jobs.
7. Add notification preferences and iOS setup guidance.

### Track E — Production-quality design system

1. Extract shared components into `/components/ui` and feature folders.
2. Split themes into six modules plus shared semantic tokens.
3. Replace inline styles with tokens/components.
4. Make all routes theme-aware.
5. Run contrast, keyboard, zoom, reduced-motion, and screen-reader QA.
6. Add coherent loading/error/empty/offline states.

### Track F — Test, deploy, and operate

1. Add Vitest/unit tests for timezone, scoring, streaks, and idempotency.
2. Add Playwright flows for login, Today, team chat, reports, devices, and admin.
3. Add Supabase RLS SQL tests.
4. Add GitHub Actions: install, typecheck, lint, test, build.
5. Run Vercel Preview on Node 22.
6. Run Lighthouse and PWA checks.
7. Complete backup, retention, incident, support, and rollback runbooks.
8. Only then run the first paid cohort.

## 8. Definition of MVP complete

The MVP is complete only when a real staging member can:

- Request and verify an eligible OTP.
- Be blocked after enrollment closes or repeated failures.
- Log in on two devices and manage the third-device conflict.
- See a timezone-correct schedule.
- Complete blocks online and offline.
- Have missed blocks and streaks calculated server-side.
- See an accurate leaderboard.
- Enter an assigned team's progress room and chat safely.
- Receive a report notification and read the report offline.
- Change theme and notification settings.
- Sign out/revoke a device.

A real admin must be able to:

- Open/close enrollment.
- Add a member.
- Assign a team and milestone.
- Publish/correct a report.
- Moderate team chat.
- Inspect aggregate cohort health.
- Export only authorized data.

No placeholder response, local-only state, client-only permission, or hardcoded metric satisfies these criteria.
