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
