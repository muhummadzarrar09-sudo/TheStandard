// Admin schedule config API. PRD §7.1: "Day cutoff: default
// 03:00 local time the following day, configurable by admin."
// This endpoint lets the admin of a cohort change the cutoff
// hour. The schedule template itself (block list) is
// server-managed and not editable from the admin UI in MVP;
// only the cutoff hour is.

import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { badRequest, toResponse, serverError, notFound } from '../../../../lib/api-errors'
import { withErrorHandling } from '../../../../lib/api-handler'

export const dynamic = 'force-dynamic'

const HOUR_MIN = 0
const HOUR_MAX = 23

export const GET = withErrorHandling(async (): Promise<Response> => {
  const { db, cohortId } = await requireServerAdmin()
  if (!cohortId) {
    return NextResponse.json({ cohortId: null, cutoffHour: 3, templateVersion: 1, exists: false })
  }
  const { data, error } = await db
    .from('cohort_schedule_config')
    .select('cohort_id, cutoff_hour, schedule_version')
    .eq('cohort_id', cohortId)
    .maybeSingle()
  if (error) return toResponse(serverError('Schedule config unavailable'))
  if (!data) {
    return NextResponse.json({ cohortId, cutoffHour: 3, templateVersion: 1, exists: false })
  }
  return NextResponse.json({
    cohortId,
    cutoffHour: typeof data.cutoff_hour === 'number' ? data.cutoff_hour : 3,
    templateVersion: typeof data.schedule_version === 'number' ? data.schedule_version : 1,
    exists: true
  })
})

export const PUT = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { db, cohortId } = await requireServerAdmin()
  if (!cohortId) {
    return toResponse(badRequest('No cohort associated with this admin. Create a cohort first.'))
  }
  let body: any
  try { body = await req.json() } catch { return toResponse(badRequest('Invalid JSON')) }
  if (!body || typeof body !== 'object') return toResponse(badRequest('Invalid payload'))
  const cutoff = body.cutoffHour
  if (typeof cutoff !== 'number' || !Number.isInteger(cutoff) || cutoff < HOUR_MIN || cutoff > HOUR_MAX) {
    return toResponse(badRequest(`cutoffHour must be an integer ${HOUR_MIN}..${HOUR_MAX}`, { field: 'cutoffHour' }))
  }
  // Upsert: the cohort may not have a config row yet (fresh
  // cohort). On insert we set schedule_version=1; on update we
  // bump it so cached clients know the schedule has changed.
  const { data: existing } = await db
    .from('cohort_schedule_config')
    .select('schedule_version')
    .eq('cohort_id', cohortId)
    .maybeSingle()
  const nextVersion = (existing?.schedule_version || 0) + 1
  const { data, error } = await db
    .from('cohort_schedule_config')
    .upsert({
      cohort_id: cohortId,
      cutoff_hour: cutoff,
      schedule_version: nextVersion,
      updated_at: new Date().toISOString()
    }, { onConflict: 'cohort_id' })
    .select('cohort_id, cutoff_hour, schedule_version')
    .single()
  if (error) return toResponse(serverError('Schedule config could not be saved'))
  return NextResponse.json({
    cohortId: data.cohort_id,
    cutoffHour: data.cutoff_hour,
    templateVersion: data.schedule_version,
    exists: true
  })
})
