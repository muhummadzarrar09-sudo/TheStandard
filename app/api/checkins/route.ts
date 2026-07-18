import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'
import { localDateInTimezone, cutoffForLocalDate } from '../../../lib/domain'
import { validTimezone } from '../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await createSupabaseServer()
  const date = new URL(req.url).searchParams.get('date')
  const query = db
    .from('daily_checkins')
    .select('local_date, completed, reflection_private, updated_at')
    .eq('user_id', user.id)
  const { data, error: qErr } = await (date
    ? query.eq('local_date', date)
    : query.order('local_date', { ascending: false }).limit(30))
  if (qErr) return NextResponse.json({ error: 'Check-ins unavailable' }, { status: 500 })
  return NextResponse.json({ checkins: data || [] })
}

export async function PUT(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => null)
  if (!b) return NextResponse.json({ error: 'Invalid check-in' }, { status: 400 })

  const timezone = typeof b.timezone === 'string' ? b.timezone : 'UTC'
  if (!validTimezone(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
  }
  const clientLocalDate = typeof b.localDate === 'string' ? b.localDate : ''
  if (clientLocalDate && !/^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)) {
    return NextResponse.json({ error: 'Invalid check-in' }, { status: 400 })
  }
  const localDate = clientLocalDate || localDateInTimezone(new Date(), timezone)
  if (typeof b.completed !== 'boolean') {
    return NextResponse.json({ error: 'Invalid check-in' }, { status: 400 })
  }

  const now = new Date()
  // PRD 18.6: no retroactive completion after cutoff. If the member is
  // unchecking a past day, allow it; if they're checking it as complete,
  // reject if past the cutoff.
  if (b.completed && now > cutoffForLocalDate(localDate, timezone)) {
    return NextResponse.json({ error: 'This day is past the cutoff' }, { status: 409 })
  }

  // Access window check
  const db = await createSupabaseServer()
  const { data: profile } = await db
    .from('profiles')
    .select('access_start_at, access_end_at')
    .eq('id', user.id)
    .single()
  const nowMs = now.getTime()
  if (profile?.access_start_at && nowMs < new Date(profile.access_start_at).getTime()) {
    return NextResponse.json({ error: 'Access has not opened yet' }, { status: 403 })
  }
  if (profile?.access_end_at && nowMs > new Date(profile.access_end_at).getTime()) {
    return NextResponse.json({ error: 'Access has closed' }, { status: 403 })
  }

  const { data, error: uErr } = await db
    .from('daily_checkins')
    .upsert(
      {
        user_id: user.id,
        local_date: localDate,
        completed: b.completed,
        reflection_private: typeof b.reflection === 'string' ? b.reflection.slice(0, 5000) : null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,local_date' }
    )
    .select('local_date, completed, reflection_private, updated_at')
    .single()
  if (uErr) return NextResponse.json({ error: 'Check-in could not be saved' }, { status: 500 })
  return NextResponse.json({ checkin: data })
}
