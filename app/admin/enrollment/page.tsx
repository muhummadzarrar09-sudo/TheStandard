'use client'
import { useEffect, useState } from 'react'

type Cohort = { id: string; name: string; status: 'draft' | 'enrolling' | 'active' | 'closed' | 'archived' }

export default function Enrollment() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/admin/cohorts')
        if (!r.ok) throw new Error('Could not load cohorts')
        const x = await r.json()
        if (cancelled) return
        const list = (x.cohorts || []) as Cohort[]
        setCohorts(list)
        if (list.length > 0) setSelectedId(list[0].id)
      } catch (e) {
        if (!cancelled) setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Load failed' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const selected = cohorts.find(c => c.id === selectedId)
  const isOpen = selected?.status === 'enrolling'

  async function toggle() {
    if (!selected || busy) return
    setBusy(true)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/enrollment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cohortId: selected.id, open: !isOpen })
      })
      const x = await r.json().catch(() => ({} as any))
      if (!r.ok) {
        setMessage({ kind: 'err', text: x.error || 'Could not update enrollment' })
        return
      }
      setMessage({
        kind: 'ok',
        text: isOpen ? 'Enrollment closed. New signups blocked.' : 'Enrollment opened. Eligible emails may request a code.'
      })
      setCohorts(prev => prev.map(c => c.id === x.cohort.id ? { ...c, status: x.cohort.status } : c))
    } catch {
      setMessage({ kind: 'err', text: 'Network error.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="eyebrow">ADMIN · ENROLLMENT</p>
      <h1>Control the window.</h1>

      <section className="card" style={{ marginTop: 30 }} aria-labelledby="cohort-picker">
        <p className="eyebrow" id="cohort-picker">COHORT</p>
        {loading ? (
          <p className="muted" role="status">Loading cohorts…</p>
        ) : cohorts.length === 0 ? (
          <p className="muted">No cohorts yet. Create one in Supabase to get started.</p>
        ) : (
          <label style={{ display: 'block' }}>
            <span className="visually-hidden" style={{ position: 'absolute', left: -9999 }}>Select cohort</span>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="input"
              style={{ minWidth: 280 }}
            >
              {cohorts.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
          </label>
        )}
      </section>

      {selected && (
        <section
          className="card"
          style={{ marginTop: 15 }}
          aria-labelledby="otp-status"
          aria-live="polite"
        >
          <p className="eyebrow" id="otp-status">OTP REGISTRATION</p>
          <h2 style={{ color: isOpen ? 'var(--accent)' : 'var(--muted)' }}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </h2>
          <p className="muted">
            {isOpen
              ? 'Eligible emails may request a six-digit code.'
              : 'No new signup OTPs will be issued. Existing members retain access.'}
          </p>
          <button
            className="button"
            onClick={toggle}
            disabled={busy}
            style={{ marginTop: 12 }}
          >
            {busy ? 'Updating…' : isOpen ? 'Close enrollment' : 'Open enrollment'}
          </button>
          {message && (
            <p
              role="status"
              className="muted"
              style={{ marginTop: 12, color: message.kind === 'err' ? 'var(--danger)' : 'var(--accent)' }}
            >
              {message.text}
            </p>
          )}
        </section>
      )}
    </>
  )
}
