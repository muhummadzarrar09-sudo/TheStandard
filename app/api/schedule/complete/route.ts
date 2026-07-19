import { NextRequest } from 'next/server'
import { getActiveUser } from '../../../../lib/auth-server'
import { localDateInTimezone, cutoffForLocalDate } from '../../../../lib/domain'
import { validTimezone, validClientEventId } from '../../../../lib/validation/schedule'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import { badRequest, conflict, toResponse, serverError } from '../../../../lib/api-errors'
import { getScheduleForCohort, getScheduleConfigForCohort } from '../../../../lib/schedule-source'

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

export async function POST(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let body: any
  try {
    body = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  const { blockKey, timezone, clientEventId } = body || {}
  if (typeof blockKey !== 'string') {
    return toResponse(badRequest('blockKey is required', { field: 'blockKey' }))
  }
  if (!validTimezone(timezone)) {
    return toResponse(badRequest('Invalid timezone', { field: 'timezone' }))
  }
  if (!validClientEventId(clientEventId)) {
    return toResponse(badRequest('Invalid client event id', { field: 'clientEventId' }))
  }
  if (clientEventId.length > 100) {
    return toResponse(badRequest('clientEventId too long', { field: 'clientEventId' }))
  }

  const db = await createSupabaseServer()
  const { data: profile } = await db
    .from('profiles')
    .select('cohort_id, access_start_at, access_end_at')
    .eq('id', user.id)
    .single()
  const cohortId = profile?.cohort_id || null
  const [schedule, config] = await Promise.all([
    getScheduleForCohort(cohortId),
    getScheduleConfigForCohort(cohortId)
  ])
  const block = schedule.find(b => b.key === blockKey)
  if (!block) {
    return toResponse(badRequest('Unknown schedule block', { field: 'blockKey' }))
  }

  const now = new Date()
  const localDate = localDateInTimezone(now, timezone)
  if (now > cutoffForLocalDate(localDate, timezone, config.cutoffHour)) {
    return toResponse(conflict('This schedule day is closed', { field: 'localDate' }))
  }

  // Access window check: PRD 6.1 "subject to cohort policy".
  const nowMs = now.getTime()
  if (profile?.access_start_at && nowMs < new Date(profile.access_start_at).getTime()) {
    return toResponse(conflict('Access has not opened yet'))
  }
  if (profile?.access_end_at && nowMs > new Date(profile.access_end_at).getTime()) {
    return toResponse(conflict('Access has closed'))
  }

  // Time-of-day check.
  if (block.start) {
    const nowHHMM = currentHHMMInZone(now, timezone)
    if (nowHHMM && nowHHMM < block.start) {
      return toResponse(conflict(
        `Block not yet active. It starts at ${block.start} local time.`,
        { field: 'blockKey', details: { block_start: block.start, now_local: nowHHMM } }
      ))
    }
  }

  // Lazy-insert the daily schedule instance (Phase 6a).
  // Idempotent; the function returns the existing row on conflict.
  if (cohortId) {
    await db.rpc('resolve_daily_schedule_instance', {
      p_user: user.id,
      p_cohort: cohortId,
      p_local_date: localDate,
      p_timezone: timezone,
      p_cutoff_hour: config.cutoffHour
    })
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
    return toResponse(serverError('Completion could not be saved'))
  }
  return Response.json({ completion: data, localDate })
}
