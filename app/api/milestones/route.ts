import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = new URL(req.url).searchParams.get('teamId')
  if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 })

  const db = await createSupabaseServer()
  const { data, error: qErr } = await db
    .from('team_milestones')
    .select('id, title, description, owner_id, due_at, status, created_at, updated_at')
    .eq('team_id', teamId)
    .order('due_at', { ascending: true })
  if (qErr) return NextResponse.json({ error: 'Milestones unavailable' }, { status: 500 })
  return NextResponse.json({ milestones: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => null)
  if (!b) return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 })
  if (typeof b.id !== 'string' || !['planned', 'in_progress', 'blocked', 'complete'].includes(b.status)) {
    return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 })
  }

  const db = await createSupabaseServer()
  // The team_milestones_guard_columns trigger (migration 011) blocks any
  // non-admin attempt to change fields other than status/updated_at.
  const { data, error: uErr } = await db
    .from('team_milestones')
    .update({ status: b.status, updated_at: new Date().toISOString() })
    .eq('id', b.id)
    .select()
    .single()
  if (uErr) return NextResponse.json({ error: 'Could not update milestone' }, { status: 500 })
  return NextResponse.json({ milestone: data })
}
