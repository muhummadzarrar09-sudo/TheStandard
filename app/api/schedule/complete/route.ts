import { NextRequest, NextResponse } from 'next/server'
import { getActiveUser } from '../../../../../lib/auth-server'
import { STANDARD_SCHEDULE, localDateInTimezone, cutoffForLocalDate } from '../../../../../lib/domain'
import { validTimezone, validClientEventId } from '../../../../../lib/validation/schedule'
import { createSupabaseServer } from '../../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

// Returns the current time as "HH:MM" in the given IANA timezone. Empty
// string on failure.
function currentHHMMInZone(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit'
    }).formatToParts(date)
    const h = Number(parts.find(p => p.type === 'hour')!.value === '24' ? '0' : parts.find(p => p.type === 'hour')!.value)
    const m = Number(parts.find(p => p.type === 'minute')!.value)
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { blockKey, timezone, clientEventId } = body || {}
  if (typeof blockKey !== 'string' || typeof timezone !== 'string' || typeof clientEventId !== 'string') {
    return NextResponse.json({ error: 'Invalid completion payload' }, { status: 400 })
  }
  if (!validTimezone(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
  }
  if (!validClientEventId(clientEventId)) {
    return NextResponse.json({ error: 'Invalid client event id' }, { status: 400 })
  }
  if (clientEventId.length > 100) {
    return NextResponse.json({ error: 'clientEventId too long' }, { status: 400 })
  }
  const block = STANDARD_SCHEDULE.find(b => b.key === blockKey)
  if (!block) {
    return NextResponse.json({ error: 'Unknown schedule block' }, { status: 400 })
  }

  const db = await createSupabaseServer()
  const now = new Date()
  const localDate = localDateInTimezone(now, timezone)
  if (now > cutoffForLocalDate(localDate, timezone)) {
    return NextResponse.json({ error: 'This schedule day is closed' }, { status: 409 })
  }

  // Access window check: a member whose access has been revoked or hasn't
  // opened should not be able to write completions. PRD 6.1 "subject to
  // cohort policy".
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

  // Time-of-day check: members cannot pre-mark blocks before the block's
  // start time. (PRD § 7.1 says blocks have states upcoming/active/
  // completed/missed; "upcoming" is a distinct state from "active.")
  if (block.start) {
    const nowHHMM = currentHHMMInZone(now, timezone)
    if (nowHHMM && nowHHMM < block.start) {
      return NextResponse.json({
        error: `Block not yet active. It starts at ${block.start} local time.`,
        block_start: block.start,
        now_local: nowHHMM
      }, { status: 409 })
    }
  }

  const { data, error: upsertError } = await db
    .from('block_completions')
    .upsert(
      {
        user_id: user.id,
        local_date: localDate,
        block_key: blockKey,
        timezone,
        client_event_id: clientEventId,
        status: 'completed'
      },
      { onConflict: 'user_id,local_date,block_key' }
    )
    .select()
    .single()
  if (upsertError) {
    return NextResponse.json({ error: 'Completion could not be saved' }, { status: 500 })
  }
  return NextResponse.json({ completion: data, localDate })
}
