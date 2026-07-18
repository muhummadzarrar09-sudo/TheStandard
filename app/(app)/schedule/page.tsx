import AppShell from '../../../components/ui/AppShell'

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

const TEMPLATES: Array<[name: string, hours: string, status: 'Active' | 'Coming next' | 'Draft']> = [
  ['Cohort Standard', '05:00–21:00', 'Active'],
  ['Deep Work Intensive', '07:00–22:00', 'Coming next'],
  ['Recovery Variant', '07:30–22:30', 'Draft']
]

export default function Schedule() {
  return (
    <AppShell items={RAIL}>
      <p className="eyebrow">SCHEDULE ENGINE · LOCAL TIME</p>
      <h1>Choose the structure.</h1>
      <p className="muted">Templates are cohort-controlled. Adaptive scheduling is not enabled in this release.</p>
      <section
        className="card"
        style={{ marginTop: 32 }}
        aria-label="Available schedule templates"
      >
        {TEMPLATES.map(([name, hours, status], i) => (
          <div
            key={name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '18px 0',
              borderBottom: '1px solid var(--line)'
            }}
          >
            <div>
              <b>{name}</b>
              <p className="muted" style={{ margin: '5px 0 0' }}>{hours}</p>
            </div>
            <span
              style={{
                color: i === 0 ? 'var(--accent)' : 'var(--muted)',
                fontSize: 12
              }}
              aria-label={`Status: ${status}`}
            >
              {status}
            </span>
          </div>
        ))}
      </section>
    </AppShell>
  )
}
