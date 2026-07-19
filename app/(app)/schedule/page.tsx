import { createSupabaseServer } from '../../../lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '../../../components/ui/AppShell'
import { getScheduleForCohort, getScheduleConfigForCohort } from '../../../lib/schedule-source'

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

export const dynamic = 'force-dynamic'

export default async function Schedule() {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await db
    .from('profiles')
    .select('cohort_id, timezone')
    .eq('id', user.id)
    .single()
  const cohortId = profile?.cohort_id || null
  const timezone = profile?.timezone || 'UTC'
  const [schedule, config] = await Promise.all([
    getScheduleForCohort(cohortId),
    getScheduleConfigForCohort(cohortId)
  ])

  return (
    <AppShell items={RAIL}>
      <p className="eyebrow">SCHEDULE ENGINE · LOCAL TIME</p>
      <h1>Today's structure.</h1>
      <p className="muted">
        The schedule is defined by your cohort's template. Switching templates
        is admin-controlled. Cutoff is {String(config.cutoffHour).padStart(2, '0')}:00 local time
        (next day); required blocks not completed by then count as missed.
      </p>
      <section
        className="card"
        style={{ marginTop: 32 }}
        aria-label="Your schedule"
      >
        {schedule.map(b => (
          <div
            key={b.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr auto',
              gap: 20,
              padding: '14px 0',
              borderBottom: '1px solid var(--line)',
              alignItems: 'start'
            }}
          >
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>{b.start}{b.end ? `–${b.end}` : ''}</p>
            </div>
            <div>
              <b>{b.label}</b>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 11 }}>
                {b.required ? 'Required' : 'Protected'}
                {b.critical ? ' · Critical' : ''}
              </p>
            </div>
            <div style={{ alignSelf: 'center' }}>
              {b.critical ? (
                <span
                  style={{
                    background: 'var(--accent)',
                    color: '#10140c',
                    padding: '3px 8px',
                    fontSize: 10,
                    letterSpacing: '.1em',
                    fontWeight: 700
                  }}
                  aria-label="Critical block"
                >
                  CRITICAL
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </section>
      <p className="muted" style={{ marginTop: 30, fontSize: 12 }}>
        Your timezone: {timezone}.
      </p>
    </AppShell>
  )
}
