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
