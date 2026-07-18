import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'
import { localDateInTimezone, cutoffForLocalDate } from '../../../lib/domain'
import { validTimezone, isIsoDate } from '../../../lib/validation/schedule'
import { badRequest, conflict, toResponse, serverError, type ApiResponse } from '../../../lib/api-errors'

export const dynamic = 'force-dynamic'

const REFLECTION_MAX = 5000

export async function GET(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const db = await createSupabaseServer()
  const date = new URL(req.url).searchParams.get('date')
  if (date !== null && !isIsoDate(date)) {
    return toResponse(badRequest('Invalid date', { field: 'date' }))
  }
  const query = db
    .from('daily_checkins')
    .select('local_date, completed, reflection_private, updated_at')
    .eq('user_id', user.id)
  const { data, error: qErr } = await (date
    ? query.eq('local_date', date)
    : query.order('local_date', { ascending: false }).limit(30))
  if (qErr) return toResponse(serverError('Check-ins unavailable'))
  return NextResponse.json({ checkins: data || [] })
}

export async function PUT(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let b: any
  try {
    b = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  if (!b) return toResponse(badRequest('Invalid check-in'))

  const timezone = typeof b.timezone === 'string' ? b.timezone : 'UTC'
  if (!validTimezone(timezone)) {
    return toResponse(badRequest('Invalid timezone', { field: 'timezone' }))
  }
  const clientLocalDate = typeof b.localDate === 'string' ? b.localDate : ''
  if (clientLocalDate && !isIsoDate(clientLocalDate)) {
    return toResponse(badRequest('Invalid localDate', { field: 'localDate' }))
  }
  const localDate = clientLocalDate || localDateInTimezone(new Date(), timezone)
  if (typeof b.completed !== 'boolean') {
    return toResponse(badRequest('completed must be a boolean', { field: 'completed' }))
  }
  if (typeof b.reflection !== 'string' && b.reflection !== null && b.reflection !== undefined) {
    return toResponse(badRequest('reflection must be a string or null', { field: 'reflection' }))
  }
  if (typeof b.reflection === 'string' && b.reflection.length > REFLECTION_MAX) {
    return toResponse(badRequest(`reflection must be at most ${REFLECTION_MAX} characters`, { field: 'reflection' }))
  }

  const now = new Date()
  // PRD 18.6: no retroactive completion after cutoff.
  if (b.completed && now > cutoffForLocalDate(localDate, timezone)) {
    return toResponse(conflict('This day is past the cutoff', { field: 'localDate' }))
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
    return toResponse(conflict('Access has not opened yet'))
  }
  if (profile?.access_end_at && nowMs > new Date(profile.access_end_at).getTime()) {
    return toResponse(conflict('Access has closed'))
  }

  const { data, error: uErr } = await db
    .from('daily_checkins')
    .upsert(
      {
        user_id: user.id,
        local_date: localDate,
        completed: b.completed,
        reflection_private: typeof b.reflection === 'string' ? b.reflection.slice(0, REFLECTION_MAX) : null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,local_date' }
    )
    .select('local_date, completed, reflection_private, updated_at')
    .single()
  if (uErr) return toResponse(serverError('Check-in could not be saved'))
  return NextResponse.json({ checkin: data })
}
