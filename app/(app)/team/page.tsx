import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../../lib/supabase/server'
import MetricCard from '../../../components/ui/MetricCard'
import MilestoneList from '../../../components/team/MilestoneList'
import TeamProgressLog from '../../../components/team/TeamProgressLog'
import EmptyState from '../../../components/ui/EmptyState'
import AppShell from '../../../components/ui/AppShell'
import { t } from '../../../lib/copy'
import { MEMBER_RAIL } from '../../../lib/nav'

export const dynamic = 'force-dynamic'

export default async function Team() {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

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
      <AppShell items={MEMBER_RAIL}>
        <p className="eyebrow">TEAM</p>
        <h1>Your team is being assembled.</h1>
        <p className="muted">{t('team.emptyDetail')}</p>
        <EmptyState
          eyebrow="WHAT TO DO NOW"
          title="Keep showing up on Today."
          body="Daily execution is the prerequisite. Team accountability starts once your cohort lead publishes teams."
        />
      </AppShell>
    )
  }

  const { count: memberCount } = await db
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { count: weeklyLogs } = await db
    .from('team_progress_logs')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)
    .gte('created_at', sevenDaysAgo)

  return (
    <AppShell items={MEMBER_RAIL}>
      <p className="eyebrow">
        TEAM · {team.name.toUpperCase()} · {memberCount ?? 0} MEMBER{(memberCount ?? 0) === 1 ? '' : 'S'}
      </p>
      <h1>{team.idea_name || t('team.heading')}</h1>
      {team.problem_statement && <p className="muted">{team.problem_statement}</p>}
      <div className="grid" style={{ marginTop: 30 }}>
        <MetricCard
          label={t('team.objective')}
          value={team.objective || '—'}
          detail="Set by the team. Updateable by your cohort lead."
        />
        <MetricCard
          label={t('team.cadence')}
          value={String(weeklyLogs ?? 0)}
          detail="Progress updates this week."
        />
      </div>
      <MilestoneList teamId={team.id} />
      <TeamProgressLog teamId={team.id} />
      <Link
        className="button"
        style={{ display: 'inline-block', marginTop: 20 }}
        href="/team/chat"
      >
        {t('team.openChat')}
      </Link>
    </AppShell>
  )
}
