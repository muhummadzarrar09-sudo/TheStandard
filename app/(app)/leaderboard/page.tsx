import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../../lib/supabase/server'
import MetricCard from '../../../components/ui/MetricCard'
import EmptyState from '../../../components/ui/EmptyState'
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

export default async function Leaderboard() {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await db
    .from('profiles')
    .select('cohort_id')
    .eq('id', user.id)
    .single()
  const cohortId = profile?.cohort_id

  if (!cohortId) {
    return (
      <AppShell items={RAIL}>
        <p className="eyebrow">LEADERBOARD</p>
        <h1>Keep the line.</h1>
        <EmptyState
          eyebrow="NOT YET"
          title="Your cohort isn't activated yet."
          body="Once the cohort lead activates your cohort and the daily engine starts running, the leaderboard will rank members by current streak, completion percentage, completed days, and join time."
        />
      </AppShell>
    )
  }

  // Order: current_streak desc, completion_pct desc, completed_days desc, joined_at asc.
  const { data: rows, error } = await db
    .from('leaderboard_projection')
    .select('user_id, current_streak, completion_pct, completed_days, joined_at, profiles!inner(display_name)')
    .eq('cohort_id', cohortId)
    .order('current_streak', { ascending: false })
    .order('completion_pct', { ascending: false })
    .order('completed_days', { ascending: false })
    .order('joined_at', { ascending: true })

  if (error) {
    return (
      <AppShell items={RAIL}>
        <p className="eyebrow">LEADERBOARD</p>
        <h1>Keep the line.</h1>
        <p className="muted">Leaderboard temporarily unavailable. Try again in a moment.</p>
      </AppShell>
    )
  }

  const ranked = (rows || []).map((r: any, i: number) => ({
    rank: i + 1,
    userId: r.user_id,
    displayName: r.profiles?.display_name || 'Member',
    currentStreak: r.current_streak,
    completionPercent: Number(r.completion_pct),
    completedDays: r.completed_days
  }))
  const me = ranked.find(x => x.userId === user.id) || null
  const leader = ranked[0] || null

  return (
    <AppShell items={RAIL}>
      <p className="eyebrow">COHORT · CONSISTENCY INDEX</p>
      <h1>Keep the line.</h1>
      <p className="muted">
        Ranked by current streak, completion percentage, completed days, then join time.
        Your private reflections never appear here.
      </p>
      <div className="grid" style={{ marginTop: 30 }}>
        <MetricCard
          label="YOUR RANK"
          value={me ? `#${me.rank}` : '—'}
          detail={me
            ? `${me.currentStreak} day streak · ${me.completionPercent}% completion`
            : 'Complete a day to enter the ranking.'}
        />
        <MetricCard
          label="COHORT LEADER"
          value={leader ? `${leader.currentStreak} day${leader.currentStreak === 1 ? '' : 's'}` : '—'}
          detail={leader ? leader.displayName : 'No completions yet.'}
        />
      </div>
      <section className="card" style={{ marginTop: 15 }} aria-label="Cohort rankings">
        {ranked.length === 0 ? (
          <p className="muted">No leaderboard data yet. The first completed day will appear here.</p>
        ) : (
          <div role="table" aria-label="Cohort leaderboard">
            <div
              role="row"
              style={{
                display: 'grid',
                gridTemplateColumns: '45px 1fr 100px 80px 70px',
                gap: 10,
                padding: '14px 0',
                borderBottom: '1px solid var(--line)',
                color: 'var(--muted)',
                fontSize: 11,
                letterSpacing: '.15em'
              }}
            >
              <span role="columnheader">RANK</span>
              <span role="columnheader">MEMBER</span>
              <span role="columnheader">STREAK</span>
              <span role="columnheader">DAYS</span>
              <span role="columnheader">COMPLETE</span>
            </div>
            {ranked.map(r => (
              <div
                key={r.userId}
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '45px 1fr 100px 80px 70px',
                  gap: 10,
                  alignItems: 'center',
                  padding: '18px 0',
                  borderBottom: '1px solid var(--line)'
                }}
              >
                <span role="cell" className={r.userId === user.id ? '' : 'muted'}>
                  {String(r.rank).padStart(2, '0')}
                </span>
                <div role="cell">
                  <b style={{ color: r.userId === user.id ? 'var(--accent)' : 'inherit' }}>
                    {r.displayName}{r.userId === user.id ? ' (you)' : ''}
                  </b>
                </div>
                <span role="cell">{r.currentStreak} day{r.currentStreak === 1 ? '' : 's'}</span>
                <span role="cell" className="muted">{r.completedDays}</span>
                <span role="cell" style={{ color: 'var(--accent)' }}>{r.completionPercent}%</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
