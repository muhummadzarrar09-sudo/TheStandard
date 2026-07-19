import { createSupabaseServer } from '../../../lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  localDateInTimezone,
  completionPercent,
  type ScheduleBlock
} from '../../../lib/domain'
import { consecutiveDays } from '../../../lib/domain/streaks'
import AppShell from '../../../components/ui/AppShell'
import TodayBlocks from '../../../components/schedule/TodayBlocks'
import DailyCheckin from '../../../components/tracker/DailyCheckin'
import WeeklyCommitment from '../../../components/tracker/WeeklyCommitment'
import { t } from '../../../lib/copy'
import { getScheduleForCohort } from '../../../lib/schedule-source'
import { MEMBER_RAIL } from '../../../lib/nav'
import SyncStatusIndicator from '../../../components/ui/SyncStatusIndicator'

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

  // Read the schedule from the canonical table (Phase 6a). Falls
  // back to the hardcoded constant for a brand-new cohort without a
  // config row.
  const schedule = await getScheduleForCohort(profile?.cohort_id || null)

  const { data: completions } = await db
    .from('block_completions')
    .select('block_key')
    .eq('user_id', user.id)
    .eq('local_date', today)
  const doneKeys = new Set<string>(
    (completions || [])
      .map((c: { block_key: unknown }) => c.block_key)
      .filter((k): k is string => typeof k === 'string')
  )
  const requiredTotal = schedule.filter(b => b.required).length
  const criticalTotal = schedule.filter(b => b.critical).length
  const requiredDone = schedule.filter(b => b.required && doneKeys.has(b.key)).length
  const criticalDone = schedule.filter(b => b.critical && doneKeys.has(b.key)).length
  const pct = completionPercent(schedule, doneKeys)

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
    schedule
      .filter(b => b.required)
      .find(b => !doneKeys.has(b.key) && toMinutes(b.start) >= nowMinutes) ||
    schedule.filter(b => b.required).find(b => !doneKeys.has(b.key))

  return (
    <AppShell items={MEMBER_RAIL}>
      <p className="eyebrow">
        {cohortName.toUpperCase()} · {t('today.dayLabel', 'en', { day: String(cohortDay).padStart(2, '0') })}
      </p>
      <h1>{t('today.heading')}</h1>
      <p className="muted">Timezone: {timezone}</p>
      <div style={{ marginTop: -12, marginBottom: 12 }}>
        <SyncStatusIndicator />
      </div>
      <div className="grid">
        <section className="card" aria-label={t('today.completionEyebrow')}>
          <p className="eyebrow">{t('today.completionEyebrow')}</p>
          <h2>
            {requiredDone}
            <span className="muted"> / {requiredTotal}</span>
          </h2>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% complete`}
            style={{ height: 4, background: 'var(--line)' }}
          >
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
        <section className="card" aria-label={t('today.upNextEyebrow')}>
          <p className="eyebrow">{t('today.upNextEyebrow')}</p>
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
              <h2>{t('today.allCompleteTitle')}</h2>
              <p className="muted">
                {t('today.allCompleteDetail', 'en', { day: cohortDay })}
              </p>
            </>
          )}
        </section>
      </div>
      <TodayBlocks initialDone={Array.from(doneKeys) as string[]} schedule={schedule} />
      <WeeklyCommitment />
      <DailyCheckin />
    </AppShell>
  )
}
