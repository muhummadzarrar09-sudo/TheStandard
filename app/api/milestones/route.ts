import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'
import { badRequest, toResponse, serverError } from '../../../lib/api-errors'
import { isUuid, isOneOf } from '../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

const MILESTONE_STATUSES = ['planned', 'in_progress', 'blocked', 'complete'] as const
type MilestoneStatus = typeof MILESTONE_STATUSES[number]

export async function GET(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const teamId = new URL(req.url).searchParams.get('teamId')
  if (!teamId) return toResponse(badRequest('teamId required', { field: 'teamId' }))
  if (!isUuid(teamId)) return toResponse(badRequest('teamId must be a UUID', { field: 'teamId' }))

  const db = await createSupabaseServer()
  const { data, error: qErr } = await db
    .from('team_milestones')
    .select('id, title, description, owner_id, due_at, status, created_at, updated_at')
    .eq('team_id', teamId)
    .order('due_at', { ascending: true })
  if (qErr) return toResponse(serverError('Milestones unavailable'))
  return NextResponse.json({ milestones: data || [] })
}

export async function PATCH(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let b: any
  try {
    b = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  if (!b) return toResponse(badRequest('Invalid milestone'))
  if (typeof b.id !== 'string' || !isUuid(b.id)) {
    return toResponse(badRequest('id is required and must be a UUID', { field: 'id' }))
  }
  if (!isOneOf<MilestoneStatus>(b.status, MILESTONE_STATUSES)) {
    return toResponse(badRequest(
      'status must be one of: planned, in_progress, blocked, complete',
      { field: 'status' }
    ))
  }

  const db = await createSupabaseServer()
  // The team_milestones_guard_columns trigger (migration 011) blocks any
  // non-admin attempt to change fields other than status/updated_at.
  const { data, error: uErr } = await db
    .from('team_milestones')
    .update({ status: b.status, updated_at: new Date().toISOString() })
    .eq('id', b.id)
    .select()
    .single()
  if (uErr) return toResponse(serverError('Could not update milestone'))
  return NextResponse.json({ milestone: data })
}
