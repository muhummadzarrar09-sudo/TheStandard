# Discipline OS — Runbook

This is the on-call operator's guide. Keep it close to the
production deploy; everything you need to recover a partial
incident or onboard a new operator is here.

## What this is

A PWA (Next 16 + React 19 + Supabase) for a 30-day cohort
program. Members log in with a six-digit email code (no
password), see today's local-time schedule, complete
blocks, get a streak + a leaderboard rank, and chat with
their 3–4-person team. The cohort lead (admin) provisions
members, sets the per-cohort schedule cutoff, publishes
reports, and (if using the cron path) configures web-push.

## Architecture (one paragraph)

Browser → Next.js (Vercel) → Supabase Postgres via
`@supabase/ssr` (cookie session) + `@supabase/supabase-js`
(server-only service role) → RLS-protected tables. The
service worker (`public/sw.js`) does SWR caching for the
app shell + the latest 5 reports. Two Deno edge functions
(`process-notifications`, `send-push`) drain a
`notification_jobs` queue on a 5-minute cron. The log
shipper (`lib/log-sinks.ts`) is OTLP-shaped; it can be
fan-out to the Vercel log explorer + a real aggregator.

## Bootstrapping a new cohort

1. **Create the cohort in Supabase.** One row in `cohorts`
   (name, start_at, end_at, status='enrolling').
2. **Add members.** Use `/admin/members` (email-only is
   fine — role='member' is the default). The admin's
   cohort_id is set by their auth profile.
3. **Open enrollment.** `/admin/enrollment` flips the
   cohort's status to 'enrolling'; the login flow returns
   the OTP gate token only for emails in this cohort with
   status='enrolling' and an active access window.
4. **Assign teams.** `/admin/teams`. Each team is 3–4
   members, gets a name + idea + objective. Members can
   see their team room + chat the moment they're assigned.
5. **Set the schedule cutoff.** `/admin/schedule`. The
   default is 03:00 local; per-cohort overrides are stored
   in `cohort_schedule_config` and bump `schedule_version`
   on change.
6. **Publish the first report.** `/admin/reports`. Members
   get a "new report" notification if they have web-push
   enabled.

## Day-to-day ops

### Check the queue

The `notification_jobs` queue is the most common source
of "X didn't get a push" tickets. Query:

```sql
select id, user_id, category, status, attempts,
       next_retry_at, last_error
  from public.notification_jobs
 order by next_retry_at desc nulls last
 limit 50;
```

Status legend:
- `queued` — waiting for `next_retry_at <= now()`.
- `processing` — a cron tick is currently working on it.
- `sent` — done.
- `failed` — exceeded the 5-attempt cap. The last error
  is in `last_error` (a 4xx from send-push is a permanent
  error; a network blip is a transient retry).

### Web-push delivery

`send-push` is MVP. It looks up the user's
`push_subscriptions`, calls web-push for each, and disables
the subscription on a permanent failure (4xx response).
With VAPID keys not configured it just records the
`last_success_at` and moves on; the log shows a `subscription
delivered` line per attempt. Phase 9 wraps the shipper
in `lib/log-sinks.ts` for OTLP export.

### Theme / schedule overrides

Per-cohort overrides live in:
- `cohort_schedule_config` — `cutoff_hour`, `schedule_version`.
- `cohort_schedule_blocks` — the canonical block list for
  the cohort. Falls back to the hardcoded constant in
  `lib/domain/schedule.ts` if a cohort has no row.

A bump to `schedule_version` is what the SW's `?version=`
cache key would key off (Phase 9 doesn't ship the per-version
SWR; today the SW reads through and the next page load
fetches fresh).

## Incident response

### CSRF rejects in the logs

```
{
  "t": "...",
  "level": "warn",
  "msg": "csrf reject",
  "request_id": "...",
  "path": "/api/some/route",
  "reason": "no_cookie" | "no_header" | "mismatch"
}
```

`no_cookie` is normal on the first safe request; the
middleware sets the cookie. A sustained `no_header` spike
means the client fetch shim isn't loaded — check the
`CsrfBootstrap` mount in the root layout. A sustained
`mismatch` is either a stolen token (rotate `csrf` cookies
+ invalidate the user's session) or a CSRF attempt.

### Stale-content banner won't go away

The `VersionBadge` polls every 60s + on focus. If the
banner stays on, either:
- The admin republish had a `version` increment in the
  payload — check the report row.
- The user is offline and the SW is serving the cached
  page (a deliberate stale-while-revalidate behavior;
  the banner just reflects that).

### A member is locked out after too many OTP attempts

`lib/otp-lockout.ts` enforces 5 attempts per email per
10-minute window. The lockout is per-email; the
`x-cron-secret`-guarded reset path is a SQL update
(`update notification_jobs set status='sent'`) or, for
the OTP lockout, a process restart clears the in-memory
bucket.

### The "offline" indicator says "N completions pending"

`lib/offline/outbox.ts` queues block completions when the
device is offline. The indicator polls every 5s; the
queue drains on the next online event. A persistent
pending count means the requests are failing — check
`/api/schedule/complete` for the user's
response codes in the access log.

## Scheduled jobs

There are two crons in production:

| Cron | When | What | Failure mode |
|---|---|---|---|
| `process-cutoffs` | every 5 min | runs `run_cutoff_for_all_cohorts` SQL function. Marks missed blocks; updates `day_complete` in the leaderboard projection. | Silent — the function returns a count; ops watches for a drop in that count. |
| `process-notifications` | every 5 min | drains `notification_jobs` with `status='queued' AND next_retry_at <= now()`. Calls `send-push` per job. | `failed` after 5 attempts; `next_retry_at` + `last_error` recorded. |

Both require the `x-cron-secret` header. Both write
structured JSON to stdout, which the OTLP shipper (when
configured) ingests directly.

## Backup + retention

See `docs/backup-and-retention.md`. The TL;DR:
- Daily `pg_dump --format=custom` via `scripts/backup.sh`.
- 14-day local retention.
- Off-host S3 shipper via `scripts/backup-ship.sh`.
- Per-table retention rules in the doc.
