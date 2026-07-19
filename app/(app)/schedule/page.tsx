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

const TEMPLATES: Array<{
  name: string
  hours: string
  status: 'Active' | 'Coming next' | 'Draft'
  description: string
}> = [
  {
    name: 'Cohort Standard',
    hours: '05:00–21:00',
    status: 'Active',
    description: 'The default 30-day cohort structure. Wake at 05:00, three deep-work blocks, reflection at 19:00.'
  },
  {
    name: 'Deep Work Intensive',
    hours: '07:00–22:00',
    status: 'Coming next',
    description: 'A two-week intensive for founders past day 14. Two 4-hour deep blocks, fewer breaks, later wake.'
  },
  {
    name: 'Recovery Variant',
    hours: '07:30–22:30',
    status: 'Draft',
    description: 'For members who need to come back after missing 3+ days. Softer ramp, one deep block, no critical-block reminders.'
  }
]

export default function Schedule() {
  return (
    <AppShell items={RAIL}>
      <p className="eyebrow">SCHEDULE ENGINE · LOCAL TIME</p>
      <h1>Choose the structure.</h1>
      <p className="muted">
        Templates are cohort-controlled. Your current template is the active one; switching templates
        is admin-controlled for the cohort and is not enabled in this release.
      </p>
      <section
        className="card"
        style={{ marginTop: 32 }}
        aria-label="Available schedule templates"
      >
        {TEMPLATES.map((tpl) => {
          const isActive = tpl.status === 'Active'
          return (
            <div
              key={tpl.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 20,
                padding: '20px 0',
                borderBottom: '1px solid var(--line)',
                alignItems: 'start'
              }}
            >
              <div>
                <b style={{ fontSize: 16 }}>{tpl.name}</b>
                <p className="muted" style={{ margin: '6px 0 0' }}>{tpl.hours}</p>
                <p className="muted" style={{ margin: '10px 0 0', maxWidth: 540 }}>{tpl.description}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--muted)',
                    fontSize: 12,
                    letterSpacing: '.1em'
                  }}
                  aria-label={`Status: ${tpl.status}`}
                >
                  {tpl.status.toUpperCase()}
                </span>
                <button
                  type="button"
                  className="button"
                  disabled={!isActive}
                  aria-disabled={!isActive}
                  aria-label={isActive ? `${tpl.name} is active` : `${tpl.name} is not available`}
                  style={{
                    background: isActive ? 'transparent' : 'var(--bg)',
                    color: isActive ? 'var(--accent)' : 'var(--muted)',
                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--line)',
                    cursor: isActive ? 'default' : 'not-allowed'
                  }}
                >
                  {isActive ? 'Active' : 'Locked'}
                </button>
              </div>
            </div>
          )
        })}
      </section>
      <p className="muted" style={{ marginTop: 30, fontSize: 12 }}>
        Adaptive scheduling (per-member schedule variation) is a paid-cohort roadmap item and is not part of the MVP.
      </p>
    </AppShell>
  )
}
