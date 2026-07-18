# Backend Phase — Supabase Foundation

Implemented migration: `supabase/migrations/001_phase2_foundation.sql`.

It creates cohorts, profiles, devices, teams, schedule templates, completions, check-ins, team progress, team messages, reports, and curated community posts. It enables RLS and adds self/team/admin-scoped policies.

## Run locally

1. Create a Supabase project.
2. Configure email OTP template with `{{ .Token }}`.
3. Set the app URL and redirect URLs.
4. Run the migration with Supabase CLI.
5. Add a server-side eligibility function before enabling production login.
6. Add rate limits and device-cap enforcement in an Edge Function/API route; database RLS alone cannot enforce the two-device login workflow.

## Still required before production

- OTP request/verify API with enrollment-window check
- device session transaction that blocks the third device
- server-authoritative cutoff/streak job
- admin-only writes for cohort/team/report management
- push subscription table and VAPID sender
- RLS adversarial tests
