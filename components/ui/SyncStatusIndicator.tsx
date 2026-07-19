'use client'

import { useEffect, useState } from 'react'
import { peekOutbox, readLastSyncAt } from '../../lib/offline/outbox'
import { t } from '../../lib/copy'

// The offline sync status surface (PRD §10):
//   "Show sync status and last synced time."
//
// The outbox holds schedule-block completions captured while
// the network was down. The indicator surfaces:
//   - The number of pending completions (with the oldest age).
//   - The "last synced N minutes ago" timestamp when the outbox
//     is empty (or hidden when nothing has ever synced).
//   - "Offline" when navigator.onLine is false and the outbox
//     has items.
//
// The indicator is intentionally quiet when the user is
// online and has nothing pending; it surfaces information
// without being noisy.

type State =
  | { kind: 'pending'; count: number; oldestAt: number }
  | { kind: 'syncing' }
  | { kind: 'idle'; lastSyncAt: number | null }
  | { kind: 'unsupported' }

function formatAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

export default function SyncStatusIndicator() {
  const [state, setState] = useState<State>({ kind: 'idle', lastSyncAt: null })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    async function tick() {
      if (cancelled) return
      if (typeof indexedDB === 'undefined') {
        setState({ kind: 'unsupported' })
        return
      }
      try {
        const events = await peekOutbox()
        if (cancelled) return
        if (events.length > 0) {
          const oldest = events.reduce((m, e) => Math.min(m, e.createdAt), events[0].createdAt)
          setState({ kind: 'pending', count: events.length, oldestAt: oldest })
        } else {
          setState({ kind: 'idle', lastSyncAt: readLastSyncAt() })
        }
      } catch {
        if (!cancelled) setState({ kind: 'unsupported' })
      }
    }

    tick()
    timer = setInterval(tick, 5000)
    const onOnline = () => tick()
    const onOffline = () => tick()
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
    }

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
      }
    }
  }, [])

  if (state.kind === 'unsupported') return null
  if (state.kind === 'idle' && !state.lastSyncAt) return null

  let body: string
  let accent: 'pending' | 'syncing' | 'ok' = 'ok'
  if (state.kind === 'pending') {
    accent = 'pending'
    if (state.count === 1) {
      body = `1 completion pending · queued ${formatAgo(state.oldestAt)}`
    } else {
      body = `${state.count} completions pending · oldest ${formatAgo(state.oldestAt)}`
    }
  } else if (state.kind === 'syncing') {
    accent = 'syncing'
    body = 'Syncing…'
  } else {
    accent = 'ok'
    body = `Synced · last ${formatAgo(state.lastSyncAt as number)}`
  }

  const color = accent === 'pending' ? 'var(--danger)' : accent === 'ok' ? 'var(--accent)' : 'var(--muted)'

  return (
    <p
      className="muted"
      role="status"
      aria-live="polite"
      style={{ fontSize: 11, letterSpacing: '.1em', color, margin: 0 }}
      aria-label={t('sync.indicatorAria')}
    >
      {body}
    </p>
  )
}
