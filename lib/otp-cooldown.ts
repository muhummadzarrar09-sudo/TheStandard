// Per-email resend cooldown. PRD §8.1: "resend cooldown".
//
// We refuse a resend if the same email has had an OTP generated
// in the last COOLDOWN_MS. The bucket is keyed by lowercase
// email; the value is the timestamp of the last send.

const COOLDOWN_MS = 30_000

const lastSent: Map<string, number> = new Map()

export function getResendCooldownRemaining(email: string): number {
  const last = lastSent.get(email.toLowerCase())
  if (!last) return 0
  const elapsed = Date.now() - last
  if (elapsed >= COOLDOWN_MS) return 0
  return Math.ceil((COOLDOWN_MS - elapsed) / 1000)
}

export function recordResend(email: string): void {
  lastSent.set(email.toLowerCase(), Date.now())
}

// Periodic prune so a long-lived process doesn't grow the map
// unbounded. Runs in-band on every call; very cheap.
function maybePrune() {
  if (lastSent.size < 1000) return
  const now = Date.now()
  for (const [k, v] of lastSent) {
    if (now - v > COOLDOWN_MS) lastSent.delete(k)
  }
}

export function checkAndRecordResend(email: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  maybePrune()
  const remaining = getResendCooldownRemaining(email)
  if (remaining > 0) {
    return { allowed: false, retryAfterSeconds: remaining }
  }
  recordResend(email)
  return { allowed: true }
}

export const OTP_RESEND_COOLDOWN_MS = COOLDOWN_MS
export function _resetResendCooldown(): void { lastSent.clear() }
