// Cohort leaderboard. Three views (PRD §7.3): all / team / week.
// The actual query logic lives in lib/domain/leaderboard-views.ts
// so the SSR leaderboard page can call the same code path.

import { createSupabaseServer } from '../../../lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getActiveUser } from '../../../lib/auth-server'
import { toResponse, serverError, badRequest } from '../../../lib/api-errors'
import { getLeaderboard, isLeaderboardView, type LeaderboardView } from '../../../lib/domain/leaderboard-views'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const url = new URL(req.url)
  const rawView = url.searchParams.get('view')
  if (rawView !== null && !isLeaderboardView(rawView)) {
    return toResponse(badRequest('view must be one of all, team, week'))
  }
  const view: LeaderboardView = isLeaderboardView(rawView) ? rawView : 'all'

  const db = await createSupabaseServer()
  const { data: profile } = await db
    .from('profiles')
    .select('cohort_id, timezone, cohorts!inner(start_at)')
    .eq('id', user.id)
    .single()
  if (!profile?.cohort_id) {
    return NextResponse.json({ view, members: [], yourRank: null })
  }
  const cohort = Array.isArray(profile.cohorts) ? profile.cohorts[0] : profile.cohorts
  const timezone = profile.timezone || 'UTC'
  try {
    const data = await getLeaderboard(
      db,
      user.id,
      profile.cohort_id,
      timezone,
      cohort?.start_at || null,
      view
    )
    return NextResponse.json(data)
  } catch (e) {
    log_unhandled(e)
    return toResponse(serverError('Leaderboard unavailable'))
  }
}

function log_unhandled(e: unknown) {
  // Best-effort: don't crash the route on a logging hiccup.
  try {
    // eslint-disable-next-line no-console
    console.error('[api/leaderboard] failed:', e instanceof Error ? e.message : String(e))
  } catch {
    // ignore
  }
}
