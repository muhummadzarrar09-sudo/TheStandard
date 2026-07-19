'use client'

import { useEffect, useState } from 'react'
import { REPORT_CACHE_NAME } from '../../lib/offline/reports-cache'

type State = 'idle' | 'saving' | 'saved' | 'unsupported' | 'error'

// Save the current report detail page to the offline cache. The
// SW then serves the cached page on next visit when the network
// is gone. The cache name + limit live in lib/offline/reports-cache
// so the SW and this component share the same source of truth.
export default function SaveOfflineButton({ reportId }: { reportId: string }) {
  const [state, setState] = useState<State>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('caches' in window)) {
      setState('unsupported')
      return
    }
    caches.open(REPORT_CACHE_NAME).then(async c => {
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
      const res = await fetch(`/reports/${reportId}`, {
        credentials: 'same-origin',
        headers: { accept: 'text/html' }
      })
      if (!res.ok) throw new Error('fetch failed')
      const cache = await caches.open(REPORT_CACHE_NAME)
      await cache.put(`/reports/${reportId}`, res.clone())
      setState('saved')
    } catch {
      setState('error')
    }
  }

  async function remove() {
    if (typeof window === 'undefined' || !('caches' in window)) return
    try {
      const cache = await caches.open(REPORT_CACHE_NAME)
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
