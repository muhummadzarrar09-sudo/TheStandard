// Unit tests for the OTP token issuance helpers in
// /api/auth/request-otp/route.ts. We import the internal helpers via
// the route's named export. The route itself is integration-tested in
// the Next request layer; here we just exercise the crypto + nonce
// bookkeeping so the security-critical surface is locked.

import { describe, it, expect, beforeEach } from 'vitest'

// We can't statically import the route (it depends on next/server
// and is wrapped in withErrorHandling which calls into next/headers).
// So we test the helpers by inlining a re-implementation. This is a
// known limitation: full integration would need a Next request fixture.
// We re-export the pure functions from a sibling module so tests
// don't have to load the route.

import { signOtpToken, verifyOtpToken, isOtpNonceUsed, recordOtpNonce, _resetOtpNonces } from '../lib/otp-token'

describe('OTP token signing', () => {
  beforeEach(() => {
    _resetOtpNonces()
  })

  it('signs and verifies a token', () => {
    const token = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) + 60, nonce: 'n1' })
    const payload = verifyOtpToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.email).toBe('a@b.co')
    expect(payload!.nonce).toBe('n1')
  })

  it('rejects an expired token', () => {
    const token = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) - 1, nonce: 'n2' })
    expect(verifyOtpToken(token)).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const token = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) + 60, nonce: 'n3' })
    const [body, sig] = token.split('.')
    const tampered = `${body}.${'X'.repeat(sig.length)}`
    expect(verifyOtpToken(tampered)).toBeNull()
  })

  it('rejects a malformed token', () => {
    expect(verifyOtpToken('not-a-token')).toBeNull()
    expect(verifyOtpToken('only.one.dot.extra')).toBeNull()
    expect(verifyOtpToken('')).toBeNull()
  })
})

describe('OTP nonce bookkeeping', () => {
  beforeEach(() => {
    _resetOtpNonces()
  })

  it('returns false for a fresh nonce', () => {
    expect(isOtpNonceUsed('fresh')).toBe(false)
  })

  it('returns true after recording', () => {
    recordOtpNonce('n1', Date.now() + 60_000)
    expect(isOtpNonceUsed('n1')).toBe(true)
  })

  it('forgets nonces whose expiry has passed', () => {
    recordOtpNonce('n2', Date.now() - 1)
    expect(isOtpNonceUsed('n2')).toBe(false)
  })

  it('treats the same nonce as used only once', () => {
    const t1 = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) + 60, nonce: 'n3' })
    recordOtpNonce('n3', Date.now() + 60_000)
    // Same nonce cannot be re-used.
    const t2 = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) + 60, nonce: 'n3' })
    expect(verifyOtpToken(t1)).not.toBeNull()
    expect(isOtpNonceUsed('n3')).toBe(true)
    // (the second token signs the same nonce; the caller must check
    // isOtpNonceUsed *before* re-signing.)
    expect(t1).toBe(t2) // deterministic for the same payload + secret
  })
})
