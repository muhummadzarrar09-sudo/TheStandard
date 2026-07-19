// Device-id generator + persistence. The id is a random 16-byte
// base64url string; we store it in localStorage so subsequent
// visits on the same device present the same id. The id is sent
// to the server as the X-Device-Id header so the device_sessions
// table can track it.

const KEY = 'discipline-device-id'

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(KEY)
    if (existing && /^[A-Za-z0-9._:-]{8,128}$/.test(existing)) return existing
  } catch {}
  const fresh = generateDeviceId()
  try { window.localStorage.setItem(KEY, fresh) } catch {}
  return fresh
}

export function resetDeviceId(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(KEY) } catch {}
}

function generateDeviceId(): string {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  // base64url encode, no padding, then prefix with "dev-" for
  // human-readability in the admin table.
  let s = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `dev-${s}`
}

// Coarse device label for the admin/session list. Best-effort
// fingerprint; the PRD §6.5 says "use coarse metadata, not
// invasive fingerprint collection."
export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown device'
  const ua = navigator.userAgent || ''
  let browser = 'browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'Safari'
  let os = 'unknown'
  if (/Windows/.test(ua)) os = 'Windows'
  else if (/iPhone/.test(ua)) os = 'iOS'
  else if (/iPad/.test(ua)) os = 'iOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Mac/.test(ua)) os = 'macOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  return `${browser} on ${os}`
}
