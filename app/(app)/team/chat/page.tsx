import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import TeamChat from '../../../../components/team/TeamChat'
import EmptyState from '../../../../components/ui/EmptyState'
import AppShell from '../../../../components/ui/AppShell'
import { t } from '../../../../lib/copy'

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
      <AppShell items={RAIL}>
        <Link href="/team" className="muted">← {t('team.heading')}</Link>
        <p className="eyebrow" style={{ marginTop: 30 }}>{t('team.chatEyebrow')}</p>
        <h1>{t('chat.heading')}</h1>
        <p className="muted">{t('team.chatNotAssigned')}</p>
        <EmptyState
          eyebrow={t('team.chatPendingEyebrow')}
          title={t('team.chatPendingTitle')}
          body={t('team.chatPendingBody')}
        />
      </AppShell>
    )
  }

  const { count: memberCount } = await db
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)

  return (
    <AppShell items={RAIL}>
      <Link href="/team" className="muted">← {team.name}</Link>
      <p className="eyebrow" style={{ marginTop: 30 }}>
        TEAM · {team.name.toUpperCase()} · {memberCount ?? 0} MEMBER{(memberCount ?? 0) === 1 ? '' : 'S'}
      </p>
      <h1>{t('chat.heading')}</h1>
      <div style={{ marginTop: 30 }}>
        <TeamChat teamId={team.id} />
      </div>
    </AppShell>
  )
}
