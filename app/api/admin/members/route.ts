import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdminWithCohort } from '../../../../lib/admin/server-guard'
import { isValidEmail } from '../../../../lib/auth'
import { badRequest, forbidden, toResponse, serverError } from '../../../../lib/api-errors'
import { withErrorHandling } from '../../../../lib/api-handler'
import { isUuid, trimToRange, isBoundedString } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

const DISPLAY_NAME_MAX = 80

export const GET = withErrorHandling(async (): Promise<Response> => {
  const { db, cohortId } = await requireServerAdminWithCohort()
  const { data, error } = await db
    .from('profiles')
    .select('id, email, display_name, cohort_id, role, access_start_at, access_end_at, teams!cohort_id(name)')
    .eq('role', 'member')
    .eq('cohort_id', cohortId)
    .order('email', { ascending: true })
  if (error) return toResponse(serverError('Members unavailable'))
  return NextResponse.json({ members: data || [] })
})

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { db, user, cohortId: adminCohortId } = await requireServerAdminWithCohort()
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

  // Admins may only provision members into their own cohort. Never trust
  // a client-supplied cohortId to widen the admin's authority.
  if (body.cohortId !== undefined && body.cohortId !== null && body.cohortId !== '' &&
      (typeof body.cohortId !== 'string' || !isUuid(body.cohortId) || body.cohortId !== adminCohortId)) {
    return toResponse(forbidden('You can only manage members in your assigned cohort.'))
  }
  const cohortId = adminCohortId

  // Preserve the existing role on update: only set role to 'member' on insert.
  const { data: existing } = await db
    .from('profiles')
    .select('id, role, cohort_id')
    .eq('email', email)
    .maybeSingle()
  if (existing && existing.cohort_id && existing.cohort_id !== adminCohortId) {
    return toResponse(forbidden('This member belongs to another cohort.'))
  }
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
