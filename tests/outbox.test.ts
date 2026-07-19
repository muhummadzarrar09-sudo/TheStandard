// The outbox module. We can't run real IndexedDB in the sandbox
// (no polyfill installed), so we test the localStorage side of
// the surface directly. The IndexedDB surface is exercised by
// the running app; if the schema or the key path changes, the
// matching test in the production smoke catches it.

import { describe, it, expect, beforeEach } from 'vitest'

// Minimal localStorage polyfill. Vitest's default env doesn't
// provide one. We only need getItem/setItem/removeItem/clear.
const store = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() }
}
;(globalThis as any).indexedDB = {
  open: () => { throw new Error('not supported in tests') }
}

const { OUTBOX_STORAGE_KEY, readLastSyncAt } = await import('../lib/offline/outbox')

describe('outbox last-sync surface', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('readLastSyncAt returns null when no sync has been recorded', () => {
    expect(readLastSyncAt()).toBeNull()
  })

  it('readLastSyncAt returns a number after a sync is recorded', () => {
    const now = Date.now()
    localStorage.setItem(OUTBOX_STORAGE_KEY, String(now))
    const v = readLastSyncAt()
    expect(typeof v).toBe('number')
    expect(v).toBe(now)
  })

  it('readLastSyncAt returns null for a non-numeric value', () => {
    localStorage.setItem(OUTBOX_STORAGE_KEY, 'not-a-number')
    expect(readLastSyncAt()).toBeNull()
  })

  it('OUTBOX_STORAGE_KEY is a stable namespaced string', () => {
    expect(OUTBOX_STORAGE_KEY).toBe('discipline:last-sync')
    expect(OUTBOX_STORAGE_KEY.startsWith('discipline:')).toBe(true)
  })
})
