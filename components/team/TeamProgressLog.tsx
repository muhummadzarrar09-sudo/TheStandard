'use client'

import { useEffect, useState } from 'react'

type Entry = {
  id: string
  body: string
  category: 'update' | 'blocker' | 'milestone' | 'idea'
  link_url: string | null
  created_at: string
  author_id: string
  profiles?: { display_name: string | null } | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const CATEGORIES: Entry['category'][] = ['update', 'blocker', 'milestone', 'idea']

// The team progress log. Members can post short text + optional
// link + category. The category is a fixed enum (PRD §7.4).
// Display is reverse-chronological.
export default function TeamProgressLog({ teamId }: { teamId: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [category, setCategory] = useState<Entry['category']>('update')
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/team-progress?teamId=${encodeURIComponent(teamId)}`)
        if (!r.ok) throw new Error('load failed')
        const x = await r.json()
        if (!cancelled) setEntries(x.entries || [])
      } catch {
        if (!cancelled) setError('Could not load progress log.')
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [teamId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'saving') return
    if (!body.trim()) {
      setError('Body is required.')
      setState('error')
      return
    }
    setState('saving')
    setError(null)
    try {
      const r = await fetch('/api/team-progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          teamId,
          body: body.trim(),
          category,
          linkUrl: link.trim() || null
        })
      })
      if (!r.ok) {
        const x = await r.json().catch(() => ({} as any))
        setError(x.error || 'Could not save progress entry.')
        setState('error')
        return
      }
      const x = await r.json()
      if (x.entry) {
        // Prepend the new entry to the list (most recent first).
        setEntries(prev => [x.entry, ...prev])
      }
      setBody('')
      setLink('')
      setState('saved')
    } catch {
      setError('Network error. Check your connection and try again.')
      setState('error')
    }
  }

  if (!loaded) {
    return (
      <section className="card" style={{ marginTop: 15 }} aria-label="Team progress log">
        <p className="eyebrow">PROGRESS LOG</p>
        <p className="muted" role="status" style={{ marginTop: 12 }}>Loading log…</p>
      </section>
    )
  }

  const statusMsg =
    state === 'saving' ? 'Posting…' :
    state === 'saved' ? 'Posted' :
    state === 'error' ? error :
    ''

  return (
    <section className="card" style={{ marginTop: 15 }} aria-label="Team progress log">
      <p className="eyebrow">PROGRESS LOG</p>
      <form onSubmit={submit} style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <label htmlFor="progress-body" className="visually-hidden">Progress update</label>
        <textarea
          id="progress-body"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="What did the team ship, learn, or hit today?"
          maxLength={3000}
          required
          aria-describedby="progress-help"
          style={{
            width: '100%',
            minHeight: 70,
            padding: 12,
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
            font: 'inherit'
          }}
        />
        <small id="progress-help" className="muted" style={{ fontSize: 11 }}>
          Visible to your team. Private reflections stay private.
        </small>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="progress-category" className="visually-hidden">Category</label>
          <select
            id="progress-category"
            value={category}
            onChange={e => setCategory(e.target.value as Entry['category'])}
            aria-label="Category"
            style={{
              padding: 8,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              color: 'var(--text)'
            }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label htmlFor="progress-link" className="visually-hidden">Link (optional)</label>
          <input
            id="progress-link"
            type="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="Optional link (https://…)"
            maxLength={500}
            style={{
              flex: 1,
              padding: 8,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              color: 'var(--text)'
            }}
          />
          <button
            type="submit"
            className="button"
            disabled={state === 'saving' || !body.trim()}
            aria-busy={state === 'saving'}
          >
            {state === 'saving' ? 'Posting…' : 'Post update'}
          </button>
        </div>
        {statusMsg && (
          <p
            role="status"
            aria-live="polite"
            className="muted"
            style={{ color: state === 'error' ? '#ff8b82' : 'var(--accent)', fontSize: 12, margin: 0 }}
          >
            {statusMsg}
          </p>
        )}
      </form>
      <div style={{ marginTop: 20 }}>
        {entries.length === 0 ? (
          <p className="muted" style={{ margin: '12px 0 0' }}>
            No progress entries yet. Be the first to post.
          </p>
        ) : (
          entries.map(e => (
            <article
              key={e.id}
              style={{
                padding: '16px 0',
                borderTop: '1px solid var(--line)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <b>{e.profiles?.display_name || 'Member'}</b>
                <span className="muted" style={{ fontSize: 11 }}>
                  {new Date(e.created_at).toLocaleString()} · {e.category}
                </span>
              </div>
              <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{e.body}</p>
              {e.link_url && (
                <p style={{ margin: '6px 0 0', fontSize: 12 }}>
                  <a
                    href={e.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}
                  >
                    {e.link_url}
                  </a>
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  )
}
