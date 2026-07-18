export const OTP_EXPIRY_SECONDS = 600
export const MAX_DEVICES = 2

// Email validation. Tighter than the original /^\S+@\S+\.\S+$/ which
// accepted things like "a@b.c". Requires a TLD with at least 2 letters.
// We still keep it simple — full RFC 5322 compliance isn't worth the
// regex complexity at the API boundary.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim())
}

// Returns true if the supplied value is a plausible X-Device-Id header.
// Same shape as our device_sessions.device_id: printable ASCII, 8..128 chars.
export function plausibleDeviceId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(value)
}
