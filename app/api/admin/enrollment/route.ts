import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { badRequest, toResponse, serverError } from '../../../../lib/api-errors'
import { withErrorHandling } from '../../../../lib/api-handler'
import { isUuid } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { db, user } = await requireServerAdmin()
  let body: any
  try {
    body = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  const { cohortId, open } = body || {}
  if (typeof cohortId !== 'string' || !isUuid(cohortId)) {
    return toResponse(badRequest('cohortId is required and must be a UUID', { field: 'cohortId' }))
  }
  if (typeof open !== 'boolean') {
    return toResponse(badRequest('open must be a boolean', { field: 'open' }))
  }

  const { data, error } = await db
    .from('cohorts')
    .update({ status: open ? 'enrolling' : 'closed' })
    .eq('id', cohortId)
    .select('id, status')
    .single()
  if (error) return toResponse(serverError('Enrollment could not be updated'))

  await db.from('audit_events').insert({
    actor_id: user.id,
    event_type: open ? 'enrollment_opened' : 'enrollment_closed',
    target_id: data.id
  })
  return NextResponse.json({ cohort: data })
})
