import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { localDateInTimezone } from '../../../lib/domain'
import { consecutiveDays, bestStreak } from '../../../lib/domain/streaks'
import ProgressHistory from '../../../components/tracker/ProgressHistory'

export const dynamic = 'force-dynamic'

export default async function Tracker() {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await db
    .from('profiles')
    .select('timezone, cohorts(start_at)')
    .eq('id', user.id)
    .single()
  const timezone = profile?.timezone || 'UTC'
  const today = localDateInTimezone(new Date(), timezone)
  const cohort = Array.isArray(profile?.cohorts) ? profile!.cohorts[0] : profile?.cohorts
  const cohortStart = cohort?.start_at ? new Date(cohort.start_at) : null

  // Build the 30-day window from the cohort's start_at (or today if no cohort).
  // Earlier: this used Date.now() which drifted from the cohort boundary.
  const windowStart = cohortStart
    ? new Date(Math.max(cohortStart.getTime(), Date.parse(today + 'T00:00:00Z') - 29 * 86400000))
    : new Date(Date.parse(today + 'T00:00:00Z') - 29 * 86400000)
  const windowStartStr = windowStart.toISOString().slice(0, 10)

  const { data: checkins } = await db
    .from('daily_checkins')
    .select('local_date, completed')
    .eq('user_id', user.id)
    .gte('local_date', windowStartStr)
  const rows = (checkins || []).map(c => ({ local_date: c.local_date, completed: !!c.completed }))
  const completedDates = rows.filter(r => r.completed).map(r => r.local_date)
  const current = consecutiveDays(completedDates, today)
  const best = bestStreak(completedDates)
  const totalCompleted = completedDates.length

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">DISCIPLINE<small>EXECUTION SYSTEM</small></div>
        <nav>
          <Link href="/dashboard">Today</Link>
          <Link className="active" href="/tracker">Tracker</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/team">Team room</Link>
        </nav>
      </aside>
      <main className="main">
        <p className="eyebrow">PERSONAL RECORD · 30 DAYS</p>
        <h1>See the pattern.</h1>
        <div className="grid" style={{ marginTop: 30 }}>
          <section className="card">
            <p className="eyebrow">CURRENT STREAK</p>
            <h2>
              {current} day{current === 1 ? '' : 's'}
            </h2>
            <p className="muted">Consecutive fully completed days ending today or yesterday.</p>
          </section>
          <section className="card">
            <p className="eyebrow">BEST STREAK</p>
            <h2>
              {best} day{best === 1 ? '' : 's'}
            </h2>
            <p className="muted">Your best run in this cohort window.</p>
          </section>
        </div>
        <ProgressHistory
          windowStart={windowStartStr}
          checkins={rows}
        />
        <section className="card" style={{ marginTop: 15 }}>
          <p className="eyebrow">WEEKLY REVIEW</p>
          <p className="muted">
            {totalCompleted} of 30 days complete. Review the pattern, then choose the next standard.
          </p>
        </section>
      </main>
    </div>
  )
}
