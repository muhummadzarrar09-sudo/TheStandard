import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { serverError, unauthorized, forbidden } from '../../../../lib/api-errors'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 5000

// Returns a CSV export. Per PRD 11 and the audit: scope to the admin's
// own cohort; never export all-cohorts data; never leak Postgres error
// messages.
export async function GET(): Promise<Response> {
  try {
    const { db } = await requireServerAdmin()

    // Scope to the admin's cohort.
    const { data: profile } = await db
      .from('profiles')
      .select('cohort_id')
      .eq('role', 'admin')
      .single()
    const cohortId = profile?.cohort_id
    if (!cohortId) {
      return new Response('No cohort assigned to this admin.', { status: 403 })
    }

    // Get the member user_ids in this cohort, then filter completions.
    const { data: members } = await db
      .from('profiles')
      .select('id')
      .eq('role', 'member')
      .eq('cohort_id', cohortId)
    const memberIds = (members || []).map(m => m.id)
    if (memberIds.length === 0) {
      return new Response(
        'local_date,block_key,status,completed_at\n',
        { headers: csvHeaders() }
      )
    }

    const { data, error } = await db
      .from('block_completions')
      .select('local_date, block_key, status, completed_at')
      .in('user_id', memberIds)
      .order('local_date', { ascending: false })
      .limit(MAX_ROWS)
    if (error) return new Response('Export unavailable', { status: 500 })

    const rows = [
      'local_date,block_key,status,completed_at',
      ...(data || []).map(x =>
        [x.local_date, x.block_key, x.status, x.completed_at]
          .map(v => `"${String(v ?? '').replaceAll('"', '""')}"`)
          .join(',')
      )
    ]
    return new Response(rows.join('\n'), { headers: csvHeaders() })
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
      const api = e as { status: number; body: { error: string } }
      return new Response(api.body.error, { status: api.status })
    }
    return new Response('Internal error', { status: 500 })
  }
}

function csvHeaders() {
  return {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': 'attachment; filename="discipline-progress.csv"'
  }
}
