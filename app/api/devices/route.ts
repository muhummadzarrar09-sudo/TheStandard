import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await createSupabaseServer()
  const { data, error: qErr } = await db
    .from('device_sessions')
    .select('id, label, device_id, created_at, last_seen_at, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('last_seen_at', { ascending: false })
  if (qErr) return NextResponse.json({ error: 'Unavailable' }, { status: 500 })
  return NextResponse.json({ sessions: data || [] })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = await createSupabaseServer()
  const { error: uErr } = await db
    .from('device_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (uErr) return NextResponse.json({ error: 'Could not revoke device' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
