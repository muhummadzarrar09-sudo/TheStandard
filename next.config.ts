import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    // Conservative security baseline. We don't ship ads or third-party
    // trackers, so the policy is tight by default. The CSP allows
    // 'self' resources, inline styles (Next.js uses them in dev), and
    // the Supabase and Vercel hosts that the app actually contacts.
    const csp = [
      "default-src 'self'",
      // Next.js dev server injects inline styles and a WebSocket. Allow
      // 'unsafe-inline' for styles; in production the build hashes them
      // and this can be tightened. Allow ws: for the HMR client.
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // The app calls Supabase (REST + Realtime) and Vercel functions.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ].join('; ')

    return [
      {
        // Apply to all routes except Next internals (which are served by
        // their own static handlers) and the SW/manifest files.
        source: '/((?!_next/|sw\\.js$|manifest\\.json$|offline\\.html$|favicon\\.ico$|icons/).*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
        ]
      },
      {
        // SW and manifest can be served with the same policy; they don't
        // execute in a document context so the CSP is mostly belt and
        // suspenders.
        source: '/(sw\\.js|manifest\\.json)$',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      }
    ]
  }
}

export default nextConfig
