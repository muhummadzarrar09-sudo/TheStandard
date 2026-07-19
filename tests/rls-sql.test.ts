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
})
