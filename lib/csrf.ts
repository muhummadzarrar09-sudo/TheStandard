// CSRF protection for state-changing API routes.
//
// Strategy: double-submit cookie. On the first request that
// lacks a `csrf` cookie, the middleware sets one with a
// random 32-byte token (base64url). On every non-safe request
// (POST/PUT/PATCH/DELETE), the handler must include a
// `x-csrf-token` header with the same value; the middleware
// compares the header to the cookie and rejects with 403 on
// mismatch.
//
// Why not a hidden form field? We're a JSON API. A header is
// the only thing the browser sends cross-origin that an
// attacker-controlled page cannot read. Same-origin policy
// already prevents the cross-origin attacker from reading
// the response, and the cookie is HttpOnly=false so the
// client-side fetcher can read it (via document.cookie) and
// copy it into the header.
//
// We deliberately don't enforce CSRF on /api/auth/* — those
// endpoints are the bootstrapping path (you don't have a
// session to protect, the rate limit + OTP lockout are the
// real defense) and on /api/log (degraded client reporting).

export const CSRF_COOKIE = 'csrf'
export const CSRF_HEADER = 'x-csrf-token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Routes that don't require CSRF protection. The auth path
// is the bootstrapping flow (the rate limiter + OTP lockout
// are the defense there); the log endpoint is degraded-client
// error reporting which is intentionally open.
const UNPROTECTED_PREFIXES = [
  '/api/auth/',
  '/api/log',
  '/api/health',
  '/api/push/subscribe' // sends a VAPID-signed body; rate-limited at the edge
]

function isUnprotected(pathname: string): boolean {
  for (const p of UNPROTECTED_PREFIXES) {
    if (pathname === p || pathname.startsWith(p)) return true
  }
  return false
}

// Generate a CSRF token. 32 random bytes -> base64url.
// Falls back to a Math.random()-based pseudo-random if Web
// Crypto is unavailable (which it always is in modern
// runtimes, but the fallback is there for safety).
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Compare two CSRF tokens in constant time. Both inputs are
// expected to be base64url-encoded; we use a simple
// char-by-char XOR to avoid early-exit timing.
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// Pure decision function: given the inputs the middleware
// has in hand, return one of three outcomes:
//   - { kind: 'pass' }  — the request may proceed
//   - { kind: 'set' }  — the request may proceed and the
//                         caller should also set a fresh cookie
//   - { kind: 'reject', reason } — the caller should respond
//                                  with 403 and the reason
// Exported for tests; the Next-coupling lives in
// csrf-middleware below.
export type CsrfDecision =
  | { kind: 'pass' }
  | { kind: 'set'; token: string }
  | { kind: 'reject'; reason: 'no_cookie' | 'no_header' | 'mismatch' }

export function csrfDecide(method: string, pathname: string, cookie: string | null, header: string | null): CsrfDecision {
  const m = method.toUpperCase()
  const isSafe = SAFE_METHODS.has(m)
  if (isUnprotected(pathname)) return { kind: 'pass' }
  if (isSafe) {
    if (!cookie) return { kind: 'set', token: generateCsrfToken() }
    return { kind: 'pass' }
  }
  if (!cookie) return { kind: 'reject', reason: 'no_cookie' }
  if (!header) return { kind: 'reject', reason: 'no_header' }
  if (!constantTimeEqual(cookie, header)) return { kind: 'reject', reason: 'mismatch' }
  return { kind: 'pass' }
}

// Pull the CSRF cookie out of a NextRequest.
export function getCsrfCookie(cookies: { get(name: string): { value: string } | undefined }): string | null {
  const c = cookies.get(CSRF_COOKIE)
  if (!c || typeof c.value !== 'string') return null
  return c.value
}
