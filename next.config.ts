import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    // Static security headers. The Content-Security-Policy is set per-
    // request in middleware.ts so we can inject a nonce; here we set
    // the rest of the headers that don't need to vary.
    return [
      {
        // Apply to all routes except Next internals (which are served by
        // their own static handlers) and the SW/manifest files.
        source: '/((?!_next/|sw\\.js$|manifest\\.json$|offline\\.html$|favicon\\.ico$|icons/).*)',
        headers: [
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
