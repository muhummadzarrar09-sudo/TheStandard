'use client'

import { useEffect, useState } from 'react'

// PRD §7.6: "stale content must never appear as newly published."
// The service worker serves the cached report detail page on a
// reload. If the admin has republished (version bumps), the SW
// does the SWR dance — but a tab that's been open for hours may
// be showing a v3 page when the live version is v4. This small
// component periodically fetches the live version and shows a
// banner when the cached view is out of date.
//
// We fetch /api/reports/[id]/version (a tiny head-only endpoint)
// every 60s and on focus. The endpoint returns just the version
// + published_at; if it differs from what the SW served, the
// banner offers a refresh.

type LiveVersion = {
  version: number
  published_at: string
}

type State =
  | { kind: 'fresh' }
  | { kind: 'stale'; live: LiveVersion }
  | { kind: 'unsupported' }
  | { kind: 'error' }

export default function VersionBadge({ reportId, currentVersion }: { reportId: string; currentVersion: number }) {
  const [state, setState] = useState<State>({ kind: 'fresh' })

  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    async function check() {
      if (cancelled) return
      try {
        const r = await fetch(`/api/reports/${encodeURIComponent(reportId)}/version`, {
          cache: 'no-store',
          credentials: 'same-origin'
        })
        if (!r.ok) {
          if (!cancelled) setState({ kind: 'error' })
          return
        }
        const data: LiveVersion = await r.json()
        if (cancelled) return
        if (typeof data.version === 'number' && data.version > currentVersion) {
          setState({ kind: 'stale', live: data })
        } else {
          setState({ kind: 'fresh' })
        }
      } catch {
        if (!cancelled) setState({ kind: 'unsupported' })
      }
    }

    check()
    timer = setInterval(check, 60_000)
    const onFocus = () => check()
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
    }
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
      }
    }
  }, [reportId, currentVersion])

  if (state.kind !== 'stale') return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginTop: 18,
        padding: '10px 14px',
        border: '1px solid var(--accent)',
        background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
        color: 'var(--accent)',
        fontSize: 13,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        borderRadius: 'var(--radius)'
      }}
    >
      <span>
        A newer version is available (v{state.live.version}). You're reading v{currentVersion}.
      </span>
      <button
        type="button"
        onClick={() => { if (typeof window !== 'undefined') window.location.reload() }}
        className="button"
        style={{ padding: '4px 10px', fontSize: 12 }}
      >
        Refresh
      </button>
    </div>
  )
}
