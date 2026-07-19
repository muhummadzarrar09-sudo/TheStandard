#!/usr/bin/env bash
# Ship database backups to S3. Run from cron after scripts/backup.sh.
#
# Required env:
#   BACKUP_DIR   — local directory where backup.sh wrote today's dump
#   S3_BUCKET    — destination bucket, e.g. s3://discipline-os-backups
#   AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (or IAM role)
#
# Optional env:
#   S3_PREFIX    — path prefix within the bucket (default: db)
#   S3_STORAGE_CLASS — STANDARD | STANDARD_IA | GLACIER (default: STANDARD_IA)
#   BACKUP_KEEP_DAYS — mirror of backup.sh; passed via env if set
#
# Usage (typical cron entry, daily at 04:00 UTC):
#   BACKUP_DIR=/var/backups/discipline-os S3_BUCKET=s3://... \
#     0 4 * * * /opt/discipline-os/scripts/backup-ship.sh >> /var/log/discipline-os-backup.log 2>&1
#
# Retention: S3 lifecycle policy is the source of truth. Recommended
# settings:
#   - Transition to GLACIER after 30 days
#   - Expire after 365 days
# The script does NOT delete local dumps; backup.sh handles that.

set -euo pipefail

: "${BACKUP_DIR:?BACKUP_DIR is required}"
: "${S3_BUCKET:?S3_BUCKET is required}"
S3_PREFIX="${S3_PREFIX:-db}"
S3_STORAGE_CLASS="${S3_STORAGE_CLASS:-STANDARD_IA}"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws cli is required" >&2
  exit 2
fi

# Find today's dump. backup.sh names files with a UTC timestamp, so
# the most recent one is today's.
dump=$(ls -1t "$BACKUP_DIR"/discipline-os-*.dump 2>/dev/null | head -n 1)
if [[ -z "$dump" || ! -f "$dump" ]]; then
  echo "No backup found in $BACKUP_DIR" >&2
  exit 1
fi

# Verify before shipping. pg_restore --list is the cheap check; if
# the dump is corrupt we don't want to ship garbage to S3.
if ! pg_restore --list "$dump" >/dev/null 2>&1; then
  echo "Backup $dump failed pg_restore --list; not shipping" >&2
  exit 1
fi

# Build the S3 key. We strip the .dump suffix to add a date folder
# so the bucket layout is s3://bucket/db/YYYY/MM/discipline-os-TIMESTAMP.dump.
# That makes lifecycle policies and restores easier.
ts=$(date -u +%Y/%m)
filename=$(basename "$dump")
key="${S3_PREFIX}/${ts}/${filename}"

echo "[backup-ship] aws s3 cp $dump s3://${S3_BUCKET}/${key} --storage-class ${S3_STORAGE_CLASS}"
aws s3 cp "$dump" "s3://${S3_BUCKET}/${key}" \
  --storage-class "$S3_STORAGE_CLASS" \
  --only-show-errors

echo "[backup-ship] done. s3://${S3_BUCKET}/${key}"
