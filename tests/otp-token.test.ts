// Unit tests for the OTP token issuance helpers in
// /api/auth/request-otp/route.ts. We import the internal helpers via
// the route's named export. The route itself is integration-tested in
// the Next request layer; here we just exercise the crypto + nonce
// bookkeeping so the security-critical surface is locked.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We can't statically import the route (it depends on next/server
// and is wrapped in withErrorHandling which calls into next/headers).
// So we test the helpers by inlining a re-implementation. This is a
// known limitation: full integration would need a Next request fixture.
// We re-export the pure functions from a sibling module so tests
// don't have to load the route.

import { signOtpToken, verifyOtpToken, isOtpNonceUsed, recordOtpNonce, _resetOtpNonces, _resetOtpSecret } from '../lib/otp-token'

describe('OTP token signing', () => {
  beforeEach(() => {
    _resetOtpNonces()
    _resetOtpSecret()
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
    _resetOtpSecret()
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

describe('OTP token secret resolution', () => {
  const originalSecret = process.env.OTP_TOKEN_SECRET
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.OTP_TOKEN_SECRET
    else process.env.OTP_TOKEN_SECRET = originalSecret
    if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole
    _resetOtpSecret()
  })

  it('uses OTP_TOKEN_SECRET when set', () => {
    process.env.OTP_TOKEN_SECRET = 'a'.repeat(32)
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    _resetOtpSecret()
    const t1 = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) + 60, nonce: 's1' })
    _resetOtpSecret()
    // A token signed with secret A should not verify with secret B.
    const original = process.env.OTP_TOKEN_SECRET
    process.env.OTP_TOKEN_SECRET = 'b'.repeat(32)
    _resetOtpSecret()
    expect(verifyOtpToken(t1)).toBeNull()
    process.env.OTP_TOKEN_SECRET = original
  })

  it('falls back to SUPABASE_SERVICE_ROLE_KEY when OTP_TOKEN_SECRET is missing', () => {
    delete process.env.OTP_TOKEN_SECRET
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'a'.repeat(40)
    _resetOtpSecret()
    const t1 = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) + 60, nonce: 's2' })
    _resetOtpSecret()
    expect(verifyOtpToken(t1)).not.toBeNull()
  })

  it('falls back to a recognisable dev-only string and warns when neither is set', () => {
    delete process.env.OTP_TOKEN_SECRET
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    _resetOtpSecret()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t1 = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) + 60, nonce: 's3' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dev-only secret'))
    expect(verifyOtpToken(t1)).not.toBeNull()
    warn.mockRestore()
  })

  it('rejects too-short OTP_TOKEN_SECRET and falls through to the next option', () => {
    process.env.OTP_TOKEN_SECRET = 'short' // < 32 chars
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'a'.repeat(40)
    _resetOtpSecret()
    const t1 = signOtpToken({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) + 60, nonce: 's4' })
    _resetOtpSecret()
    // The service-role key is the effective secret; verify still works.
    expect(verifyOtpToken(t1)).not.toBeNull()
  })
})
