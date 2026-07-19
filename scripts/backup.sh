#!/usr/bin/env bash
# Database backup + retention. Runs against a Supabase Postgres
# instance. The output is a gzipped custom-format dump; restores
# are full + selective (see restore.sh).
#
# Required env:
#   SUPABASE_DB_URL  — Postgres connection string (the same one
#                      you'd use with the Supabase dashboard's
#                      "connection string" → "Direct").
#   BACKUP_DIR       — Local directory for dump files. Will be
#                      created if missing.
#
# Optional env:
#   BACKUP_KEEP_DAYS — How long to keep dumps locally (default 14).
#
# Usage (typical cron entry, daily at 03:00 UTC):
#   SUPABASE_DB_URL=... BACKUP_DIR=/var/backups/discipline-os \
#     0 3 * * * /opt/discipline-os/scripts/backup.sh
#
# Restore:
#   pg_restore --clean --if-exists --dbname="$SUPABASE_DB_URL" \
#     /var/backups/discipline-os/discipline-os-2026-01-15.dump

set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required (install postgresql-client)" >&2
  exit 2
fi

mkdir -p "$BACKUP_DIR"

ts="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
out="$BACKUP_DIR/discipline-os-${ts}.dump"

echo "[backup] writing $out"
pg_dump \
  --dbname="$SUPABASE_DB_URL" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-privileges \
  --file="$out"

# Verify the dump is non-empty and pg_restore can read it.
if ! pg_restore --list "$out" >/dev/null 2>&1; then
  echo "[backup] VERIFY FAILED — dump is not readable" >&2
  exit 1
fi
echo "[backup] verified (pg_restore --list OK)"

# Prune old dumps.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'discipline-os-*.dump' \
  -mtime "+${BACKUP_KEEP_DAYS}" -print -delete

echo "[backup] done"
