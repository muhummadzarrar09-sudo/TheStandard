import Link from 'next/link'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  STANDARD_SCHEDULE,
  localDateInTimezone,
  completionPercent
} from '../../../lib/domain'
import { consecutiveDays } from '../../../lib/domain/streaks'
import TodayBlocks from '../../../components/schedule/TodayBlocks'
import DailyCheckin from '../../../components/tracker/DailyCheckin'
import WeeklyCommitment from '../../../components/tracker/WeeklyCommitment'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await db
    .from('profiles')
    .select('cohort_id, timezone, cohorts(start_at, name)')
    .eq('id', user.id)
    .single()
  const timezone = profile?.timezone || 'UTC'
  const today = localDateInTimezone(new Date(), timezone)
  const cohort = Array.isArray(profile?.cohorts) ? profile!.cohorts[0] : profile?.cohorts
  const cohortStart = cohort?.start_at ? new Date(cohort.start_at) : null
  const cohortName = cohort?.name || 'COHORT'
  const cohortDay = cohortStart
    ? Math.max(
        1,
        Math.floor(
          (Date.parse(today + 'T00:00:00Z') -
            Date.UTC(
              cohortStart.getUTCFullYear(),
              cohortStart.getUTCMonth(),
              cohortStart.getUTCDate()
            )) / 86400000
        ) + 1
      )
    : 1

  // Today's per-block completions (real-time, in-progress).
  const { data: completions } = await db
    .from('block_completions')
    .select('block_key')
    .eq('user_id', user.id)
    .eq('local_date', today)
  const doneKeys = new Set((completions || []).map(c => c.block_key))
  const requiredTotal = STANDARD_SCHEDULE.filter(b => b.required).length
  const criticalTotal = STANDARD_SCHEDULE.filter(b => b.critical).length
  const requiredDone = STANDARD_SCHEDULE.filter(b => b.required && doneKeys.has(b.key)).length
  const criticalDone = STANDARD_SCHEDULE.filter(b => b.critical && doneKeys.has(b.key)).length
  const pct = completionPercent(STANDARD_SCHEDULE, doneKeys)

  // Streak: pull from the same signal the leaderboard uses
  // (daily_checkins.completed = true) so the dashboard and leaderboard never
  // disagree. The PRD 7.2 "current_streak" is the same number on both
  // surfaces.
  const { data: checkins } = await db
    .from('daily_checkins')
    .select('local_date')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('local_date', { ascending: false })
    .limit(365)
  const completedDates = (checkins || []).map(c => c.local_date)
  const currentStreak = consecutiveDays(completedDates, today)

  // Next block: first required block that isn't done yet whose start time is
  // now or later, else any remaining required block.
  const nowMinutes = (() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit'
    }).formatToParts(new Date())
    const h = Number(
      parts.find(p => p.type === 'hour')!.value === '24' ? '0' : parts.find(p => p.type === 'hour')!.value
    )
    const m = Number(parts.find(p => p.type === 'minute')!.value)
    return h * 60 + m
  })()
  const toMinutes = (s: string) => {
    const [h, m] = s.split(':').map(Number)
    return h * 60 + m
  }
  const next =
    STANDARD_SCHEDULE
      .filter(b => b.required)
      .find(b => !doneKeys.has(b.key) && toMinutes(b.start) >= nowMinutes) ||
    STANDARD_SCHEDULE.filter(b => b.required).find(b => !doneKeys.has(b.key))

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">DISCIPLINE<small>EXECUTION SYSTEM</small></div>
        <nav>
          <Link className="active" href="/dashboard">Today</Link>
          <Link href="/schedule">Schedule</Link>
          <Link href="/tracker">Tracker</Link>
          <Link href="/team">Team room</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </aside>
      <main className="main">
        <p className="eyebrow">
          {cohortName.toUpperCase()} · DAY {String(cohortDay).padStart(2, '0')}
        </p>
        <h1>Your standard for today.</h1>
        <p className="muted">Timezone: {timezone}</p>
        <div className="grid">
          <section className="card">
            <p className="eyebrow">TODAY'S COMPLETION</p>
            <h2>
              {requiredDone}
              <span className="muted"> / {requiredTotal}</span>
            </h2>
            <div style={{ height: 4, background: '#29302f' }}>
              <i
                style={{
                  display: 'block',
                  width: pct + '%',
                  height: '100%',
                  background: 'var(--accent)'
                }}
              />
            </div>
            <p className="muted">
              {currentStreak} day streak
              {criticalTotal > 0 ? ` · ${criticalDone} / ${criticalTotal} critical` : ''}
            </p>
          </section>
          <section className="card">
            <p className="eyebrow">UP NEXT</p>
            {next ? (
              <>
                <h2>{next.label}</h2>
                <p className="muted">
                  {next.start}
                  {next.end ? `–${next.end}` : ''} · Required block
                </p>
              </>
            ) : (
              <>
                <h2>All required blocks complete</h2>
                <p className="muted">
                  Day {cohortDay} locked in. Streak extends tomorrow.
                </p>
              </>
            )}
          </section>
        </div>
        <TodayBlocks initialDone={Array.from(doneKeys)} />
        <WeeklyCommitment />
        <DailyCheckin />
      </main>
    </div>
  )
}
