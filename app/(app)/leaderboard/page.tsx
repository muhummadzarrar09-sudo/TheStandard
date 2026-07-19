import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../../lib/supabase/server'
import MetricCard from '../../../components/ui/MetricCard'
import EmptyState from '../../../components/ui/EmptyState'
import AppShell from '../../../components/ui/AppShell'
import LeaderboardViewTabs from '../../../components/leaderboard/LeaderboardViewTabs'
import { t } from '../../../lib/copy'
import { MEMBER_RAIL } from '../../../lib/nav'
import { getLeaderboard, isLeaderboardView, type LeaderboardView } from '../../../lib/domain/leaderboard-views'

export const dynamic = 'force-dynamic'

export default async function Leaderboard(props: { searchParams: Promise<{ view?: string }> }) {
  const { view: viewParam } = await props.searchParams
  const view: LeaderboardView = isLeaderboardView(viewParam) ? viewParam : 'all'

  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await db
    .from('profiles')
    .select('cohort_id, timezone, cohorts!inner(start_at)')
    .eq('id', user.id)
    .single()
  const cohortId = profile?.cohort_id
  const cohort = profile?.cohorts
    ? (Array.isArray(profile.cohorts) ? profile.cohorts[0] : profile.cohorts)
    : null
  const timezone = profile?.timezone || 'UTC'

  if (!cohortId) {
    return (
      <AppShell items={MEMBER_RAIL}>
        <p className="eyebrow">{t('rail.leaderboard')}</p>
        <h1>{t('leaderboard.heading')}</h1>
        <EmptyState
          eyebrow="NOT YET"
          title="Your cohort isn't activated yet."
          body="Once the cohort lead activates your cohort and the daily engine starts running, the leaderboard will rank members by current streak, completion percentage, completed days, and join time."
        />
      </AppShell>
    )
  }

  let data
  try {
    data = await getLeaderboard(db, user.id, cohortId, timezone, cohort?.start_at || null, view)
  } catch {
    return (
      <AppShell items={MEMBER_RAIL}>
        <p className="eyebrow">{t('rail.leaderboard')}</p>
        <h1>{t('leaderboard.heading')}</h1>
        <p className="muted">{t('leaderboard.unavailable')}</p>
      </AppShell>
    )
  }

  const ranked = data.members
  const me = ranked.find(x => x.userId === user.id) || null
  const leader = ranked[0] || null

  return (
    <AppShell items={MEMBER_RAIL}>
      <p className="eyebrow">COHORT · CONSISTENCY INDEX</p>
      <h1>{t('leaderboard.heading')}</h1>
      <p className="muted">{t('leaderboard.subtitle')}</p>
      <LeaderboardViewTabs current={view} />
      <div className="grid" style={{ marginTop: 30 }}>
        <MetricCard
          label="YOUR RANK"
          value={me ? `#${me.rank}` : '—'}
          detail={me
            ? `${me.currentStreak} day streak · ${me.completionPercent}% completion`
            : 'Complete a day to enter the ranking.'}
        />
        <MetricCard
          label={view === 'week' ? 'WEEK LEADER' : 'COHORT LEADER'}
          value={leader
            ? (view === 'week' && me)
              ? `${leader.weekCheckins ?? 0} check-in${(leader.weekCheckins ?? 0) === 1 ? '' : 's'}`
              : `${leader.currentStreak} day${leader.currentStreak === 1 ? '' : 's'}`
            : '—'}
          detail={leader ? leader.displayName : 'No completions yet.'}
        />
      </div>
      <section className="card" style={{ marginTop: 15 }} aria-label="Cohort rankings">
        {data.teamEmpty ? (
          <p className="muted">No team yet. The leaderboard opens when your cohort lead assigns you to a team.</p>
        ) : ranked.length === 0 ? (
          <p className="muted">{t('leaderboard.empty')}</p>
        ) : (
          <div role="table" aria-label="Cohort leaderboard">
            <div
              role="row"
              style={{
                display: 'grid',
                gridTemplateColumns: '45px 1fr 100px 80px 70px' + (view === 'week' ? ' 70px' : ''),
                gap: 10,
                padding: '14px 0',
                borderBottom: '1px solid var(--line)',
                color: 'var(--muted)',
                fontSize: 11,
                letterSpacing: '.15em'
              }}
            >
              <span role="columnheader">{t('leaderboard.colRank')}</span>
              <span role="columnheader">{t('leaderboard.colMember')}</span>
              <span role="columnheader">{t('leaderboard.colStreak')}</span>
              <span role="columnheader">{t('leaderboard.colDays')}</span>
              <span role="columnheader">{t('leaderboard.colComplete')}</span>
              {view === 'week' && <span role="columnheader">{t('leaderboard.colWeek')}</span>}
            </div>
            {ranked.map(r => (
              <div
                key={r.userId}
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '45px 1fr 100px 80px 70px' + (view === 'week' ? ' 70px' : ''),
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
                {view === 'week' && (
                  <span role="cell" style={{ color: 'var(--accent)' }}>{r.weekCheckins ?? 0}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
        {t('leaderboard.tieExplanation')}
      </p>
    </AppShell>
  )
}
