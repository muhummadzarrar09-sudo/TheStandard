# Backup & retention

## Daily database backup

`scripts/backup.sh` runs `pg_dump` against the Supabase Postgres
direct connection and writes a compressed custom-format dump to
`$BACKUP_DIR`. Custom format is used (not plain SQL) because:

- It is ~5x smaller at the same compression level.
- `pg_restore` can selectively load specific tables or schemas
  from a single dump, which is useful when recovering a single
  corrupted table without nuking the rest.
- Parallel restore is supported (`pg_restore -j N`) for large DBs.

### Cron entry

```
SUPABASE_DB_URL=postgres://postgres:...@db.<ref>.supabase.co:5432/postgres
BACKUP_DIR=/var/backups/discipline-os
BACKUP_KEEP_DAYS=14

0 3 * * * /opt/discipline-os/scripts/backup.sh >> /var/log/discipline-os-backup.log 2>&1
```

### Retention

- Local: `BACKUP_KEEP_DAYS` (default 14) of daily dumps are kept on
  the backup host.
- Off-host: ship the dumps to S3 / GCS / B2 with a 30-day lifecycle
  policy. The 30-day mark is the absolute floor for the
  cohort-window — the longest cohort is 30 days, so a month of
  backups covers any single cohort's full lifecycle.
- Off-region: replicate the S3 bucket cross-region. Supabase
  already replicates the live DB cross-region; backups are the
  point-in-time safety net for accidental writes, not for region
  failure.

### Restore

Full restore:

```
pg_restore --clean --if-exists --dbname="$SUPABASE_DB_URL" \
  /var/backups/discipline-os/discipline-os-2026-01-15.dump
```

Selective restore (one table only):

```
pg_restore --dbname="$SUPABASE_DB_URL" --table=public.team_messages \
  /var/backups/discipline-os/discipline-os-2026-01-15.dump
```

Always run a test restore into a scratch database before pointing
production at a backup. The script `pg_restore --list <file>` is a
quick sanity check; the full test should be a `supabase db reset`
followed by a restore.

## Application data retention

- Client error reports (`/api/log`) are capped at 4 KB per
  request, 500 chars per field, and no auth is required so a
  degraded client can always report. Logs older than 30 days are
  pruned by the aggregator's own retention (Datadog 30d, Honeycomb
  60d, Sentry 90d — pick one and document it).
- Push subscriptions that have not received a successful delivery
  in 30 days are auto-disabled by `send-push` and pruned by a
  weekly Supabase scheduled function.
- Device sessions that have not had `last_seen_at` updated in 60
  days are auto-revoked by a weekly scheduled function (see
  `supabase/migrations/` for the function name; if missing, the
  cron entry is in `docs/runbook.md`).
- Reports, milestones, and team_messages are *not* pruned — they
  are the product. Cohort-end purges are not part of the launch
  scope; add them when a cohort actually closes.
