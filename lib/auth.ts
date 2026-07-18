export const OTP_EXPIRY_SECONDS = 600
export const MAX_DEVICES = 2
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

// Returns true if the supplied value is a plausible X-Device-Id header.
// Same shape as our device_sessions.device_id: printable ASCII, 8..128 chars.
export function plausibleDeviceId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(value)
}
