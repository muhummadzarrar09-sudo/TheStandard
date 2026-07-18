# Phase 2 Completion Checklist

## Implemented workspace foundations

- Supabase schema migration 001
- Derived leaderboard, audit, push, and notification tables in migration 002
- OTP request function with generic responses and eligibility gate
- OTP verification function
- Two-device registration function with explicit third-device conflict
- Idempotent block completion function
- Scheduled cutoff job boundary
- Push sender boundary with secret isolation
- Admin write policies for cohort/team/schedule/content operations
- RLS adversarial test checklist

## Production hardening still required before declaring launch-ready

- Configure Supabase secrets and deploy Edge Functions
- Add transactional device revocation endpoint and session token invalidation strategy
- Implement cutoff worker logic against versioned schedule blocks
- Implement streak/leaderboard projection worker and tie-break rules
- Add VAPID web-push library and delivery response cleanup
- Add notification preference/quiet-hour tables and enforcement
- Add request rate limiting at Edge/hosting layer
- Add audit logging to every admin mutation
- Run the RLS checklist with two real staging users
- Add integration tests for OTP expiry, enrollment close, duplicate events, timezone/DST, offline replay, and third-device conflicts
- Perform dependency/security scan and review Supabase policies before production
