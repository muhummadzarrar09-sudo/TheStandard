'use client'
import { useEffect, useState } from 'react'
import { ReportForm } from '../../../components/admin/AdminForms'

type Report = { id: string; title: string; published_at: string; version: number }

export default function ReportsAdmin() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/reports-list')
      const x = await r.json()
      if (!r.ok) throw new Error(x.error || 'Could not load reports')
      setReports(x.reports || [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onPublished = (report: { id: string; title: string }) => {
    setReports(prev => [{
      id: report.id,
      title: report.title,
      published_at: new Date().toISOString(),
      version: 1
    }, ...prev])
  }

  return (
    <>
      <p className="eyebrow">ADMIN · CONTENT</p>
      <h1>Publish intelligence.</h1>
      <section
        className="card"
        style={{ marginTop: 30 }}
        aria-labelledby="report-form"
      >
        <h2 id="report-form" style={{ position: 'absolute', left: -9999 }}>Publish a new report</h2>
        <ReportForm onPublished={onPublished} />
      </section>
      <section
        className="card"
        style={{ marginTop: 15 }}
        aria-labelledby="published-list"
      >
        <p className="eyebrow" id="published-list">PUBLISHED</p>
        {loading ? (
          <p className="muted" role="status">Loading reports…</p>
        ) : error ? (
          <p className="muted" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>
        ) : reports.length === 0 ? (
          <p className="muted">No reports published yet. Use the form above to publish the first one.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {reports.map(r => (
              <li
                key={r.id}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid var(--line)' }}
              >
                <div>
                  <b>{r.title}</b>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    Published {new Date(r.published_at).toLocaleString()} · version {r.version}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
