# Leaderboard + Offline Track

Implemented:

- `refresh-leaderboard` scheduled Edge Function.
- Exact current streak calculation using each member's local date.
- Best streak calculation from completed daily check-in dates.
- Cohort-day completion percentage.
- Server-side projection upsert.
- Cron secret enforcement.
- IndexedDB completion outbox.
- Idempotent client event identity.
- Sequential offline replay that stops on the first failed sync.

The worker must be scheduled after Supabase secrets are configured. The outbox can be called by Today block controls when offline and flushed on reconnect.
