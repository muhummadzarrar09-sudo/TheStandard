// Per-email OTP attempt tracking. PRD §8.1: "5 failed attempts
// per challenge/email/IP window, then 10-minute lockout."
//
// In-memory Map keyed by lowercase email. Each entry tracks the
// number of failed attempts and the lockout expiry. When the
// count hits MAX_ATTEMPTS, the entry is marked locked and any
// further attempts within the lockout window return 429.
//
// Process-local. For a multi-instance deployment, swap for Redis
// INCR + EXPIRE; the public surface stays the same.

import { log } from './log'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 10 * 60_000 // 10 minutes
const WINDOW_MS = 10 * 60_000 // sliding window of 10 min

type Bucket = {
  attempts: number
  firstAttemptAt: number
  lockedUntil: number
}

const buckets: Map<string, Bucket> = new Map()

// Pruning: every 100 calls, drop expired entries. Avoids
// unbounded growth in a long-lived process.
let prunes = 0
function maybePrune() {
  prunes++
  if (prunes < 100) return
  prunes = 0
  const now = Date.now()
  for (const [k, v] of buckets) {
    if (v.lockedUntil < now && v.firstAttemptAt + WINDOW_MS < now) {
      buckets.delete(k)
    }
  }
}

export type OtpLockoutResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number }

export function recordFailedAttempt(email: string): OtpLockoutResult {
  maybePrune()
  const key = email.toLowerCase()
  const now = Date.now()
  const existing = buckets.get(key)
  if (existing && existing.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.lockedUntil - now) / 1000)
    }
  }
  if (existing && now - existing.firstAttemptAt > WINDOW_MS) {
    // Sliding window: start a fresh window.
    buckets.set(key, { attempts: 1, firstAttemptAt: now, lockedUntil: 0 })
    log.info({ email: key, attempts: 1 }, 'otp: failed attempt (new window)')
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }
  const attempts = (existing?.attempts || 0) + 1
  if (attempts >= MAX_ATTEMPTS) {
    buckets.set(key, { attempts, firstAttemptAt: existing?.firstAttemptAt || now, lockedUntil: now + LOCKOUT_MS })
    log.warn({ email: key, attempts, lockout_ms: LOCKOUT_MS }, 'otp: locked after 5 failed attempts')
    return { allowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) }
  }
  buckets.set(key, { attempts, firstAttemptAt: existing?.firstAttemptAt || now, lockedUntil: 0 })
  return { allowed: true, remaining: MAX_ATTEMPTS - attempts }
}

export function recordSuccessfulAttempt(email: string): void {
  // A successful attempt clears the bucket. The user passed the
  // challenge; no more attempts should be charged.
  buckets.delete(email.toLowerCase())
}

export function checkLockout(email: string): OtpLockoutResult {
  maybePrune()
  const key = email.toLowerCase()
  const existing = buckets.get(key)
  const now = Date.now()
  if (!existing) return { allowed: true, remaining: MAX_ATTEMPTS }
  if (existing.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.lockedUntil - now) / 1000)
    }
  }
  return { allowed: true, remaining: MAX_ATTEMPTS - existing.attempts }
}

export const OTP_MAX_ATTEMPTS = MAX_ATTEMPTS
export const OTP_LOCKOUT_MS = LOCKOUT_MS
export function _resetOtpLockout(): void { buckets.clear() }
