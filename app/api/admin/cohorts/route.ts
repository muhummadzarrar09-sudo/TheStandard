import { NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { toResponse, serverError } from '../../../../lib/api-errors'
import { withErrorHandling, withRequestIdHeader, withAccessLog } from '../../../../lib/api-handler'

export const dynamic = 'force-dynamic'

// Returns the cohorts the calling admin can manage. PRD 11 says an
// admin manages a single cohort; we return just that one (not the full
// list) so the admin cannot see or operate on cohorts they do not own.
export const GET = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (): Promise<Response> => {
      const { db, cohortId } = await requireServerAdmin()
      if (!cohortId) {
        return NextResponse.json({ cohorts: [] })
      }
      const { data, error } = await db
        .from('cohorts')
        .select('id, name, status, enrollment_open_at, enrollment_close_at, start_at, end_at')
        .eq('id', cohortId)
        .maybeSingle()
      if (error) return toResponse(serverError('Cohorts unavailable'))
      return NextResponse.json({ cohorts: data ? [data] : [] })
    })
  )
)
