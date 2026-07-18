import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../../lib/supabase/server'
import MetricCard from '../../../components/ui/MetricCard'
import MilestoneList from '../../../components/team/MilestoneList'
import EmptyState from '../../../components/ui/EmptyState'

export const dynamic = 'force-dynamic'

export default async function Team() {
  const db = await createSupabaseServer()
  const { data: { user } } = await userGate(db)
  if (!user) redirect('/login')

  // Find the member's team. PRD: "Empty states must be purposeful: 'Your team
  // assignment is being finalized' rather than a broken-looking screen."
  const { data: membership } = await db
    .from('team_members')
    .select('team_id, teams(id, name, idea_name, problem_statement, objective, status)')
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
            <Link href="/reports">Reports</Link>
          </nav>
        </aside>
        <main className="main">
          <p className="eyebrow">TEAM</p>
          <h1>Your team is being assembled.</h1>
          <p className="muted">The team room opens once the cohort lead finalizes team assignments. You'll see your team, its idea, and the team's execution chat here.</p>
          <EmptyState
            eyebrow="WHAT TO DO NOW"
            title="Keep showing up on Today."
            body="Daily execution is the prerequisite. Team accountability starts once your cohort lead publishes teams."
          />
        </main>
      </div>
    )
  }

  // Member count for header
  const { count: memberCount } = await db
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)

  // Cadence: team_progress_logs created in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { count: weeklyLogs } = await db
    .from('team_progress_logs')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)
    .gte('created_at', sevenDaysAgo)

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">DISCIPLINE<small>EXECUTION SYSTEM</small></div>
        <nav>
          <Link href="/dashboard">Today</Link>
          <Link className="active" href="/team">Team room</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/reports">Reports</Link>
        </nav>
      </aside>
      <main className="main">
        <p className="eyebrow">TEAM · {team.name.toUpperCase()} · {memberCount ?? 0} MEMBER{(memberCount ?? 0) === 1 ? '' : 'S'}</p>
        <h1>{team.idea_name || 'Build together.'}</h1>
        {team.problem_statement && <p className="muted">{team.problem_statement}</p>}
        <div className="grid" style={{ marginTop: 30 }}>
          <MetricCard
            label="CURRENT OBJECTIVE"
            value={team.objective || '—'}
            detail="Set by the team. Updateable by your cohort lead."
          />
          <MetricCard
            label="WEEKLY CADENCE"
            value={String(weeklyLogs ?? 0)}
            detail="Progress updates this week."
          />
        </div>
        <MilestoneList teamId={team.id} />
        <Link className="button" style={{ display: 'inline-block', marginTop: 20 }} href="/team/chat">Open execution chat →</Link>
      </main>
    </div>
  )
}

async function userGate(db: Awaited<ReturnType<typeof createSupabaseServer>>) {
  return await db.auth.getUser()
}
