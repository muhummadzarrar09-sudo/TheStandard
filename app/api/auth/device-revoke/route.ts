// Device-management API for the 3-device login flow (PRD §6.5).
//
// When a member has MAX_DEVICES active sessions and tries to sign
// in on a new device, the verify-otp endpoint returns
// { needsDeviceRevoke: true, sessions: [...] } instead of
// establishing the new session. The client renders the list and
// asks the user to pick one to revoke.
//
// This route handles the revoke: it marks the chosen session as
// revoked, then the client retries the verify-otp call (which
// re-issues the new session because a slot is now free).
//
// Authentication: the caller must have a valid session (i.e.
// they got far enough to have a device-id and the call to
// request-otp succeeded). The route uses getActiveUser + a
// re-check of the email to make sure the caller is revoking
// their own session, not someone else's.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import { getActiveUser } from '../../../../lib/auth-server'
import { badRequest, toResponse, serverError, forbidden, notFound } from '../../../../lib/api-errors'
import { isUuid } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

// POST /api/auth/device-revoke
// Body: { sessionId: string, email: string }
// Revokes the given device_session (must belong to the current
// user) and returns the new active-session list.
export async function POST(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let b: any
  try { b = await req.json() } catch { return toResponse(badRequest('Invalid JSON body')) }
  if (!b || typeof b !== 'object') return toResponse(badRequest('Invalid payload'))

  if (typeof b.sessionId !== 'string' || !isUuid(b.sessionId)) {
    return toResponse(badRequest('sessionId must be a UUID', { field: 'sessionId' }))
  }
  if (typeof b.email !== 'string' || !b.email) {
    return toResponse(badRequest('email is required', { field: 'email' }))
  }

  const db = await createSupabaseServer()

  // Confirm the session belongs to the current user.
  const { data: session, error: sErr } = await db
    .from('device_sessions')
    .select('id, user_id, revoked_at')
    .eq('id', b.sessionId)
    .maybeSingle()
  if (sErr) return toResponse(serverError('Could not load session'))
  if (!session) return toResponse(notFound('Session not found'))
  if (session.user_id !== user.id) {
    return toResponse(forbidden('You can only revoke your own sessions.'))
  }

  // Revoke.
  if (!session.revoked_at) {
    const { error: uErr } = await db
      .from('device_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', session.id)
    if (uErr) return toResponse(serverError('Could not revoke session'))
  }

  // Return the updated list.
  const { data: sessions, error: lErr } = await db
    .from('device_sessions')
    .select('id, label, device_id, last_seen_at, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('last_seen_at', { ascending: false })
  if (lErr) return toResponse(serverError('Could not list sessions'))
  return NextResponse.json({ ok: true, sessions: sessions || [] })
}
