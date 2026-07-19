// Chat unread count. PRD §7.4: "Show ... unread counts." The
// team_message_reads table exists (migration 010) but is never
// read; this route computes the unread count for the current
// member and exposes a POST to mark-as-read.
//
// Count: messages in the team newer than the member's last read
// message, excluding their own.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'
import { badRequest, toResponse, serverError, forbidden } from '../../../lib/api-errors'
import { isUuid } from '../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

async function ensureMember(db: Awaited<ReturnType<typeof createSupabaseServer>>, teamId: string, userId: string) {
  const { data } = await db
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const teamId = new URL(req.url).searchParams.get('teamId')
  if (!teamId) return toResponse(badRequest('teamId required', { field: 'teamId' }))
  if (!isUuid(teamId)) return toResponse(badRequest('teamId must be a UUID', { field: 'teamId' }))

  const db = await createSupabaseServer()
  if (!await ensureMember(db, teamId, user.id)) {
    return toResponse(forbidden('You are not a member of this team.'))
  }

  // Read the member's last-read marker.
  const { data: read } = await db
    .from('team_message_reads')
    .select('last_read_message_id, last_read_at')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .maybeSingle()

  // Count messages strictly newer than the last-read marker. If
  // the member has never marked-as-read, count everything.
  let query = db
    .from('team_messages')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .neq('author_id', user.id)
  if (read?.last_read_at) {
    query = query.gt('created_at', read.last_read_at)
  }
  const { count, error: qErr } = await query
  if (qErr) return toResponse(serverError('Unread count unavailable'))
  return NextResponse.json({ unread: count || 0 })
}

// Mark-as-read. Body: { teamId, lastReadMessageId }.
export async function POST(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let b: any
  try { b = await req.json() } catch { return toResponse(badRequest('Invalid JSON body')) }
  if (!b || typeof b !== 'object') return toResponse(badRequest('Invalid payload'))
  if (typeof b.teamId !== 'string' || !isUuid(b.teamId)) {
    return toResponse(badRequest('teamId must be a UUID', { field: 'teamId' }))
  }
  if (typeof b.lastReadMessageId !== 'string' || !isUuid(b.lastReadMessageId)) {
    return toResponse(badRequest('lastReadMessageId must be a UUID', { field: 'lastReadMessageId' }))
  }

  const db = await createSupabaseServer()
  if (!await ensureMember(db, b.teamId, user.id)) {
    return toResponse(forbidden('You are not a member of this team.'))
  }

  // Look up the message timestamp to store as last_read_at.
  const { data: msg, error: mErr } = await db
    .from('team_messages')
    .select('id, created_at')
    .eq('id', b.lastReadMessageId)
    .maybeSingle()
  if (mErr || !msg) return toResponse(badRequest('Unknown message'))

  // Upsert the read marker.
  const { error: uErr } = await db
    .from('team_message_reads')
    .upsert({
      team_id: b.teamId,
      user_id: user.id,
      last_read_message_id: msg.id,
      last_read_at: msg.created_at
    }, { onConflict: 'team_id,user_id' })
  if (uErr) return toResponse(serverError('Could not mark as read'))
  return NextResponse.json({ ok: true, lastReadAt: msg.created_at })
}
