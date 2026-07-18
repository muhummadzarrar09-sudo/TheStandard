# Domain Track Executed

The first server-backed domain path is now implemented:

- Canonical standard schedule in `lib/domain/schedule.ts`.
- Timezone-aware local date and cutoff handling.
- Authenticated `/api/schedule/complete` route.
- Unknown block rejection.
- Closed schedule-day rejection.
- Idempotent Supabase upsert using client event identity.
- Input validation helpers for IANA timezones and client event IDs.
- Unit tests for schedule completion, streaks, and ranking.

Run with Node 22 after dependencies are installed:

```bash
npm install
npm test
npm run typecheck
npm run build
```
