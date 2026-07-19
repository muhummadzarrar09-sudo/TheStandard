#!/usr/bin/env bash
# RLS smoke-test runner. Connects to a Supabase Postgres database,
# applies each `@block` from supabase/tests/*.sql (one block at a
# time, with `set local role authenticated`), and reports pass/fail
# per block. Pass = the action was blocked (`_blocked=` notice).
# Fail = the action was allowed (`_succeeded` notice).
#
# Required env:
#   SUPABASE_DB_URL  — Postgres connection string for a freshly-
#                      migrated Supabase test instance (or a local
#                      `supabase start`).
#
# Usage:
#   SUPABASE_DB_URL=postgres://postgres:postgres@localhost:54322/postgres \
#     bash scripts/rls-test.sh
#
# Exit code 0 if all blocks behave as expected, 1 otherwise.

set -uo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required" >&2
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required (install postgresql-client)" >&2
  exit 2
fi

# Find every SQL file under supabase/tests/ except the ones
# intentionally excluded. New test files are picked up
# automatically; no runner change required.
TEST_FILES=()
for f in supabase/tests/*.sql; do
  case "$f" in
    *checklist*) continue ;; # manual checklist, not a runnable test
  esac
  TEST_FILES+=("$f")
done

if [[ ${#TEST_FILES[@]} -eq 0 ]]; then
  echo "No SQL test files found under supabase/tests/" >&2
  exit 2
fi

# Pass = the action was blocked (`_blocked=` notice).
# Fail = the action was allowed (`_succeeded` notice).
overall_ok=0
overall_unexpected=0
for TEST_FILE in "${TEST_FILES[@]}"; do
  echo "=== $TEST_FILE ==="
  psql "$SUPABASE_DB_URL" \
    --set ON_ERROR_STOP=off \
    --set AUTOCOMMIT=on \
    --single-transaction=off \
    --quiet \
    --no-psqlrc \
    -v ON_ERROR_STOP=off \
    -f "$TEST_FILE" 2>&1 \
    | awk -v file="$TEST_FILE" '
        /^[ \t]*$/ { next }
        /succeeded=/ { ok++; next }
        /succeeded$/ { unexpected++; print file ": FAIL:", $0; next }
        /blocked=/ { ok++; next }
        /_loaded/ { next }
        { print $0 }
        END {
          print file ": " ok " blocks observed, " unexpected " unexpectedly succeeded"
          if (unexpected > 0) exit_code = 1
        }'
  awk_rc=${PIPESTATUS[1]}
  if [[ $awk_rc -ne 0 ]]; then
    overall_unexpected=$((overall_unexpected + 1))
  else
    overall_ok=$((overall_ok + 1))
  fi
done

echo "---"
echo "RLS smoke summary: $overall_ok files passed, $overall_unexpected files failed"
exit $overall_unexpected
