// Lightweight head-only endpoint for the report detail page's
// staleness check. Returns just the version + published_at so
// the client can decide whether to show the "newer version
// available" banner. Cache-Control: no-store — the page itself
// uses the SWR cache, but this endpoint always returns live.

import { NextRequest, NextResponse } from 'next/server'
import { getActiveUser } from '../../../../../lib/auth-server'
import { toResponse, serverError, notFound } from '../../../../../lib/api-errors'
import { withErrorHandling } from '../../../../../lib/api-handler'
import { isUuid } from '../../../../../lib/validation/schedule'
import { createSupabaseServer } from '../../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> => {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const { id } = await ctx.params
  if (!isUuid(id)) return toResponse(notFound('Report not found'))

  const db = await createSupabaseServer()
  const { data: profile } = await db
    .from('profiles')
    .select('cohort_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.cohort_id) return toResponse(notFound('Report not found'))

  const { data, error: dbError } = await db
    .from('reports')
    .select('version, published_at')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle()
  if (dbError) return toResponse(serverError('Version check unavailable'))
  if (!data) return toResponse(notFound('Report not found'))

  return NextResponse.json(
    { version: data.version, published_at: data.published_at },
    { headers: { 'cache-control': 'no-store' } }
  )
})
