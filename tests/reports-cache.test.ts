// The reports offline cache name + the per-user limit live in
// lib/offline/reports-cache. The service worker mirrors the same
// values in public/sw.js. These tests pin the values so a
// maintainer can't change one without a test failing.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { REPORT_CACHE_NAME, DEFAULT_REPORT_OFFLINE_LIMIT } from '../lib/offline/reports-cache'

const here = dirname(fileURLToPath(import.meta.url))
const sw = readFileSync(resolve(here, '../public/sw.js'), 'utf8')

describe('reports offline cache', () => {
  it('exports a stable cache name', () => {
    expect(REPORT_CACHE_NAME).toBe('discipline-reports-v2')
  })

  it('default offline limit is 5 (PRD §7.6)', () => {
    expect(DEFAULT_REPORT_OFFLINE_LIMIT).toBe(5)
  })

  it('the service worker uses the same cache name', () => {
    expect(sw).toContain(`'${REPORT_CACHE_NAME}'`)
  })

  it('the service worker uses the same 5-report limit', () => {
    // The SW should declare MAX_REPORT_ENTRIES = 5 (or read it from
    // somewhere). Either way, the value 5 must appear in the SW.
    expect(sw).toMatch(/MAX_REPORT_ENTRIES\s*=\s*5/)
  })

  it('cache name uses a versioned suffix so a bump is safe', () => {
    expect(REPORT_CACHE_NAME).toMatch(/-v\d+$/)
  })
})
