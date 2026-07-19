import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { localDateInTimezone } from '../../../lib/domain'
import AppShell from '../../../components/ui/AppShell'

export const dynamic = 'force-dynamic'

const RAIL = [
  { href: '/dashboard', key: 'rail.today' as const },
  { href: '/tracker', key: 'rail.tracker' as const },
  { href: '/team', key: 'rail.team' as const },
  { href: '/reports', key: 'rail.reports' as const },
  { href: '/settings', key: 'rail.settings' as const },
  { href: '/profile', key: 'rail.profile' as const }
]

export default async function Profile() {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await db
    .from('profiles')
    .select('email, display_name, timezone, access_start_at, access_end_at, cohort_id, cohorts(name, start_at, end_at)')
    .eq('id', user.id)
    .single()

  const today = localDateInTimezone(new Date(), profile?.timezone || 'UTC')
  const cohort = Array.isArray(profile?.cohorts) ? profile!.cohorts[0] : profile?.cohorts
  const cohortName = cohort?.name || '—'
  const cohortStart = cohort?.start_at ? new Date(cohort.start_at) : null
  const cohortEnd = cohort?.end_at ? new Date(cohort.end_at) : null
  const cohortDay = cohortStart
    ? Math.max(1, Math.floor((Date.parse(today + 'T00:00:00Z') - Date.UTC(cohortStart.getUTCFullYear(), cohortStart.getUTCMonth(), cohortStart.getUTCDate())) / 86400000) + 1)
    : null
  const totalDays = (cohortStart && cohortEnd)
    ? Math.round((cohortEnd.getTime() - cohortStart.getTime()) / 86400000) + 1
    : 30

  return (
    <AppShell items={RAIL}>
      <p className="eyebrow">ACCOUNT · PROFILE</p>
      <h1>Your member profile.</h1>

      <section className="card" style={{ marginTop: 30 }} aria-labelledby="profile-identity">
        <p className="eyebrow" id="profile-identity">IDENTITY</p>
        <h2 style={{ margin: '6px 0 0' }}>{profile?.display_name || 'Member'}</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>{profile?.email || ''}</p>
        <p className="muted" style={{ marginTop: 12 }}>
          Email is managed through passwordless authentication — there is no password to change.
        </p>
      </section>

      <section className="card" style={{ marginTop: 15 }} aria-labelledby="profile-timezone">
        <p className="eyebrow" id="profile-timezone">TIMEZONE</p>
        <p style={{ margin: '6px 0 0', fontSize: 16 }}>{profile?.timezone || 'UTC'}</p>
        <p className="muted" style={{ marginTop: 12 }}>
          The detected timezone is used to compute your local date, schedule day boundary, and cutoff time. You can change it from <Link href="/settings">Settings</Link>.
        </p>
      </section>

      <section className="card" style={{ marginTop: 15 }} aria-labelledby="profile-cohort">
        <p className="eyebrow" id="profile-cohort">COHORT</p>
        <dl style={{ margin: '6px 0 0', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 18px' }}>
          <dt className="muted" style={{ fontSize: 11, letterSpacing: '.1em' }}>NAME</dt>
          <dd style={{ margin: 0 }}>{cohortName}</dd>
          {cohortDay !== null && (
            <>
              <dt className="muted" style={{ fontSize: 11, letterSpacing: '.1em' }}>DAY</dt>
              <dd style={{ margin: 0 }}>Day {cohortDay} of {totalDays}</dd>
            </>
          )}
          {cohortStart && (
            <>
              <dt className="muted" style={{ fontSize: 11, letterSpacing: '.1em' }}>START</dt>
              <dd style={{ margin: 0 }}>{cohortStart.toISOString().slice(0, 10)}</dd>
            </>
          )}
          {cohortEnd && (
            <>
              <dt className="muted" style={{ fontSize: 11, letterSpacing: '.1em' }}>END</dt>
              <dd style={{ margin: 0 }}>{cohortEnd.toISOString().slice(0, 10)}</dd>
            </>
          )}
          {profile?.access_start_at && (
            <>
              <dt className="muted" style={{ fontSize: 11, letterSpacing: '.1em' }}>ACCESS OPENS</dt>
              <dd style={{ margin: 0 }}>{new Date(profile.access_start_at).toISOString().slice(0, 10)}</dd>
            </>
          )}
          {profile?.access_end_at && (
            <>
              <dt className="muted" style={{ fontSize: 11, letterSpacing: '.1em' }}>ACCESS CLOSES</dt>
              <dd style={{ margin: 0 }}>{new Date(profile.access_end_at).toISOString().slice(0, 10)}</dd>
            </>
          )}
        </dl>
      </section>
    </AppShell>
  )
}
