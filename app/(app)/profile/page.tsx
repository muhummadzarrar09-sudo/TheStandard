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

      <section className="card" style={{ marginTop: 30 }} aria-label="Identity">
        <p className="eyebrow">IDENTITY</p>
        <h2>{profile?.display_name || 'Member'}</h2>
        <p className="muted">{profile?.email || ''}</p>
        <p className="muted">Email is managed through passwordless authentication — there is no password to change.</p>
      </section>

      <section className="card" style={{ marginTop: 15 }} aria-label="Timezone">
        <p className="eyebrow">TIMEZONE</p>
        <p>{profile?.timezone || 'UTC'}</p>
        <p className="muted">
          The detected timezone is used to compute your local date, schedule day boundary, and cutoff time. You can change it from <Link href="/settings">Settings</Link>.
        </p>
      </section>

      <section className="card" style={{ marginTop: 15 }} aria-label="Cohort">
        <p className="eyebrow">COHORT</p>
        <p>{cohortName}{cohortDay ? ` · Day ${cohortDay} of ${totalDays}` : ''}</p>
        {cohortStart && <p className="muted">Starts {cohortStart.toISOString().slice(0, 10)}{cohortEnd ? ` · ends ${cohortEnd.toISOString().slice(0, 10)}` : ''}</p>}
        {profile?.access_start_at && (
          <p className="muted">Access opens {new Date(profile.access_start_at).toISOString().slice(0, 10)}</p>
        )}
        {profile?.access_end_at && (
          <p className="muted">Access closes {new Date(profile.access_end_at).toISOString().slice(0, 10)}</p>
        )}
      </section>
    </AppShell>
  )
}
