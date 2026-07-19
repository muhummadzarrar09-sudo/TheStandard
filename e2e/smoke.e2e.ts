import { test, expect } from '@playwright/test'

// Pure smoke tests. They run without a real Supabase; they just
// verify that the public surfaces render and the auth endpoint
// behaves as documented (no enumeration, generic OK).
//
// Run with: npx playwright test
// The `.e2e.ts` extension keeps vitest (which defaults to
// `**/*.{test,spec}.?(c|m)[jt]s?(x)`) from picking these up.

test.describe('smoke', () => {
  test('landing page renders and mentions the brand', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBe(200)
    const html = await page.content()
    expect(html).toMatch(/DISCIPLINE/i)
    expect(html).toMatch(/Structure for people building something real/i)
  })

  test('login page renders the new auth flow', async ({ page }) => {
    const res = await page.goto('/login')
    expect(res?.status()).toBe(200)
    const html = await page.content()
    expect(html).toMatch(/Enter your email/i)
    // The form posts to /api/auth/request-otp (the new endpoint),
    // not directly to the Supabase Edge Function.
    expect(html).toMatch(/request-otp|auth\/request-otp/i)
  })

  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.service).toBe('discipline-os')
  })

  test('request-otp returns generic OK for unknown emails (no enumeration)', async ({ request }) => {
    const res = await request.post('/api/auth/request-otp', {
      data: { email: 'definitely-not-a-real-member@nowhere.invalid' }
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Either { ok: true, token: '<signed>' } if the email happens
    // to be provisioned in the test DB, or { ok: true, token: null }
    // if not. Both are the correct anti-enumeration behavior.
    expect(body.ok).toBe(true)
    if (body.token !== null) {
      // Token, if present, has the expected `body.sig` shape.
      expect(typeof body.token).toBe('string')
      expect(body.token.split('.').length).toBe(2)
    }
  })

  test('request-otp rejects malformed emails with 200 (not 400)', async ({ request }) => {
    // The generic OK contract is the security property: the caller
    // cannot distinguish "bad email" from "unknown email". So we
    // return 200 with { ok: true, token: null } for malformed input.
    const res = await request.post('/api/auth/request-otp', {
      data: { email: 'not-an-email' }
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.token).toBeNull()
  })

  test('not-found page renders with proper structure', async ({ page }) => {
    const res = await page.goto('/this-does-not-exist')
    expect(res?.status()).toBe(404)
    const html = await page.content()
    expect(html).toMatch(/This page does not exist/i)
    expect(html).toMatch(/Return to Today/i)
  })
})
