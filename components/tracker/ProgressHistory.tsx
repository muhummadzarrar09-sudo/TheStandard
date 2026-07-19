'use client'
import { useMemo } from 'react'

type CheckinRow = { local_date: string; completed: boolean }

export default function ProgressHistory({
  windowStart,
  checkins
}: {
  windowStart: string
  checkins: CheckinRow[]
}) {
  const map = useMemo(() => new Map(checkins.map(x => [x.local_date, x.completed])), [checkins])
  // Build the 30-day window from windowStart, not Date.now(). Earlier code
  // shifted the grid by the server's local date, which disagreed with the
  // client's date in some timezones.
  const days = useMemo(() => {
    const out: string[] = []
    const start = new Date(windowStart + 'T00:00:00Z')
    for (let i = 0; i < 30; i++) {
      const d = new Date(start.getTime() + i * 86400000)
      out.push(d.toISOString().slice(0, 10))
    }
    return out
  }, [windowStart])
  const completeCount = checkins.filter(x => x.completed && days.includes(x.local_date)).length
  return (
    <section className="card" style={{ marginTop: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p className="eyebrow">30-DAY RECORD</p>
        <span className="muted">{completeCount} complete days</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6, marginTop: 20 }}>
        {days.map(d => (
          <div
            key={d}
            title={d}
            style={{
              aspectRatio: '1',
              background: map.get(d) ? 'var(--accent)' : 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: 3
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 15, marginTop: 14, fontSize: 11 }}>
        <span>
          <span aria-hidden="true" style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent)', marginRight: 5 }} />
          Complete
        </span>
        <span className="muted">Empty days remain visible</span>
      </div>
    </section>
  )
}
