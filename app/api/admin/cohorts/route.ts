import { NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { toResponse, serverError } from "../../../../lib/api-errors"
import { withErrorHandling } from "../../../../lib/api-handler"

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(async (): Promise<Response> => {
  const { db } = await requireServerAdmin()
  const { data, error } = await db
    .from('cohorts')
    .select('id, name, status, enrollment_open_at, enrollment_close_at, start_at, end_at')
    .order('start_at', { ascending: false })
  if (error) return toResponse(serverError('Cohorts unavailable'))
  return NextResponse.json({ cohorts: data || [] })
})
