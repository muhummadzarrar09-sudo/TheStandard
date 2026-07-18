import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { isValidEmail } from '../../../../lib/auth'
import { badRequest, toResponse, serverError } from '../../../../lib/api-errors'
import { withErrorHandling } from '../../../../lib/api-handler'
import { isUuid, trimToRange, isBoundedString } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

const DISPLAY_NAME_MAX = 80

export const GET = withErrorHandling(async (): Promise<Response> => {
  const { db } = await requireServerAdmin()
  const { data, error } = await db
    .from('profiles')
    .select('id, email, display_name, cohort_id, role, access_start_at, access_end_at, teams!cohort_id(name)')
    .eq('role', 'member')
    .order('email', { ascending: true })
  if (error) return toResponse(serverError('Members unavailable'))
  return NextResponse.json({ members: data || [] })
})

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { db, user } = await requireServerAdmin()
  let body: any
  try {
    body = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  if (!body || typeof body !== 'object') return toResponse(badRequest('Invalid payload'))

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!isValidEmail(email)) {
    return toResponse(badRequest('Invalid email', { field: 'email' }))
  }

  let displayName: string | null = null
  if (body.displayName !== undefined && body.displayName !== null) {
    if (typeof body.displayName !== 'string') {
      return toResponse(badRequest('displayName must be a string', { field: 'displayName' }))
    }
    if (!isBoundedString(body.displayName, 1, DISPLAY_NAME_MAX)) {
      return toResponse(badRequest(
        `displayName must be 1..${DISPLAY_NAME_MAX} characters`,
        { field: 'displayName' }
      ))
    }
    displayName = body.displayName.trim()
  }

  let cohortId: string | null = null
  if (body.cohortId !== undefined && body.cohortId !== null && body.cohortId !== '') {
    if (typeof body.cohortId !== 'string' || !isUuid(body.cohortId)) {
      return toResponse(badRequest('cohortId must be a UUID', { field: 'cohortId' }))
    }
    cohortId = body.cohortId
  }

  // Preserve the existing role on update: only set role to 'member' on insert.
  const { data: existing } = await db
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .maybeSingle()
  const insertRow: Record<string, unknown> = {
    email,
    display_name: displayName,
    cohort_id: cohortId
  }
  if (!existing) {
    insertRow.role = 'member'
  }
  const { data, error } = await db
    .from('profiles')
    .upsert(insertRow, { onConflict: 'email' })
    .select('id, email, display_name, cohort_id, role')
    .single()
  if (error) return toResponse(serverError('Member could not be provisioned'))
  await db.from('audit_events').insert({
    actor_id: user.id,
    event_type: 'member_provisioned',
    target_id: data.id,
    metadata: { email }
  })
  return NextResponse.json({ member: data })
})
