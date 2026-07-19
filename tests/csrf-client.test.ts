// Client-side CSRF helpers. We test readCsrfToken directly;
// installCsrfFetchShim is exercised by the e2e suite.

import { describe, it, expect, beforeEach } from 'vitest'

;(globalThis as any).document = { cookie: '' }
const { readCsrfToken, CSRF_COOKIE, CSRF_HEADER } = await import('../lib/csrf-client')

describe('CSRF client helpers', () => {
  beforeEach(() => {
    ;(globalThis as any).document.cookie = ''
  })

  it('readCsrfToken returns "" when no cookie is set', () => {
    ;(globalThis as any).document.cookie = ''
    expect(readCsrfToken()).toBe('')
  })

  it('readCsrfToken returns the csrf cookie value when set', () => {
    ;(globalThis as any).document.cookie = `${CSRF_COOKIE}=abc123; other=x`
    expect(readCsrfToken()).toBe('abc123')
  })

  it('readCsrfToken decodes URL-encoded values', () => {
    ;(globalThis as any).document.cookie = `${CSRF_COOKIE}=abc%2Bdef; other=x`
    expect(readCsrfToken()).toBe('abc+def')
  })

  it('readCsrfToken handles the cookie being the only one', () => {
    ;(globalThis as any).document.cookie = `${CSRF_COOKIE}=only-one`
    expect(readCsrfToken()).toBe('only-one')
  })

  it('exports the canonical cookie + header names', () => {
    expect(CSRF_COOKIE).toBe('csrf')
    expect(CSRF_HEADER).toBe('x-csrf-token')
  })
})
