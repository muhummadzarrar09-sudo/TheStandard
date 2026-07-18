import { NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { db } = await requireServerAdmin()

    // Per PRD 11: admins manage a single cohort. The admin's own cohort_id
    // scopes the metrics. If the admin has no cohort, we return zeros with
    // a flag, never all-cohorts aggregate.
    const { data: profile } = await db
      .from('profiles')
      .select('cohort_id')
      .eq('role', 'admin')
      .single()

    const cohortId = profile?.cohort_id || null
    if (!cohortId) {
      return NextResponse.json({
        metrics: { members: 0, completedCheckins: 0, teams: 0, cohort: null },
        note: 'No cohort assigned to this admin. Metrics are scoped to your cohort.'
      })
    }

    const [
      membersRes,
      completedRes,
      teamsRes,
      cohortRes
    ] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true })
        .eq('role', 'member').eq('cohort_id', cohortId),
      db.from('daily_checkins').select('id', { count: 'exact', head: true })
        .eq('completed', true),
      db.from('teams').select('id', { count: 'exact', head: true })
        .eq('cohort_id', cohortId).eq('status', 'active'),
      db.from('cohorts').select('id, name, status').eq('id', cohortId).single()
    ])

    return NextResponse.json({
      metrics: {
        members: membersRes.count || 0,
        completedCheckins: completedRes.count || 0,
        teams: teamsRes.count || 0,
        cohort: cohortRes.data || null
      }
    })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
