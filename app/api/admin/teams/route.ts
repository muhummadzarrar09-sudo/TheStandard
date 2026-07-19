// Admin teams API. PRD §11: "Assign/reassign teams and edit
// canonical team idea." This endpoint lets an admin:
//   GET   — list every team in their cohort with its members.
//   POST  — create a new team in the admin's cohort, optionally
//           with member_ids[] for initial assignment.
//   PATCH — update team fields (name, idea_name, problem_statement,
//           objective, status) and/or reassign members in one call.
//   DELETE — soft-delete (status='archived') is not supported here;
//            PATCH with status='archived' is the right move.
//
// All routes are scoped to the admin's own cohort (PRD §11).
// Service-role operations are guarded by requireServerAdmin().

import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { badRequest, toResponse, serverError, notFound, conflict } from '../../../../lib/api-errors'
import { withErrorHandling } from '../../../../lib/api-handler'
import { isUuid, isBoundedString, isOneOf } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

const TEAM_STATUSES = ['active', 'paused', 'archived'] as const
const NAME_MAX = 80
const LONG_MAX = 2000

function parseBody(body: any): { ok: true; data: any } | { ok: false; error: string; field?: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid payload' }
  return { ok: true, data: body }
}

export const GET = withErrorHandling(async (): Promise<Response> => {
  const { db } = await requireServerAdmin()
  const { data: teams, error } = await db
    .from('teams')
    .select('id, name, idea_name, problem_statement, objective, status, team_members(user_id, profiles!inner(email, display_name))')
    .order('name', { ascending: true })
  if (error) return toResponse(serverError('Teams unavailable'))
  return NextResponse.json({ teams: teams || [] })
})

export const POST = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  const { db, cohortId } = await requireServerAdmin()
  if (!cohortId) {
    return toResponse(badRequest('No cohort associated with this admin. Create a cohort first.'))
  }
  const parsed = parseBody(await safeJson(req))
  if (!parsed.ok) return toResponse(badRequest(parsed.error))
  const body = parsed.data
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!isBoundedString(name, 1, NAME_MAX)) {
    return toResponse(badRequest(`name must be 1..${NAME_MAX} characters`, { field: 'name' }))
  }
  const idea_name = body.idea_name == null ? null : String(body.idea_name).trim() || null
  const problem_statement = body.problem_statement == null ? null : String(body.problem_statement).trim() || null
  const objective = body.objective == null ? null : String(body.objective).trim() || null
  if (idea_name && idea_name.length > LONG_MAX) {
    return toResponse(badRequest(`idea_name too long`, { field: 'idea_name' }))
  }
  if (problem_statement && problem_statement.length > LONG_MAX) {
    return toResponse(badRequest(`problem_statement too long`, { field: 'problem_statement' }))
  }
  if (objective && objective.length > LONG_MAX) {
    return toResponse(badRequest(`objective too long`, { field: 'objective' }))
  }
  // Optional initial member assignment.
  let memberIds: string[] = []
  if (Array.isArray(body.memberIds)) {
    for (const id of body.memberIds) {
      if (typeof id !== 'string' || !isUuid(id)) {
        return toResponse(badRequest('memberIds must be an array of UUIDs', { field: 'memberIds' }))
      }
    }
    memberIds = body.memberIds
  }
  // Insert the team.
  const { data: team, error: insErr } = await db
    .from('teams')
    .insert({
      cohort_id: cohortId,
      name,
      idea_name,
      problem_statement,
      objective,
      status: 'active'
    })
    .select('id, name, idea_name, problem_statement, objective, status')
    .single()
  if (insErr || !team) {
    if (insErr && /duplicate|unique/i.test(insErr.message || '')) {
      return toResponse(conflict('A team with that name already exists'))
    }
    return toResponse(serverError('Team could not be created'))
  }
  // Assign members (if any).
  if (memberIds.length > 0) {
    const rows = memberIds.map(user_id => ({ team_id: team.id, user_id }))
    const { error: assignErr } = await db.from('team_members').insert(rows)
    if (assignErr) {
      return toResponse(serverError('Team created but member assignment failed'))
    }
  }
  return NextResponse.json({ team })
})

export const PATCH = withErrorHandling(async (req: NextRequest): Promise<Response> => {
  await requireServerAdmin()
  const parsed = parseBody(await safeJson(req))
  if (!parsed.ok) return toResponse(badRequest(parsed.error))
  const body = parsed.data
  const id = typeof body.id === 'string' ? body.id : ''
  if (!isUuid(id)) return toResponse(badRequest('id must be a UUID', { field: 'id' }))

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !isBoundedString(body.name, 1, NAME_MAX)) {
      return toResponse(badRequest(`name must be 1..${NAME_MAX} characters`, { field: 'name' }))
    }
    patch.name = body.name.trim()
  }
  for (const f of ['idea_name', 'problem_statement', 'objective'] as const) {
    if (body[f] !== undefined) {
      if (body[f] !== null && typeof body[f] !== 'string') {
        return toResponse(badRequest(`${f} must be a string or null`, { field: f }))
      }
      const s = body[f] == null ? null : String(body[f]).trim() || null
      if (s && s.length > LONG_MAX) {
        return toResponse(badRequest(`${f} too long`, { field: f }))
      }
      patch[f] = s
    }
  }
  if (body.status !== undefined) {
    if (!isOneOf(body.status, TEAM_STATUSES)) {
      return toResponse(badRequest(`status must be one of ${TEAM_STATUSES.join(', ')}`, { field: 'status' }))
    }
    patch.status = body.status
  }
  if (Object.keys(patch).length === 0 && !Array.isArray(body.memberIds)) {
    return toResponse(badRequest('No fields to update'))
  }
  const db = (await requireServerAdmin()).db
  let updated = null
  if (Object.keys(patch).length > 0) {
    const { data, error } = await db
      .from('teams')
      .update(patch)
      .eq('id', id)
      .select('id, name, idea_name, problem_statement, objective, status')
      .maybeSingle()
    if (error) return toResponse(serverError('Team could not be updated'))
    updated = data
  }
  if (Array.isArray(body.memberIds)) {
    for (const uid of body.memberIds) {
      if (typeof uid !== 'string' || !isUuid(uid)) {
        return toResponse(badRequest('memberIds must be an array of UUIDs', { field: 'memberIds' }))
      }
    }
    // Replace strategy: delete existing rows for this team, then insert.
    // Done in a single transaction-ish pair so a partial state is
    // visible to admins as 'cleared' rather than 'mixed'.
    const { error: delErr } = await db.from('team_members').delete().eq('team_id', id)
    if (delErr) return toResponse(serverError('Team member roster could not be cleared'))
    if (body.memberIds.length > 0) {
      const rows = body.memberIds.map((user_id: string) => ({ team_id: id, user_id }))
      const { error: insErr } = await db.from('team_members').insert(rows)
      if (insErr) return toResponse(serverError('Team members could not be assigned'))
    }
  }
  if (!updated) {
    // No field-level changes; fetch the latest row.
    const { data } = await db
      .from('teams')
      .select('id, name, idea_name, problem_statement, objective, status')
      .eq('id', id)
      .maybeSingle()
    updated = data
  }
  if (!updated) return toResponse(notFound('Team not found'))
  return NextResponse.json({ team: updated })
})

async function safeJson(req: NextRequest): Promise<any> {
  try { return await req.json() } catch { return null }
}
