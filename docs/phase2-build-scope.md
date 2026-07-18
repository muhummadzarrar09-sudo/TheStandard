# Phase 2 Build Scope — Accountability Loop

Phase 2 starts after the refined Today UI foundation.

## Build order
1. Supabase project and migrations
2. Email OTP authentication with enrollment gating
3. Profiles, cohorts, device sessions
4. Schedule instances and server-authoritative block completions
5. Daily check-ins and weekly commitments
6. Streak calculation and leaderboard projection
7. Team assignment, startup idea, progress log
8. Private team chat with realtime persistence, unread counts, retry, mute, report, and admin moderation

## Definition of done
- No client-controlled score, streak, cohort, or team ownership fields.
- RLS tests cover cross-member and cross-team access.
- Two devices permitted; third login requires session revocation.
- Completion events are idempotent and auditable.
- Team chat is limited to assigned active team members.
- Private reflections never enter team chat, leaderboard projections, push payloads, or analytics.
- UI keeps the new premium Today experience and adds Team, Leaderboard, and Settings states without becoming a generic dashboard.
