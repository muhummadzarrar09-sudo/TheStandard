import { NextResponse } from 'next/server'
import { requireServerAdminWithCohort } from '../../../../lib/admin/server-guard'
import { toResponse, serverError } from '../../../../lib/api-errors'
import { withErrorHandling, withRequestIdHeader, withAccessLog } from '../../../../lib/api-handler'

export const dynamic = 'force-dynamic'

// Returns the published reports. Reports are global (PRD § 8 — they
// are the public intelligence library, not cohort-scoped), so we
// return all published reports and rely on the
// `requireServerAdminWithCohort` guard to ensure the caller is a
// real admin with a cohort assigned.
export const GET = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (): Promise<Response> => {
      const { db } = await requireServerAdminWithCohort()
      const { data, error } = await db
        .from('reports')
        .select('id, title, version, published, published_at')
        .eq('published', true)
        .order('published_at', { ascending: false })
      if (error) return toResponse(serverError('Reports unavailable'))
      return NextResponse.json({ reports: data || [] })
    })
  )
)
