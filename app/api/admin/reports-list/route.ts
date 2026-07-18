import { NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { toResponse, serverError } from "../../../../lib/api-errors"
import { withErrorHandling } from "../../../../lib/api-handler"

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(async (): Promise<Response> => {
  const { db } = await requireServerAdmin()
  const { data, error } = await db
    .from('reports')
    .select('id, title, version, published, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })
  if (error) return toResponse(serverError('Reports unavailable'))
  return NextResponse.json({ reports: data || [] })
})
