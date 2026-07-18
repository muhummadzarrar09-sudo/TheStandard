import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'
import { badRequest, toResponse, serverError } from '../../../lib/api-errors'
import { isUuid } from '../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const db = await createSupabaseServer()
  const { data, error: qErr } = await db
    .from('device_sessions')
    .select('id, label, device_id, created_at, last_seen_at, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('last_seen_at', { ascending: false })
  if (qErr) return toResponse(serverError('Device sessions unavailable'))
  return NextResponse.json({ sessions: data || [] })
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return toResponse(badRequest('id is required', { field: 'id' }))
  if (!isUuid(id)) return toResponse(badRequest('id must be a UUID', { field: 'id' }))

  const db = await createSupabaseServer()
  const { error: uErr } = await db
    .from('device_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (uErr) return toResponse(serverError('Could not revoke device'))
  return NextResponse.json({ ok: true })
}
