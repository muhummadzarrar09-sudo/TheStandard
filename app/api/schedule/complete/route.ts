import { NextRequest, NextResponse } from 'next/server'
import { getActiveUser } from '../../../../../lib/auth-server'
import { STANDARD_SCHEDULE, localDateInTimezone, cutoffForLocalDate } from '../../../../../lib/domain'
import { createSupabaseServer } from '../../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { blockKey, timezone, clientEventId } = body || {}
  if (typeof blockKey !== 'string' || typeof timezone !== 'string' || typeof clientEventId !== 'string') {
    return NextResponse.json({ error: 'Invalid completion payload' }, { status: 400 })
  }
  if (!STANDARD_SCHEDULE.some(b => b.key === blockKey)) {
    return NextResponse.json({ error: 'Unknown schedule block' }, { status: 400 })
  }

  const db = await createSupabaseServer()
  const localDate = localDateInTimezone(new Date(), timezone)
  if (new Date() > cutoffForLocalDate(localDate, timezone)) {
    return NextResponse.json({ error: 'This schedule day is closed' }, { status: 409 })
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
