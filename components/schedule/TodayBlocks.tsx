'use client'

import { useEffect, useMemo, useState } from 'react'
import { completionPercent, type ScheduleBlock } from '../../lib/domain'
import { flushCompletions, queueCompletion } from '../../lib/offline/outbox'

type Props = {
  initialDone?: string[]
  schedule: ScheduleBlock[]
}

export default function TodayBlocks({ initialDone = [], schedule }: Props) {
  const [done, setDone] = useState<string[]>(initialDone)
  const [status, setStatus] = useState('Saved locally')
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  useEffect(() => {
    flushCompletions(async e => {
      const r = await fetch('/api/schedule/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blockKey: e.blockKey, timezone: e.timezone, clientEventId: e.clientEventId })
      })
      if (!r.ok) throw new Error('sync')
    })
      .then(() => setStatus('Synced'))
      .catch(() => setStatus('Offline queue pending'))
  }, [])

  async function toggle(key: string) {
    if (done.includes(key)) return
    const event = { clientEventId: crypto.randomUUID(), blockKey: key, timezone, createdAt: Date.now() }
    setDone(x => [...x, key])
    if (!navigator.onLine) {
      await queueCompletion(event)
      setStatus('Queued offline')
      return
    }
    const r = await fetch('/api/schedule/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ blockKey: key, timezone, clientEventId: event.clientEventId })
    })
    if (!r.ok) {
      await queueCompletion(event)
      setStatus('Queued for retry')
    } else {
      setStatus('Synced')
    }
  }

  const completed = new Set<string>(done)
  return (
    <section className="card" style={{ marginTop: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p className="eyebrow">EXECUTION TIMELINE</p>
        <span className="muted" style={{ fontSize: 11 }}>
          {status} · {completionPercent(schedule, completed)}%
        </span>
      </div>
      {schedule.map(b => (
        <div
          key={b.key}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--line)' }}
        >
          <div>
            <b style={{ textDecoration: done.includes(b.key) ? 'line-through' : 'none', opacity: done.includes(b.key) ? 0.55 : 1 }}>
              {b.label}
            </b>
            <p className="muted" style={{ margin: 4, fontSize: 11 }}>
              {b.start}{b.end ? `–${b.end}` : ''} · {b.required ? 'Required' : 'Protected time'}
              {b.critical ? ' · Critical' : ''}
            </p>
          </div>
          <button
            className="button"
            onClick={() => toggle(b.key)}
            disabled={done.includes(b.key)}
            aria-label={`Complete ${b.label}`}
            style={{ transition: 'all 0.2s ease' }}
          >
            {done.includes(b.key) ? '✓' : 'Complete'}
          </button>
        </div>
      ))}
    </section>
  )
}
