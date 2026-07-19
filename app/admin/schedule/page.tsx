'use client'

import { useEffect, useState } from 'react'

type Config = {
  cohortId: string | null
  cutoffHour: number
  templateVersion: number
  exists: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// Admin schedule config page (PRD §7.1: "Day cutoff: default
// 03:00 local time the following day, configurable by admin.").
// The admin sets a single integer (0..23) which becomes the
// local cutoff hour. The schedule template itself is not
// editable here; this page exposes the per-cohort knob that
// PRD §7.1 calls out as configurable.
export default function AdminSchedule() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hour, setHour] = useState<number>(3)
  const [state, setState] = useState<SaveState>('idle')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/admin/schedule')
        const x = await r.json()
        if (cancelled) return
        if (!r.ok) {
          setError(x.error || 'Could not load schedule config.')
          setLoading(false)
          return
        }
        setConfig(x)
        setHour(x.cutoffHour)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load schedule config.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function save() {
    if (!config) return
    setState('saving')
    setError(null)
    try {
      const r = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cutoffHour: hour })
      })
      const x = await r.json()
      if (!r.ok) {
        setError(x.error || 'Could not save.')
        setState('error')
        return
      }
      setConfig(x)
      setState('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.')
      setState('error')
    }
  }

  if (loading) {
    return (
      <>
        <p className="eyebrow">ADMIN · SCHEDULE</p>
        <h1>Configure the cutoff.</h1>
        <p className="muted" role="status">Loading config…</p>
      </>
    )
  }
  if (!config?.cohortId) {
    return (
      <>
        <p className="eyebrow">ADMIN · SCHEDULE</p>
        <h1>Configure the cutoff.</h1>
        <p className="muted">
          No cohort is associated with this admin yet. Create or activate a cohort first.
        </p>
      </>
    )
  }

  return (
    <>
      <p className="eyebrow">ADMIN · SCHEDULE</p>
      <h1>Configure the cutoff.</h1>
      <p className="muted">
        Required blocks not completed by the cutoff hour count as missed. The cutoff
        runs in each member's local timezone; the hour is per-cohort, not per-member.
      </p>
      <section
        className="card"
        style={{ marginTop: 30, maxWidth: 480 }}
        aria-labelledby="cutoff-form"
      >
        <h2 id="cutoff-form" className="visually-hidden">Cutoff hour</h2>
        <label htmlFor="cutoff-hour" className="eyebrow">CUTOFF HOUR (LOCAL, 0–23)</label>
        <input
          id="cutoff-hour"
          type="number"
          min={0}
          max={23}
          step={1}
          value={hour}
          onChange={e => {
            const n = Number(e.target.value)
            setHour(Number.isFinite(n) ? n : hour)
            setState('idle')
          }}
          className="input"
          style={{ marginTop: 8 }}
        />
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          Current: <b style={{ color: 'var(--accent)' }}>{String(config.cutoffHour).padStart(2, '0')}:00</b>.
          {' '}{config.exists
            ? `Schedule template version: v${config.templateVersion}.`
            : 'No config row yet; saving will create one.'}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18 }}>
          <button
            type="button"
            className="button"
            onClick={save}
            disabled={state === 'saving' || hour === config.cutoffHour}
          >
            {state === 'saving' ? 'Saving…' : 'Save cutoff'}
          </button>
          <span
            role="status"
            aria-live="polite"
            className="muted"
            style={{ fontSize: 12, color: state === 'error' ? 'var(--danger)' : 'var(--accent)' }}
          >
            {state === 'error' ? error : state === 'saved' ? 'Saved.' : ''}
          </span>
        </div>
        {error && state !== 'error' && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>
            {error}
          </p>
        )}
      </section>
    </>
  )
}
