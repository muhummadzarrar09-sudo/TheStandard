'use client'

import { useEffect, useState } from 'react'

type M = {
  id: string
  title: string
  description: string
  status: 'planned' | 'in_progress' | 'blocked' | 'complete'
  due_at: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function MilestoneList({ teamId }: { teamId: string }) {
  const [m, setM] = useState<M[]>([])
  const [loaded, setLoaded] = useState(false)
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/milestones?teamId=${encodeURIComponent(teamId)}`)
        if (!r.ok) throw new Error('load failed')
        const x = await r.json()
        if (!cancelled) setM(x.milestones || [])
      } catch {
        if (!cancelled) setError('Could not load milestones.')
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [teamId])

  async function update(id: string, value: M['status']) {
    setState('saving')
    setError(null)
    try {
      const r = await fetch('/api/milestones', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status: value })
      })
      if (!r.ok) {
        const x = await r.json().catch(() => ({} as any))
        setError(x.error || 'Could not save milestone.')
        setState('error')
        return
      }
      setM(x => x.map(a => a.id === id ? { ...a, status: value } : a))
      setState('saved')
    } catch {
      setError('Network error. Check your connection and try again.')
      setState('error')
    }
  }

  if (!loaded) {
    return (
      <section className="card" style={{ marginTop: 15 }} aria-label="Milestones">
        <p className="eyebrow">MILESTONES</p>
        <p className="muted" role="status" style={{ marginTop: 12 }}>Loading milestones…</p>
      </section>
    )
  }

  const statusMsg =
    state === 'saving' ? 'Saving…' :
    state === 'saved' ? 'Saved' :
    state === 'error' ? error :
    ''

  return (
    <section className="card" style={{ marginTop: 15 }} aria-label="Milestones">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="eyebrow">MILESTONES</p>
        {statusMsg && (
          <small
            role="status"
            aria-live="polite"
            className="muted"
            style={{ color: state === 'error' ? '#ff8b82' : 'var(--accent)' }}
          >
            {statusMsg}
          </small>
        )}
      </div>
      {m.length ? m.map(x => (
        <div
          key={x.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 15,
            padding: '17px 0',
            borderBottom: '1px solid var(--line)',
            alignItems: 'start'
          }}
        >
          <div>
            <b>{x.title}</b>
            {x.description && <p className="muted" style={{ margin: '4px 0 0' }}>{x.description}</p>}
            {x.due_at && (
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 11 }}>
                Due {new Date(x.due_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <label>
            <span className="visually-hidden">Status for {x.title}</span>
            <select
              value={x.status}
              onChange={e => update(x.id, e.target.value as M['status'])}
              aria-label={`Status for ${x.title}`}
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--line)',
                padding: 8
              }}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </select>
          </label>
        </div>
      )) : (
        <p className="muted">No milestones assigned yet.</p>
      )}
    </section>
  )
}
