import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { badRequest, toResponse, serverError } from '../../../../lib/api-errors'
import { withErrorHandling } from '../../../../lib/api-handler'
import { trimToRange, isBoundedString } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

const TITLE_MAX = 200
const SUMMARY_MAX = 10000
const INTERVIEWEE_MAX = 120
const BODY_MAX = 50000

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { db, user } = await requireServerAdmin()
  let body: any
  try {
    body = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  if (!body || typeof body !== 'object') return toResponse(badRequest('Invalid payload'))

  const title = trimToRange(body.title, 1, TITLE_MAX)
  if (title === null) {
    return toResponse(badRequest(`title is required and must be 1..${TITLE_MAX} characters`, { field: 'title' }))
  }
  const summary = trimToRange(body.summary, 1, SUMMARY_MAX)
  if (summary === null) {
    return toResponse(badRequest(`summary is required and must be 1..${SUMMARY_MAX} characters`, { field: 'summary' }))
  }

  let interviewee: string | null = null
  if (body.interviewee !== undefined && body.interviewee !== null && body.interviewee !== '') {
    if (typeof body.interviewee !== 'string') {
      return toResponse(badRequest('interviewee must be a string', { field: 'interviewee' }))
    }
    if (!isBoundedString(body.interviewee, 1, INTERVIEWEE_MAX)) {
      return toResponse(badRequest(
        `interviewee must be 1..${INTERVIEWEE_MAX} characters`,
        { field: 'interviewee' }
      ))
    }
    interviewee = body.interviewee.trim()
  }

  let bodyText: string | null = null
  if (body.body !== undefined && body.body !== null) {
    if (typeof body.body !== 'string') {
      return toResponse(badRequest('body must be a string', { field: 'body' }))
    }
    if (body.body.length > BODY_MAX) {
      return toResponse(badRequest(`body must be at most ${BODY_MAX} characters`, { field: 'body' }))
    }
    bodyText = body.body
  }

  // If a report with the same title already exists, treat this as a new
  // version: increment version, update fields, keep id. Otherwise
  // create a new row.
  const { data: existing } = await db
    .from('reports')
    .select('id, version')
    .eq('title', title)
    .maybeSingle()

  let data: any
  if (existing) {
    const newVersion = (existing.version || 1) + 1
    const { data: updated, error: uErr } = await db
      .from('reports')
      .update({
        summary,
        body: bodyText,
        interviewee,
        published: true,
        version: newVersion,
        published_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (uErr) return toResponse(serverError('Report could not be updated'))
    data = updated
    await db.from('audit_events').insert({
      actor_id: user.id,
      event_type: 'report_updated',
      target_id: data.id,
      metadata: { version: newVersion }
    })
  } else {
    const { data: created, error: cErr } = await db
      .from('reports')
      .insert({
        title, summary, body: bodyText, interviewee,
        published: true, version: 1
      })
      .select()
      .single()
    if (cErr) return toResponse(serverError('Report could not be published'))
    data = created
    await db.from('audit_events').insert({
      actor_id: user.id,
      event_type: 'report_published',
      target_id: data.id
    })
  }
  return NextResponse.json({ report: data })
})
