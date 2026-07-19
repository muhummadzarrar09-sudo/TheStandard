import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdminWithCohort } from '../../../../lib/admin/server-guard'
import { badRequest, toResponse, serverError } from '../../../../lib/api-errors'
import { withErrorHandling, withRequestIdHeader, withAccessLog } from '../../../../lib/api-handler'
import { isUuid } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

// Update enrollment state for the admin's own cohort. An admin
// cannot open or close enrollment for a cohort they do not manage —
// if the request targets a different cohortId, return 403.
export const POST = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (req: NextRequest): Promise<Response> => {
      const { db, user, cohortId } = await requireServerAdminWithCohort()
      let body: any
      try {
        body = await req.json()
      } catch {
        return toResponse(badRequest('Invalid JSON body'))
      }
      const { cohortId: targetId, open } = body || {}
      if (typeof targetId !== 'string' || !isUuid(targetId)) {
        return toResponse(badRequest('cohortId is required and must be a UUID', { field: 'cohortId' }))
      }
      if (targetId !== cohortId) {
        return toResponse({ status: 403, body: { error: 'You can only manage your own cohort.' } })
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
  )
)
