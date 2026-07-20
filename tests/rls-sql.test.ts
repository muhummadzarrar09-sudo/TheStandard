// Structural checks on the RLS test SQL files. The runner
// (scripts/rls-test.sh) needs a real Postgres to actually
// execute these; the unit tests below make sure the files
// exist, parse, and follow the contract the runner expects
// (blocks end in `_blocked=` or `_succeeded=` notices).

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const testsDir = resolve(root, 'supabase', 'tests')

describe('RLS test SQL files', () => {
  it('the tests directory exists', () => {
    expect(() => readdirSync(testsDir)).not.toThrow()
  })

  it('the checklist is excluded from the runner by name', () => {
    const runner = readFileSync(resolve(root, 'scripts/rls-test.sh'), 'utf8')
    expect(runner).toMatch(/checklist.*continue/)
  })

  it('every runnable .sql file emits at least one _blocked or _succeeded notice', () => {
    const files = readdirSync(testsDir).filter(f => f.endsWith('.sql') && !f.includes('checklist'))
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) {
      const text = readFileSync(resolve(testsDir, f), 'utf8')
      const inBlockNotices = (text.match(/_blocked=|_succeeded=/g) || []).length
      const notices = (text.match(/RAISE NOTICE/gi) || []).length
      expect(inBlockNotices, `${f} should have at least one _blocked or _succeeded notice`).toBeGreaterThan(0)
      expect(notices, `${f} should have at least one RAISE NOTICE`).toBeGreaterThan(0)
    }
  })

  it('the runner uses --single-transaction=off (each block must commit independently)', () => {
    const runner = readFileSync(resolve(root, 'scripts/rls-test.sh'), 'utf8')
    expect(runner).toMatch(/--single-transaction=off/)
  })

  it('the runner exits non-zero on any unexpectedly-succeeded block', () => {
    const runner = readFileSync(resolve(root, 'scripts/rls-test.sh'), 'utf8')
    expect(runner).toMatch(/exit \$overall_unexpected/)
  })

  it('the adversarial SQL file is present (the new Phase 9 coverage)', () => {
    const files = readdirSync(testsDir)
    expect(files).toContain('rls_adversarial.sql')
  })

  // Pinned structural check on supabase/schema-all.sql: every application
  // table created in the consolidated file must have RLS enabled. Catches
  // the class of bug where a CREATE TABLE ships without an
  // `alter table ... enable row level security` line and silently
  // becomes world-readable for anon/authenticated clients.
  it('schema-all.sql enables row level security on every application table', () => {
    const sql = readFileSync(resolve(root, 'supabase', 'schema-all.sql'), 'utf8')
    const created = new Set<string>()
    for (const m of sql.matchAll(/create table if not exists public\.([a-z_]+)/g)) {
      created.add(m[1])
    }
    expect(created.size).toBeGreaterThan(20) // sanity: 26 expected
    const missing: string[] = []
    for (const t of created) {
      // accept either the explicit "alter table public.X enable row level security"
      // OR the DO block at line 73 that enables 11 of them in one shot.
      const explicit = new RegExp(`enable row level security[^\\n]*\\b${t}\\b|\\b${t}\\b[^\\n]*enable row level security`)
      if (!explicit.test(sql)) missing.push(t)
    }
    expect(missing, `Tables in schema-all.sql without RLS enabled: ${missing.join(', ')}`).toEqual([])
  })

  it('schema-all.sql has more policies than tables (defense-in-depth contract)', () => {
    const sql = readFileSync(resolve(root, 'supabase', 'schema-all.sql'), 'utf8')
    const tableCount = (sql.match(/create table if not exists public\./g) || []).length
    const policyCount = (sql.match(/create policy /g) || []).length
    expect(policyCount).toBeGreaterThanOrEqual(tableCount)
  })

  // Catches the class of bug where two migrations declare the same policy
  // name. Postgres raises 42710 on the second `create policy` and a
  // consolidated paste fails outright. The drop-then-create pattern is the
  // accepted fix; policies are not `create or replace`-able.
  it('schema-all.sql has no duplicate policy names (Postgres 42710 protection)', () => {
    const sql = readFileSync(resolve(root, 'supabase', 'schema-all.sql'), 'utf8')
    const names = Array.from(sql.matchAll(/create policy ([a-z_]+)/g)).map(m => m[1])
    const seen = new Map<string, number>()
    for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1)
    const dupes = [...seen.entries()].filter(([, c]) => c > 1).map(([n]) => n)
    if (dupes.length > 0) {
      // For each duplicate, check that the file has a drop-then-create
      // pattern for that policy (drop policy if exists X; ... create policy X).
      // If the drop is missing, that's the bug.
      const offenders: string[] = []
      for (const n of dupes) {
        const dropRe = new RegExp(`drop policy if exists ${n} on `)
        if (!dropRe.test(sql)) offenders.push(n)
      }
      expect(offenders, `Duplicate policies without drop-then-create: ${offenders.join(', ')}`).toEqual([])
    }
  })
})
