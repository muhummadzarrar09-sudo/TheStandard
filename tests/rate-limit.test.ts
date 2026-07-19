import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, clientIp, _resetRateLimitForTests } from '../lib/rate-limit'

function makeReq(headers: Record<string, string> = {}) {
  return {
    headers: {
      get(name: string): string | null {
        const v = headers[name.toLowerCase()]
        return v ?? null
      }
    }
  }
}

describe('rateLimit', () => {
  beforeEach(() => {
    _resetRateLimitForTests()
  })

  it('allows up to max requests within a window', () => {
    const req = makeReq({ 'x-forwarded-for': '1.1.1.1' })
    for (let i = 0; i < 5; i++) {
      const r = rateLimit(req, { key: 't1', max: 5, windowMs: 1000 })
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.remaining).toBe(4 - i)
    }
  })

  it('rejects the (max+1)th request with a 429-shaped result', () => {
    const req = makeReq({ 'x-forwarded-for': '2.2.2.2' })
    for (let i = 0; i < 3; i++) {
      const r = rateLimit(req, { key: 't2', max: 3, windowMs: 1000 })
      expect(r.ok).toBe(true)
    }
    const fourth = rateLimit(req, { key: 't2', max: 3, windowMs: 1000 })
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) {
      expect(fourth.response.status).toBe(429)
      expect(fourth.response.body.error).toMatch(/too many/i)
      expect(fourth.response.body.retry_after).toBeGreaterThan(0)
      expect(fourth.retryAfterSeconds).toBe(fourth.response.body.retry_after)
    }
  })

  it('counts each IP independently under the same key', () => {
    const a = makeReq({ 'x-forwarded-for': '3.3.3.3' })
    const b = makeReq({ 'x-forwarded-for': '4.4.4.4' })
    for (let i = 0; i < 2; i++) {
      expect(rateLimit(a, { key: 't3', max: 2, windowMs: 1000 }).ok).toBe(true)
    }
    // a is now full; b is fresh.
    expect(rateLimit(a, { key: 't3', max: 2, windowMs: 1000 }).ok).toBe(false)
    expect(rateLimit(b, { key: 't3', max: 2, windowMs: 1000 }).ok).toBe(true)
  })

  it('counts each key independently for the same IP', () => {
    const req = makeReq({ 'x-forwarded-for': '5.5.5.5' })
    for (let i = 0; i < 2; i++) {
      expect(rateLimit(req, { key: 't4a', max: 2, windowMs: 1000 }).ok).toBe(true)
    }
    expect(rateLimit(req, { key: 't4a', max: 2, windowMs: 1000 }).ok).toBe(false)
    expect(rateLimit(req, { key: 't4b', max: 2, windowMs: 1000 }).ok).toBe(true)
  })

  it('opens a new window after windowMs elapses', async () => {
    const req = makeReq({ 'x-forwarded-for': '6.6.6.6' })
    for (let i = 0; i < 2; i++) {
      expect(rateLimit(req, { key: 't5', max: 2, windowMs: 5 }).ok).toBe(true)
    }
    expect(rateLimit(req, { key: 't5', max: 2, windowMs: 5 }).ok).toBe(false)
    await new Promise(r => setTimeout(r, 8))
    const after = rateLimit(req, { key: 't5', max: 2, windowMs: 5 })
    expect(after.ok).toBe(true)
  })

  it('falls back to "unknown" when no IP header is present', () => {
    const req = makeReq({})
    expect(clientIp(req)).toBe('unknown')
    const r = rateLimit(req, { key: 't6', max: 1, windowMs: 1000 })
    expect(r.ok).toBe(true)
  })

  it('uses the left-most x-forwarded-for entry as the client IP', () => {
    const req = makeReq({ 'x-forwarded-for': '7.7.7.7, 10.0.0.1, 10.0.0.2' })
    expect(clientIp(req)).toBe('7.7.7.7')
  })

  it('uses x-real-ip when x-forwarded-for is absent', () => {
    const req = makeReq({ 'x-real-ip': '8.8.8.8' })
    expect(clientIp(req)).toBe('8.8.8.8')
  })
})
