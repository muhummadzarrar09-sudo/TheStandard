import { NextResponse } from 'next/server'
import { requireServerAdminWithCohort } from '../../../../lib/admin/server-guard'
import { serverError } from '../../../../lib/api-errors'
import { withErrorHandling, withRequestIdHeader, withAccessLog } from '../../../../lib/api-handler'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 5000

// Returns a CSV export. Per PRD 11 and the audit: scope to the admin's
// own cohort; never export all-cohorts data; never leak Postgres error
// messages.
export const GET = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (): Promise<Response> => {
      const { db, cohortId } = await requireServerAdminWithCohort()

      // Get the member user_ids in this cohort, then filter completions.
      const { data: members } = await db
        .from('profiles')
        .select('id')
        .eq('role', 'member')
        .eq('cohort_id', cohortId)
      const memberIds = (members || []).map(m => m.id)
      if (memberIds.length === 0) {
        return new Response(
          'local_date,user_id,block_key,status,completed_at\n',
          { headers: csvHeaders() }
        )
      }

      const { data, error } = await db
        .from('block_completions')
        .select('local_date, user_id, block_key, status, completed_at')
        .in('user_id', memberIds)
        .order('local_date', { ascending: false })
        .limit(MAX_ROWS)
      if (error) {
        logUnexpected('export query failed', error)
        return new Response('Export unavailable', { status: 500 })
      }

      const rows = [
        'local_date,user_id,block_key,status,completed_at',
        ...(data || []).map(x =>
          [x.local_date, x.user_id, x.block_key, x.status, x.completed_at]
            .map(v => `"${String(v ?? '').replaceAll('"', '""')}"`)
            .join(',')
        )
      ]
      return new Response(rows.join('\n'), { headers: csvHeaders() })
    })
  )
)

function csvHeaders() {
  return {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': 'attachment; filename="discipline-progress.csv"'
  }
}

import { log } from '../../../../lib/log'
function logUnexpected(msg: string, err: unknown) {
  log.error({ err: err instanceof Error ? { message: err.message } : String(err) }, msg)
}
