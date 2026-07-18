'use client'

import { useEffect } from 'react'

// Error boundary for authenticated app routes. Reports the error to
// /api/log with the digest so an ops engineer can correlate the
// client-side failure with the server logs. The user sees a calm
// retry affordance, not a stack trace.

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Best-effort: report and move on. Never block the user.
    if (typeof window === 'undefined') return
    const payload = {
      entries: [
        {
          level: 'error',
          msg: 'route error boundary caught',
          ctx: {
            digest: error.digest,
            name: error.name,
            message: error.message?.slice(0, 480),
            url: window.location.href,
            ua: navigator.userAgent.slice(0, 200)
          }
        }
      ]
    }
    try {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => { /* network gone, oh well */ })
    } catch {
      // never throw from a boundary
    }
  }, [error])

  return (
    <main className="main">
      <p className="eyebrow">TEMPORARY INTERRUPTION</p>
      <h1>The standard is still here.</h1>
      <p className="muted">
        We could not load this surface. Your saved local state is safe.
        {error.digest && (
          <>
            {' '}Reference: <code>{error.digest}</code>
          </>
        )}
      </p>
      <button className="button" onClick={reset}>Try again →</button>
    </main>
  )
}
