'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Metrics = Array<[label: string, value: string, detail: string]>

const initial: Metrics = [
  ['MEMBERS', '—', 'Eligible cohort members'],
  ['COMPLETED CHECK-INS', '—', 'Server-recorded full-day check-ins'],
  ['TEAMS', '—', 'Active startup teams']
]

export default function Analytics() {
  const [metrics, setMetrics] = useState<Metrics>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/admin/analytics')
        const x = await r.json()
        if (cancelled) return
        if (x.metrics) {
          setMetrics([
            ['MEMBERS', String(x.metrics.members), 'Eligible cohort members'],
            ['COMPLETED CHECK-INS', String(x.metrics.completedCheckins), 'Server-recorded full-day check-ins'],
            ['TEAMS', String(x.metrics.teams), 'Active startup teams']
          ])
        }
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <p className="eyebrow">ADMIN · COHORT INTELLIGENCE</p>
      <h1>See the standard hold.</h1>
      <p className="muted">
        Aggregated cohort signals only. Private reflections and personal notes are never shown here.
      </p>
      {error && (
        <p role="alert" className="muted" style={{ color: 'var(--danger)', marginTop: 12 }}>
          {error}
        </p>
      )}
      <div
        className="grid"
        style={{ marginTop: 32 }}
        role="group"
        aria-label="Cohort metrics"
        aria-busy={loading}
      >
        {metrics.map(([label, value, detail]) => (
          <section className="card" key={label} aria-label={label}>
            <p className="eyebrow">{label}</p>
            <h2>{value}</h2>
            <p className="muted">{detail}</p>
          </section>
        ))}
      </div>
      <section className="card" style={{ marginTop: 15 }} aria-label="Operations">
        <p className="eyebrow">OPERATIONS</p>
        <h3>Attention queue</h3>
        <p className="muted">
          Use aggregate signals as context, not diagnosis. Member-level intervention requires human judgment.
        </p>
        <Link className="button" href="/admin/members">Review members →</Link>
      </section>
    </>
  )
}
