// OTP token signing + nonce bookkeeping. Pure functions, no I/O, so
// they can be unit-tested without a Next request fixture.
//
// The token format is `body.sig` where:
//   body = base64url(JSON({ email, exp, nonce }))
//   sig  = base64url(HMAC-SHA256(secret, body))
//
// `exp` is unix seconds. The token is rejected if exp < now.
//
// Nonces are tracked in a process-local Map so a token cannot be
// replayed. The Map is bounded (LRU-ish); for multi-instance
// deployments, swap for Redis SET + EX.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const SECRET = process.env.OTP_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-only-insecure-secret'

const MAX_NONCES = 10_000

export type OtpTokenPayload = {
  email: string
  exp: number // unix seconds
  nonce: string
}

function hmac(data: string): Buffer {
  return createHmac('sha256', SECRET).update(data).digest()
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(s: string): Buffer {
  const pad = '='.repeat((4 - s.length % 4) % 4)
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

export function signOtpToken(payload: OtpTokenPayload): string {
  const body = base64url(Buffer.from(JSON.stringify(payload)))
  const sig = base64url(hmac(body))
  return `${body}.${sig}`
}

export function verifyOtpToken(token: string): OtpTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = base64url(hmac(body))
  if (sig.length !== expected.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch { return null }
  let payload: OtpTokenPayload
  try {
    payload = JSON.parse(Buffer.from(base64urlDecode(body)).toString('utf8'))
  } catch { return null }
  if (typeof payload.email !== 'string' || typeof payload.exp !== 'number' || typeof payload.nonce !== 'string') return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

const usedNonces: Map<string, number> = new Map()

export function isOtpNonceUsed(nonce: string): boolean {
  const exp = usedNonces.get(nonce)
  if (exp === undefined) return false
  if (exp < Date.now()) {
    usedNonces.delete(nonce)
    return false
  }
  return true
}

export function recordOtpNonce(nonce: string, expMs: number): void {
  usedNonces.set(nonce, expMs)
  if (usedNonces.size > MAX_NONCES) {
    const first = usedNonces.keys().next().value
    if (first) usedNonces.delete(first)
  }
}

export function _resetOtpNonces(): void {
  usedNonces.clear()
}

export function _newOtpNonce(): string {
  return randomBytes(16).toString('hex')
}
