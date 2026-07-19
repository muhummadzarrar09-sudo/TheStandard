// Playwright config. Drives the e2e suite defined in
// tests/e2e/*.spec.ts. The full e2e suite is opt-in (it needs a
// running Supabase + Stripe + VAPID + a deployed app). The
// "smoke" project runs against the local dev server without any
// external dependencies and is what CI executes on every push.
//
// To run the full e2e suite locally:
//   1. supabase start
//   2. supabase db reset (runs migrations + seed)
//   3. cp .env.example .env.local and fill in the dev creds
//   4. npm run dev
//   5. npm run e2e
//
// Until the e2e harness is in place, the smoke project is the
// automated check. It verifies that:
//   - The root URL renders (200) and the landing page HTML mentions
//     the brand.
//   - /login renders (200) and the form posts to the new auth flow.
//   - /api/auth/request-otp returns { ok: true } for any well-formed
//     email (no enumeration) and a 400 for malformed input.
//   - /api/health returns 200.

import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.PORT || '3000'
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: process.env.E2E
    ? { command: 'npm run dev', url: BASE_URL, reuseExistingServer: !process.env.CI, timeout: 120_000 }
    : undefined
})
