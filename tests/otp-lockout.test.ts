import { describe, it, expect, beforeEach } from 'vitest'
import { recordFailedAttempt, recordSuccessfulAttempt, checkLockout, _resetOtpLockout, OTP_MAX_ATTEMPTS, OTP_LOCKOUT_MS } from '../lib/otp-lockout'
import { checkAndRecordResend, getResendCooldownRemaining, _resetResendCooldown, OTP_RESEND_COOLDOWN_MS } from '../lib/otp-cooldown'

describe('OTP lockout (PRD §8.1: 5 attempts, 10-min lockout)', () => {
  beforeEach(() => {
    _resetOtpLockout()
  })

  it('allows the first 4 attempts', () => {
    for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i++) {
      const r = recordFailedAttempt('user@example.com')
      expect(r.allowed).toBe(true)
      if (r.allowed) expect(r.remaining).toBe(OTP_MAX_ATTEMPTS - 1 - i)
    }
  })

  it('locks on the 5th attempt and returns retryAfter', () => {
    for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i++) {
      recordFailedAttempt('user@example.com')
    }
    const fifth = recordFailedAttempt('user@example.com')
    expect(fifth.allowed).toBe(false)
    if (!fifth.allowed) {
      // ~10 minutes in seconds, allow 1s of slack
      expect(fifth.retryAfterSeconds).toBeGreaterThan(OTP_LOCKOUT_MS / 1000 - 5)
      expect(fifth.retryAfterSeconds).toBeLessThanOrEqual(OTP_LOCKOUT_MS / 1000)
    }
  })

  it('checkLockout returns allowed=false after lockout triggered', () => {
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) recordFailedAttempt('user@example.com')
    const check = checkLockout('user@example.com')
    expect(check.allowed).toBe(false)
  })

  it('checkLockout is per-email', () => {
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) recordFailedAttempt('a@x.co')
    const a = checkLockout('a@x.co')
    const b = checkLockout('b@x.co')
    expect(a.allowed).toBe(false)
    expect(b.allowed).toBe(true)
  })

  it('recordSuccessfulAttempt clears the bucket', () => {
    for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i++) recordFailedAttempt('user@example.com')
    recordSuccessfulAttempt('user@example.com')
    const after = recordFailedAttempt('user@example.com')
    expect(after.allowed).toBe(true)
    if (after.allowed) expect(after.remaining).toBe(OTP_MAX_ATTEMPTS - 1)
  })

  it('email is case-insensitive', () => {
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) recordFailedAttempt('User@Example.com')
    const lower = checkLockout('user@example.com')
    const upper = checkLockout('USER@EXAMPLE.COM')
    expect(lower.allowed).toBe(false)
    expect(upper.allowed).toBe(false)
  })
})

describe('OTP resend cooldown', () => {
  beforeEach(() => {
    _resetResendCooldown()
  })

  it('allows the first resend', () => {
    const r = checkAndRecordResend('user@example.com')
    expect(r.allowed).toBe(true)
  })

  it('refuses a second resend within the cooldown', () => {
    checkAndRecordResend('user@example.com')
    const r = checkAndRecordResend('user@example.com')
    expect(r.allowed).toBe(false)
    if (!r.allowed) {
      expect(r.retryAfterSeconds).toBeGreaterThan(0)
      expect(r.retryAfterSeconds).toBeLessThanOrEqual(OTP_RESEND_COOLDOWN_MS / 1000)
    }
  })

  it('getResendCooldownRemaining returns 0 for a fresh email', () => {
    expect(getResendCooldownRemaining('new@example.com')).toBe(0)
  })

  it('email is case-insensitive', () => {
    checkAndRecordResend('User@Example.com')
    const r = checkAndRecordResend('user@example.com')
    expect(r.allowed).toBe(false)
  })
})
