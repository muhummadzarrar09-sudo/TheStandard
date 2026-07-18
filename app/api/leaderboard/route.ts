import { createSupabaseServer } from '../../../lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await db
    .from('profiles')
    .select('cohort_id')
    .eq('id', user.id)
    .single()
  if (!profile?.cohort_id) {
    return NextResponse.json({ members: [], yourRank: null })
  }

  // Tie-breakers: current_streak desc, completion_pct desc, completed_days desc,
  // joined_at asc. PRD 7.3: "stable join-time tie-breaker."
  const { data: rows, error } = await db
    .from('leaderboard_projection')
    .select('user_id, current_streak, completion_pct, completed_days, profiles!inner(display_name)')
    .eq('cohort_id', profile.cohort_id)
    .order('current_streak', { ascending: false })
    .order('completion_pct', { ascending: false })
    .order('completed_days', { ascending: false })
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 500 })

  const members = (rows || []).map((r: any, i: number) => ({
    rank: i + 1,
    userId: r.user_id,
    displayName: r.profiles?.display_name || 'Member',
    currentStreak: r.current_streak,
    completionPercent: Number(r.completion_pct),
    completedDays: r.completed_days
  }))
  return NextResponse.json({
    members,
    yourRank: members.find(x => x.userId === user.id)?.rank ?? null
  })
}
