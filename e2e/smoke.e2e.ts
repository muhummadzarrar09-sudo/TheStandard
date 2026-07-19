import { test, expect } from '@playwright/test'

// Pure smoke tests. They run without a real Supabase; they just
// verify that the public surfaces render and the auth endpoint
// behaves as documented (no enumeration, generic OK).
//
// Run with: npx playwright test
// The `.e2e.ts` extension keeps vitest (which defaults to
// `**/*.{test,spec}.?(c|m)[jt]s?(x)`) from picking these up.
//
// These tests assume a running dev server (`E2E=1 npx playwright
// test` boots one via playwright.config.ts's webServer block).

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
    expect(html).toMatch(/request-otp|auth\/request-otp/i)
  })

  test('verify page renders the OTP input + resend', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => {
      sessionStorage.setItem('discipline-login-email', 'a@b.co')
      sessionStorage.setItem('discipline-login-token', 'seed')
    })
    const res = await page.goto('/verify')
    expect(res?.status()).toBe(200)
    const html = await page.content()
    expect(html).toMatch(/Enter your code/i)
    expect(html).toMatch(/Resend code/i)
  })

  test('health endpoint returns 200 with the expected shape', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.service).toBe('discipline-os')
  })

  test('health endpoint echoes the x-request-id header', async ({ request }) => {
    const res = await request.get('/api/health', {
      headers: { 'x-request-id': 'test-req-123' }
    })
    expect(res.headers()['x-request-id']).toBe('test-req-123')
  })

  test('request-otp returns generic OK for unknown emails (no enumeration)', async ({ request }) => {
    const res = await request.post('/api/auth/request-otp', {
      data: { email: 'definitely-not-a-real-member@nowhere.invalid' }
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    if (body.token !== null) {
      expect(typeof body.token).toBe('string')
      expect(body.token.split('.').length).toBe(2)
    }
  })

  test('request-otp rejects malformed emails with 200 (not 400)', async ({ request }) => {
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

  test('login page has the correct form action + a11y wiring', async ({ page }) => {
    await page.goto('/login')
    const form = page.locator('form').first()
    await expect(form).toBeVisible()
    const input = page.locator('input#email')
    await expect(input).toBeVisible()
    await expect(input).toHaveAttribute('type', 'email')
    await expect(input).toHaveAttribute('required', '')
  })

  test('protected routes redirect to /login when unauthenticated', async ({ page, context }) => {
    await context.clearCookies()
    const res = await page.goto('/dashboard')
    expect(page.url()).toMatch(/\/login/)
    expect(res?.status()).toBeLessThan(400)
  })

  test('CSP header is set on every public response', async ({ request }) => {
    const res = await request.get('/login')
    const csp = res.headers()['content-security-policy']
    expect(csp).toBeDefined()
    expect(csp).toMatch(/default-src 'self'/)
    expect(csp).toMatch(/frame-ancestors 'none'/)
  })

  test('X-Content-Type-Options and Referrer-Policy are set', async ({ request }) => {
    const res = await request.get('/login')
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
    expect(res.headers()['referrer-policy']).toMatch(/strict-origin/)
  })
})
