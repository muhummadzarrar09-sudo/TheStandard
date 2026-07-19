'use client'

import { useEffect, useState } from 'react'

type Commitment = {
  id: string
  cohort_week: number
  title: string
  description: string
  user_weekly_commitments: { completed: boolean; note: string | null }[]
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function WeeklyCommitment() {
  const [data, setData] = useState<Commitment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<SaveState>('idle')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/commitments')
        if (!r.ok) throw new Error('load failed')
        const x = await r.json()
        if (!cancelled) setData(x.commitments || [])
      } catch {
        if (!cancelled) setError('Could not load commitments.')
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function toggle(c: Commitment) {
    const completed = !c.user_weekly_commitments?.[0]?.completed
    setState('saving')
    setError(null)
    try {
      const r = await fetch('/api/commitments', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commitmentId: c.id, completed })
      })
      if (!r.ok) {
        const x = await r.json().catch(() => ({} as any))
        setError(x.error || 'Could not save commitment.')
        setState('error')
        return
      }
      setData(x => x.map(y => y.id === c.id
        ? { ...y, user_weekly_commitments: [{ completed, note: null }] }
        : y
      ))
      setState('saved')
    } catch {
      setError('Network error. Check your connection and try again.')
      setState('error')
    }
  }

  if (!loaded) return null
  if (!data.length) return null

  const statusMsg =
    state === 'saving' ? 'Saving…' :
    state === 'saved' ? 'Saved' :
    state === 'error' ? error :
    ''

  return (
    <section className="card" style={{ marginTop: 15 }} aria-label="Weekly commitments">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="eyebrow">WEEKLY COMMITMENTS</p>
        {statusMsg && (
          <small
            role="status"
            aria-live="polite"
            className="muted"
            style={{ color: state === 'error' ? 'var(--danger)' : 'var(--accent)' }}
          >
            {statusMsg}
          </small>
        )}
      </div>
      {data.map(c => {
        const done = !!c.user_weekly_commitments?.[0]?.completed
        return (
          <div
            key={c.id}
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'start',
              padding: '16px 0',
              borderTop: '1px solid var(--line)'
            }}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              aria-label={`Mark "${c.title}" ${done ? 'incomplete' : 'complete'}`}
              onClick={() => toggle(c)}
              style={{
                padding: '5px 9px',
                background: done ? 'var(--accent)' : 'transparent',
                color: done ? 'var(--bg)' : 'var(--accent)',
                border: '1px solid var(--accent)',
                cursor: 'pointer'
              }}
            >
              {done ? '✓' : '○'}
            </button>
            <div>
              <b style={{ textDecoration: done ? 'line-through' : 'none' }}>{c.title}</b>
              <p className="muted" style={{ margin: '5px 0 0' }}>{c.description}</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}
