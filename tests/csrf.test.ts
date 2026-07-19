// Tests for the pure CSRF decision function. The Next-coupled
// wrapper (lib/csrf-middleware.ts) is exercised in the Playwright
// smoke spec — we don't import next/server from the unit tests.

import { describe, it, expect } from 'vitest'
import { generateCsrfToken, csrfDecide, constantTimeEqual, CSRF_COOKIE, CSRF_HEADER } from '../lib/csrf'

describe('CSRF token generator', () => {
  it('generates a base64url token of expected length', () => {
    const t = generateCsrfToken()
    expect(t.length).toBe(43)
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates unique tokens', () => {
    const a = new Set<string>()
    for (let i = 0; i < 100; i++) a.add(generateCsrfToken())
    expect(a.size).toBe(100)
  })

  it('exports the canonical cookie + header names', () => {
    expect(CSRF_COOKIE).toBe('csrf')
    expect(CSRF_HEADER).toBe('x-csrf-token')
  })
})

describe('constantTimeEqual', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
  })
  it('returns false for different strings of the same length', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false)
  })
  it('returns false for different-length strings', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
    expect(constantTimeEqual('', 'x')).toBe(false)
  })
  it('handles empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true)
  })
})

describe('csrfDecide', () => {
  it('passes safe methods on protected paths when the cookie already exists', () => {
    expect(csrfDecide('GET', '/api/checkins', 'existing-tok', null)).toEqual({ kind: 'pass' })
  })
  it('sets a fresh cookie on a safe method that has none', () => {
    const d = csrfDecide('GET', '/api/checkins', null, null)
    expect(d.kind).toBe('set')
  })
  it('passes HEAD + OPTIONS as safe methods when the cookie is set', () => {
    expect(csrfDecide('HEAD', '/api/checkins', 'tok', null)).toEqual({ kind: 'pass' })
    expect(csrfDecide('OPTIONS', '/api/checkins', 'tok', null)).toEqual({ kind: 'pass' })
  })
  it('passes auth/* regardless of method (unprotected)', () => {
    expect(csrfDecide('POST', '/api/auth/request-otp', null, null).kind).toBe('pass')
    expect(csrfDecide('POST', '/api/auth/send-code', null, null).kind).toBe('pass')
    expect(csrfDecide('POST', '/api/auth/verify-otp', null, null).kind).toBe('pass')
  })
  it('passes /api/log regardless of method (degraded reporting)', () => {
    expect(csrfDecide('POST', '/api/log', null, null).kind).toBe('pass')
  })
  it('passes /api/health regardless of method', () => {
    expect(csrfDecide('DELETE', '/api/health', null, null).kind).toBe('pass')
  })
  it('rejects POST without a csrf cookie', () => {
    expect(csrfDecide('POST', '/api/checkins', null, null)).toEqual({ kind: 'reject', reason: 'no_cookie' })
  })
  it('rejects POST with cookie but no header', () => {
    expect(csrfDecide('POST', '/api/checkins', 'token-abc', null)).toEqual({ kind: 'reject', reason: 'no_header' })
  })
  it('rejects POST when header and cookie do not match', () => {
    expect(csrfDecide('POST', '/api/checkins', 'token-abc', 'token-xyz')).toEqual({ kind: 'reject', reason: 'mismatch' })
  })
  it('accepts POST when header and cookie match', () => {
    expect(csrfDecide('POST', '/api/checkins', 'token-abc', 'token-abc')).toEqual({ kind: 'pass' })
  })
  it('accepts PATCH/DELETE/PUT when token matches', () => {
    const token = 'shared-token'
    for (const method of ['PATCH', 'DELETE', 'PUT']) {
      expect(csrfDecide(method, '/api/some/resource', token, token)).toEqual({ kind: 'pass' })
    }
  })
  it('does not set a fresh cookie when one already exists', () => {
    expect(csrfDecide('GET', '/api/checkins', 'existing-token', null)).toEqual({ kind: 'pass' })
  })
  it('is case-insensitive on the method', () => {
    expect(csrfDecide('post', '/api/checkins', 'tok', 'tok').kind).toBe('pass')
    expect(csrfDecide('get', '/api/checkins', null, null).kind).toBe('set')
  })
})
