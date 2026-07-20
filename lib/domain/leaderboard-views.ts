// Shared leaderboard query logic. Used by:
//   - app/api/leaderboard/route.ts (Next route)
//   - app/(app)/leaderboard/page.tsx (SSR page)
//
// Exposing a single function avoids the route-from-page hack of
// importing the route handler and inlining a NextRequest.

import { localDateInTimezone } from '../domain'

export type LeaderboardView = 'all' | 'team' | 'week'
export const LEADERBOARD_VIEWS: readonly LeaderboardView[] = ['all', 'team', 'week'] as const

export function isLeaderboardView(v: unknown): v is LeaderboardView {
  return typeof v === 'string' && (LEADERBOARD_VIEWS as readonly string[]).includes(v)
}

export type LeaderboardMember = {
  rank: number
  userId: string
  displayName: string
  currentStreak: number
  completionPercent: number
  completedDays: number
  weekCheckins?: number
}

export type LeaderboardData = {
  view: LeaderboardView
  members: LeaderboardMember[]
  yourRank: number | null
  teamEmpty?: boolean
}

// The Supabase client type is the one returned by createSupabaseServer.
// We accept the minimal shape we actually use so this file doesn't
// depend on @supabase/ssr directly.
type Db = {
  from(table: string): any
}

export async function getLeaderboard(
  db: Db,
  userId: string,
  cohortId: string,
  timezone: string,
  cohortStartIso: string | null,
  view: LeaderboardView
): Promise<LeaderboardData> {
  if (view === 'team') return leaderboardForTeam(db, userId, cohortId)
  if (view === 'week') {
    const today = localDateInTimezone(new Date(), timezone)
    return leaderboardForWeek(db, cohortId, cohortStartIso ? new Date(cohortStartIso) : null, today, userId)
  }
  return leaderboardForAll(db, cohortId, userId)
}

async function leaderboardForAll(db: Db, cohortId: string, userId: string): Promise<LeaderboardData> {
  const { data: rows } = await db
    .from('leaderboard_projection')
    .select('user_id, current_streak, completion_pct, completed_days, profiles!inner(display_name)')
    .eq('cohort_id', cohortId)
    .order('current_streak', { ascending: false })
    .order('completion_pct', { ascending: false })
    .order('completed_days', { ascending: false })
    .order('joined_at', { ascending: true })
  const members = (rows || []).map((r: any, i: number) => ({
    rank: i + 1,
    userId: r.user_id,
    displayName: r.profiles?.display_name || 'Member',
    currentStreak: r.current_streak,
    completionPercent: Number(r.completion_pct),
    completedDays: r.completed_days
  }))
  return {
    view: 'all',
    members,
    yourRank: (members as LeaderboardMember[]).find(x => x.userId === userId)?.rank ?? null
  }
}

async function leaderboardForTeam(db: Db, userId: string, cohortId: string): Promise<LeaderboardData> {
  const { data: membership } = await db
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (!membership?.team_id) {
    return { view: 'team', members: [], yourRank: null, teamEmpty: true }
  }
  const { data: rows } = await db
    .from('leaderboard_projection')
    .select('user_id, current_streak, completion_pct, completed_days, profiles!inner(display_name), team_members!inner(team_id)')
    .eq('cohort_id', cohortId)
    .eq('team_members.team_id', membership.team_id)
    .order('current_streak', { ascending: false })
    .order('completion_pct', { ascending: false })
    .order('completed_days', { ascending: false })
    .order('joined_at', { ascending: true })
  const members: LeaderboardMember[] = (rows || []).map((r: any, i: number) => ({
    rank: i + 1,
    userId: r.user_id,
    displayName: r.profiles?.display_name || 'Member',
    currentStreak: r.current_streak,
    completionPercent: Number(r.completion_pct),
    completedDays: r.completed_days
  }))
  return {
    view: 'team',
    members,
    yourRank: members.find(x => x.userId === userId)?.rank ?? null
  }
}

async function leaderboardForWeek(
  db: Db,
  cohortId: string,
  cohortStart: Date | null,
  today: string,
  userId: string
): Promise<LeaderboardData> {
  const todayMs = Date.parse(today + 'T00:00:00Z')
  const earliest = cohortStart ? Math.max(cohortStart.getTime(), todayMs - 6 * 86400000) : todayMs - 6 * 86400000
  const earliestStr = new Date(earliest).toISOString().slice(0, 10)

  const { data: rows } = await db
    .from('leaderboard_projection')
    .select('user_id, current_streak, completion_pct, completed_days, joined_at, profiles!inner(display_name)')
    .eq('cohort_id', cohortId)
  if (!rows || rows.length === 0) {
    return { view: 'week', members: [], yourRank: null }
  }
  const userIds = (rows as any[]).map(r => r.user_id)
  const { data: checkins } = await db
    .from('daily_checkins')
    .select('user_id, local_date')
    .in('user_id', userIds)
    .eq('completed', true)
    .gte('local_date', earliestStr)
  const weekCount = new Map<string, number>()
  for (const c of checkins || []) {
    weekCount.set(c.user_id, (weekCount.get(c.user_id) || 0) + 1)
  }
  const sorted = (rows as any[]).slice().sort((a, b) => {
    const wk = (weekCount.get(b.user_id) || 0) - (weekCount.get(a.user_id) || 0)
    if (wk !== 0) return wk
    if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak
    if (Number(b.completion_pct) !== Number(a.completion_pct)) return Number(b.completion_pct) - Number(a.completion_pct)
    if (b.completed_days !== a.completed_days) return b.completed_days - a.completed_days
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
  })
  const members = sorted.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    displayName: r.profiles?.display_name || 'Member',
    currentStreak: r.current_streak,
    completionPercent: Number(r.completion_pct),
    completedDays: r.completed_days,
    weekCheckins: weekCount.get(r.user_id) || 0
  }))
  return {
    view: 'week',
    members,
    yourRank: members.find(x => x.userId === userId)?.rank ?? null
  }
}
