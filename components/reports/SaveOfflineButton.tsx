'use client'

import { useEffect, useState } from 'react'

type State = 'idle' | 'saving' | 'saved' | 'unsupported' | 'error'

export default function SaveOfflineButton({ reportId }: { reportId: string }) {
  const [state, setState] = useState<State>('idle')

  // Read the saved state from cache on mount so the button reflects the
  // current cached state even after a hard reload.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('caches' in window)) {
      setState('unsupported')
      return
    }
    caches.open('discipline-reports-v2').then(async c => {
      const hit = await c.match(`/reports/${reportId}`)
      setState(hit ? 'saved' : 'idle')
    }).catch(() => setState('unsupported'))
  }, [reportId])

  async function save() {
    if (typeof window === 'undefined' || !('caches' in window)) {
      setState('unsupported')
      return
    }
    setState('saving')
    try {
      // Fetch a public-friendly version of the report. For MVP, the
      // current page URL is what we'll cache (browsers will request the
      // current page on next offline visit and the SW will serve cached
      // HTML or fall through to network).
      const res = await fetch(`/reports/${reportId}`, {
        credentials: 'same-origin',
        headers: { 'accept': 'text/html' }
      })
      if (!res.ok) throw new Error('fetch failed')
      const cache = await caches.open('discipline-reports-v2')
      await cache.put(`/reports/${reportId}`, res.clone())
      setState('saved')
    } catch {
      setState('error')
    }
  }

  async function remove() {
    if (typeof window === 'undefined' || !('caches' in window)) return
    try {
      const cache = await caches.open('discipline-reports-v2')
      await cache.delete(`/reports/${reportId}`)
      setState('idle')
    } catch {
      // ignore
    }
  }

  if (state === 'unsupported') {
    return (
      <button className="button" disabled style={{ marginTop: 18, opacity: 0.6 }}>
        Offline reading not supported on this device
      </button>
    )
  }
  if (state === 'saved') {
    return (
      <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className="muted" style={{ color: 'var(--accent)' }}>✓ Saved for offline reading</span>
        <button
          type="button"
          onClick={remove}
          className="muted"
          style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}
        >
          Remove offline copy
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      className="button"
      onClick={save}
      disabled={state === 'saving'}
      style={{ marginTop: 18 }}
    >
      {state === 'saving' ? 'Saving…' : state === 'error' ? 'Retry save' : 'Save for offline reading'}
    </button>
  )
}
