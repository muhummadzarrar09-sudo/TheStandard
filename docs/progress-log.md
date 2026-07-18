# Discipline OS Build Progress Log

## Current phase: Phase 2 — production hardening

Phase 0 (severity-1 audit fixes) and Phase 1 (severity-2 audit fixes) are
shipped. See `PHASE0_LOG.md` for the per-item record and the commits
`00b63e7` (Phase 0) and `ac00a99` (Phase 1).

## Recent completed vertical slices

- Auth middleware and server/browser Supabase clients
- Real OTP login/verification flow with enrollment gate
- Server-authoritative schedule completion endpoint
- Canonical schedule, streak, and ranking domain logic
- Offline completion outbox and replay
- Realtime/persisted team chat component with optimistic reconciliation
- Push subscription permission flow (server-persisted)
- Server-backed report/community reads
- Server-backed report detail with offline save
- Profile/theme persistence (no FOUC, sync state surfaced)
- Notification preferences schema/API (critical_block_reminder added)
- Device session list/revocation API/UI with active-session enforcement
- Daily private check-in API/UI (cutoff + access window enforced)
- Weekly commitments schema/API/UI
- Tracker 30-day history (cohort-anchored)
- Admin member/report/enrollment mutations with server guard and audit events
- Aggregate admin analytics API/UI (cohort-scoped)
- Team milestone schema/API/UI with admin-only mutation enforcement
- Cutoff processing: SQL function + Edge Function trigger
- Notification job processor + send-push scaffolding
- RLS audit-and-fix migrations: profiles self-promotion locked,
  team_messages UPDATE/DELETE policies, team_milestones column guard,
  daily_checkins DELETE denied
- `chat_moderation_events` and `team_message_reads` tables
- PWA: SW never caches /api or authenticated HTML; v2 cache names;
  inline pre-hydration theme bootstrap; offline.html fallback
- Dead code removed: lib/streaks.ts, lib/admin/guard.ts, lib/supabase.ts,
  supabase/functions/verify-otp, supabase/functions/refresh-leaderboard,
  docs/api-route-notes.ts, .config/nextjs-nodejs/

## Still remaining before paid cohort launch

- Deploy Supabase migrations/functions to staging.
- Add Vercel environment variables.
- Seed cohort/team/template data with realistic fixtures.
- Complete RLS adversarial tests in staging with two real users.
- Finish VAPID web-push library bundle and per-subscription delivery.
- Finish browser accessibility/PWA/device matrix QA.
- Add observability: request IDs, error logging endpoint, post-deploy
  health check, ops runbook.
- Define retention/deletion policy and surface it in the privacy notice.
- Lighthouse audit on the production build.

## Latest pass (Phase 1.5)

- Delete dead files, real root README, CI test/lint step.
