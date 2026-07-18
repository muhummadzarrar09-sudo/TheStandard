import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import TeamChat from '../../../../components/team/TeamChat'
import EmptyState from '../../../../components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function Chat() {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await db
    .from('team_members')
    .select('team_id, teams(id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const team = membership && !Array.isArray(membership.teams)
    ? membership.teams
    : (membership && Array.isArray(membership.teams) ? membership.teams[0] : null)

  if (!team) {
    return (
      <div className="shell">
        <aside className="rail">
          <div className="brand">DISCIPLINE<small>EXECUTION SYSTEM</small></div>
          <nav>
            <Link href="/dashboard">Today</Link>
            <Link className="active" href="/team">Team room</Link>
            <Link href="/leaderboard">Leaderboard</Link>
          </nav>
        </aside>
        <main className="main">
          <Link href="/team" className="muted">← Team room</Link>
          <p className="eyebrow" style={{ marginTop: 30 }}>PRIVATE TEAM CHAT</p>
          <h1>Team chat.</h1>
          <p className="muted">No team assigned yet.</p>
          <EmptyState
            eyebrow="PENDING"
            title="Team chat opens with your team assignment."
            body="Once the cohort lead assigns your team, this page becomes your private execution room."
          />
        </main>
      </div>
    )
  }

  // Count members for the header
  const { count: memberCount } = await db
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">DISCIPLINE<small>EXECUTION SYSTEM</small></div>
        <nav>
          <Link href="/dashboard">Today</Link>
          <Link className="active" href="/team">Team room</Link>
          <Link href="/leaderboard">Leaderboard</Link>
        </nav>
      </aside>
      <main className="main">
        <Link href="/team" className="muted">← {team.name}</Link>
        <p className="eyebrow" style={{ marginTop: 30 }}>PRIVATE EXECUTION ROOM · {memberCount ?? 0} MEMBER{(memberCount ?? 0) === 1 ? '' : 'S'}</p>
        <h1>Team chat.</h1>
        <div style={{ marginTop: 30 }}>
          <TeamChat teamId={team.id} />
        </div>
      </main>
    </div>
  )
}
