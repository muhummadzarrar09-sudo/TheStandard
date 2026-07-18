import Link from 'next/link'
import { getPublishedReports } from '../../../lib/content/queries'
import AppShell from '../../../components/ui/AppShell'

export const dynamic = 'force-dynamic'

const RAIL = [
  { href: '/dashboard', key: 'rail.today' as const },
  { href: '/schedule', key: 'rail.schedule' as const },
  { href: '/tracker', key: 'rail.tracker' as const },
  { href: '/team', key: 'rail.team' as const },
  { href: '/team/chat', key: 'rail.teamChat' as const },
  { href: '/leaderboard', key: 'rail.leaderboard' as const },
  { href: '/reports', key: 'rail.reports' as const },
  { href: '/settings', key: 'rail.settings' as const }
]

export default async function Reports() {
  const reports = await getPublishedReports()
  const latest = reports[0]
  return (
    <AppShell items={RAIL}>
      <p className="eyebrow">INTELLIGENCE LIBRARY · INTERVIEWS</p>
      <h1>Study the standard.</h1>
      {latest ? (
        <article
          className="card"
          style={{
            marginTop: 32,
            background: 'linear-gradient(140deg, var(--surface), var(--bg))'
          }}
          aria-label={`Latest interview: ${latest.title}`}
        >
          <p className="eyebrow">
            LATEST INTERVIEW · {new Date(latest.published_at).toLocaleDateString()}
          </p>
          <h2 style={{ fontSize: 34, maxWidth: 550 }}>{latest.title}</h2>
          <p className="muted">{latest.summary}</p>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 15, marginTop: 25 }}>
            <Link href={`/reports/${latest.id}`} style={{ color: 'var(--accent)' }}>
              OPEN REPORT →
            </Link>
          </div>
        </article>
      ) : (
        <section className="card" style={{ marginTop: 32 }}>
          <p className="muted">No reports have been published yet. Return when the first interview is ready.</p>
        </section>
      )}
      <p className="eyebrow" style={{ marginTop: 45 }}>ARCHIVE</p>
      {reports.slice(1).map(r => (
        <Link
          key={r.id}
          className="card"
          style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 20 }}
          href={`/reports/${r.id}`}
        >
          <b>{r.title}</b>
          <span className="muted">{new Date(r.published_at).toLocaleDateString()}</span>
        </Link>
      ))}
    </AppShell>
  )
}
