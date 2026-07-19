import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('device-id', () => {
  beforeEach(() => {
    // The generator reads from localStorage and crypto; in Node we
    // shim both. Node 22 makes globalThis.crypto a getter, so we
    // add the missing method to the existing object instead of
    // reassigning it.
    ;(globalThis as any).window = {
      localStorage: {
        _store: {} as Record<string, string>,
        getItem(k: string) { return this._store[k] ?? null },
        setItem(k: string, v: string) { this._store[k] = v },
        removeItem(k: string) { delete this._store[k] }
      }
    }
    const c: any = (globalThis as any).crypto || {}
    if (!c.getRandomValues) {
      c.getRandomValues = (a: Uint8Array) => {
        for (let i = 0; i < a.length; i++) a[i] = i + 1
        return a
      }
      try { (globalThis as any).crypto = c } catch { /* readonly in some envs */ }
    }
  })

  afterEach(() => {
    delete (globalThis as any).window
    delete (globalThis as any).crypto
    delete (globalThis as any).navigator
  })

  it('returns a fresh id on first call', async () => {
    const { getOrCreateDeviceId } = await import('../lib/device-id')
    const id = getOrCreateDeviceId()
    expect(id).toMatch(/^dev-[A-Za-z0-9_-]{20,}$/)
  })

  it('returns the same id on second call (persists to localStorage)', async () => {
    const { getOrCreateDeviceId } = await import('../lib/device-id')
    const a = getOrCreateDeviceId()
    const b = getOrCreateDeviceId()
    expect(a).toBe(b)
  })

  it('regenerates if the stored id is malformed', async () => {
    const w = (globalThis as any).window
    w.localStorage.setItem('discipline-device-id', 'with spaces and ! chars')
    const { getOrCreateDeviceId } = await import('../lib/device-id')
    const id = getOrCreateDeviceId()
    expect(id).toMatch(/^dev-/)
  })

  it('resetDeviceId clears the storage', async () => {
    const { getOrCreateDeviceId, resetDeviceId } = await import('../lib/device-id')
    getOrCreateDeviceId()
    resetDeviceId()
    const w = (globalThis as any).window
    expect(w.localStorage.getItem('discipline-device-id')).toBeNull()
  })

  it('returns empty string when window is undefined (SSR)', async () => {
    delete (globalThis as any).window
    const { getOrCreateDeviceId } = await import('../lib/device-id')
    expect(getOrCreateDeviceId()).toBe('')
  })
})

describe('getDeviceLabel', () => {
  it('returns a Chrome-on-macOS label', async () => {
    const { getDeviceLabel } = await import('../lib/device-id')
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      configurable: true
    })
    expect(getDeviceLabel()).toBe('Chrome on macOS')
  })

  it('returns a Safari-on-iOS label', async () => {
    const { getDeviceLabel } = await import('../lib/device-id')
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
      configurable: true
    })
    expect(getDeviceLabel()).toBe('Safari on iOS')
  })

  it('returns a Firefox-on-Linux label', async () => {
    const { getDeviceLabel } = await import('../lib/device-id')
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0' },
      configurable: true
    })
    expect(getDeviceLabel()).toBe('Firefox on Linux')
  })
})
