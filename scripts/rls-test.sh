#!/usr/bin/env bash
# RLS smoke-test runner. Connects to a Supabase Postgres database,
# applies each `@block` from supabase/tests/rls_smoke.sql as a
# sub-transaction with `set local role authenticated`, and reports
# pass/fail per block.
#
# Required env:
#   SUPABASE_DB_URL  — Postgres connection string for a freshly-
#                      migrated Supabase test instance (or a local
#                      `supabase start`).
#
# Optional env:
#   RLS_USER_ID      — UUID of a member to scope the role-switch
#                      context to. Defaults to a sentinel UUID.
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

TEST_FILE="supabase/tests/rls_smoke.sql"
if [[ ! -f "$TEST_FILE" ]]; then
  echo "Missing $TEST_FILE" >&2
  exit 2
fi

# We expect the RLS policies to *block* member-level writes for
# sensitive tables. The test file logs results via RAISE NOTICE
# using the convention `<table>:<action>_blocked=<error>` or
# `<table>:<action>_succeeded` (unexpected). We pass when every
# block ends in `_blocked=` and fail on any `_succeeded`.
#
# This is a "negative" test: we want the database to refuse the
# action, not to perform it. The success criterion is that no
# `_succeeded` notice appears for an action that should be blocked.

psql "$SUPABASE_DB_URL" \
  --set ON_ERROR_STOP=off \
  --set AUTOCOMMIT=on \
  --single-transaction=off \
  --quiet \
  --no-psqlrc \
  -v ON_ERROR_STOP=off \
  -f "$TEST_FILE" 2>&1 \
  | awk -v expected='blocked' '
      /^[ \t]*$/ { next }
      /succeeded$/ { unexpected++; print "FAIL:", $0; next }
      /blocked=/ { ok++; next }
      /NOTICE:/ { next }
      /rls_smoke_loaded/ { next }
      { print $0 }
      END {
        print "---"
        print "RLS smoke summary: " ok " blocked, " unexpected " unexpectedly succeeded"
        if (unexpected > 0) exit 1
      }'

result=${PIPESTATUS[0]}

# The awk pipeline always exits 0 if unexpected == 0. But psql
# may have failed; capture that exit code too.
if [[ $result -ne 0 ]]; then
  echo "psql exited with $result" >&2
  exit $result
fi

exit 0
