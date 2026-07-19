'use client'

import { useEffect, useState } from 'react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function DailyCheckin() {
  const [reflection, setReflection] = useState('')
  const [completed, setCompleted] = useState(false)
  const [state, setState] = useState<SaveState>('idle')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/checkins')
        if (!r.ok) throw new Error('load failed')
        const x = await r.json()
        if (cancelled) return
        const c = x.checkins?.[0]
        if (c) {
          setCompleted(c.completed)
          setReflection(c.reflection_private || '')
        }
      } catch {
        if (!cancelled) setError('Could not load today\'s check-in.')
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setState('saving')
    setError(null)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const r = await fetch('/api/checkins', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ completed, reflection, timezone })
      })
      if (!r.ok) {
        const x = await r.json().catch(() => ({} as any))
        setError(x.error || 'Could not save check-in.')
        setState('error')
        return
      }
      setState('saved')
    } catch {
      setError('Network error. Check your connection and try again.')
      setState('error')
    }
  }

  const statusMessage =
    state === 'saving' ? 'Saving…' :
    state === 'saved' ? 'Saved' :
    state === 'error' ? error :
    ''

  return (
    <section className="card" style={{ marginTop: 15 }} aria-labelledby="daily-checkin-heading">
      <p className="eyebrow">19:00 · DAILY CHECK-IN</p>
      <h3 id="daily-checkin-heading">Close the day deliberately.</h3>
      {!loaded ? (
        <p className="muted" role="status" style={{ marginTop: 18 }}>Loading today&apos;s check-in…</p>
      ) : (
        <>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '18px 0' }}>
            <input
              type="checkbox"
              checked={completed}
              onChange={e => setCompleted(e.target.checked)}
              aria-describedby="checkin-completed-desc"
            />
            <span id="checkin-completed-desc">I completed today&apos;s required standard.</span>
          </label>
          <label htmlFor="reflection" className="visually-hidden">Private reflection</label>
          <textarea
            id="reflection"
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            maxLength={5000}
            placeholder="What did you execute? What changes tomorrow?"
            aria-describedby="reflection-help reflection-counter"
            className="input"
            style={{ minHeight: 110, font: 'inherit' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <small id="reflection-help" className="muted">Private reflection · <span id="reflection-counter">{reflection.length}/5000</span></small>
            <button
              className="button"
              onClick={save}
              disabled={state === 'saving'}
              aria-busy={state === 'saving'}
            >
              {state === 'saving' ? 'Saving…' : 'Save check-in'}
            </button>
          </div>
          {statusMessage && (
            <p
              role="status"
              aria-live="polite"
              className="muted"
              style={{
                marginTop: 8,
                color: state === 'error' ? 'var(--danger)' : 'var(--accent)',
                fontSize: 12
              }}
            >
              {statusMessage}
            </p>
          )}
        </>
      )}
    </section>
  )
}
