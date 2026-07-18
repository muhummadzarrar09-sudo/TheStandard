'use client'

import { useEffect } from 'react'

// Top-level error boundary. Catches anything the (app) boundary does
// not (e.g. layout errors, root template errors). The page must render
// its own <html> and <body> because the boundary replaces the entire
// tree. We deliberately keep the page dark and minimal so a member
// who lands here doesn't think the product is broken in a confusing way.
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entries: [
            {
              level: 'error',
              msg: 'global error boundary caught',
              ctx: {
                digest: error.digest,
                name: error.name,
                message: error.message?.slice(0, 480),
                url: window.location.href
              }
            }
          ]
        }),
        keepalive: true
      }).catch(() => {})
    } catch {
      // never throw from a boundary
    }
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          background: '#090a0b',
          color: '#eef2ed',
          font: '14px system-ui, -apple-system, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center'
        }}
      >
        <main style={{ maxWidth: 480, padding: 32, textAlign: 'center' }}>
          <p style={{ color: '#899390', fontSize: 11, letterSpacing: '.15em' }}>TEMPORARY INTERRUPTION</p>
          <h1 style={{ fontSize: 22, margin: '12px 0' }}>The standard is still here.</h1>
          <p style={{ color: '#899390', margin: '0 0 18px', lineHeight: 1.5 }}>
            The app could not start. Your saved local state is safe.
            {error.digest && (
              <>
                {' '}Reference: <code>{error.digest}</code>
              </>
            )}
          </p>
          <button
            onClick={reset}
            style={{
              background: '#c7f36b',
              color: '#10140c',
              border: 0,
              padding: '12px 16px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Try again →
          </button>
        </main>
      </body>
    </html>
  )
}
