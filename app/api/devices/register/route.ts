// Device registration for the 3-device login flow (PRD §6.5).
//
// After a successful verify-otp, the client generates a stable
// device id (persisted in localStorage) and calls this route to
// register the session. If the user already has MAX_DEVICES
// active sessions, the route refuses and returns the list so the
// client can render the revoke picker.
//
// The flow:
//   1. Login: verify-otp succeeds, cookies are set.
//   2. Register: client calls /api/devices/register with deviceId.
//      - If < MAX_DEVICES: server creates a new device_sessions row.
//      - If >= MAX_DEVICES: server returns { needsRevoke, sessions }.
//   3. Revoke: user picks one. Client POSTs to /api/auth/device-revoke
//      with the chosen sessionId. Server marks it revoked.
//   4. Retry register: now under the cap, the new session is
//      created. The client navigates to /dashboard.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import { getActiveUser } from '../../../../lib/auth-server'
import { badRequest, toResponse, serverError, forbidden } from '../../../../lib/api-errors'
import { plausibleDeviceId, MAX_DEVICES } from '../../../../lib/auth'

export const dynamic = 'force-dynamic'

const LABEL_MAX = 64

export async function POST(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let b: any
  try { b = await req.json() } catch { return toResponse(badRequest('Invalid JSON body')) }
  if (!b || typeof b !== 'object') return toResponse(badRequest('Invalid payload'))

  if (typeof b.deviceId !== 'string' || !plausibleDeviceId(b.deviceId)) {
    return toResponse(badRequest('deviceId must be a plausible X-Device-Id', { field: 'deviceId' }))
  }
  const label = typeof b.label === 'string' ? b.label.trim().slice(0, LABEL_MAX) : null

  const db = await createSupabaseServer()

  // Check the current count. If the same deviceId is already
  // registered, treat this as a re-registration (idempotent) and
  // bump last_seen_at.
  const { data: existing, error: eErr } = await db
    .from('device_sessions')
    .select('id, revoked_at')
    .eq('user_id', user.id)
    .eq('device_id', b.deviceId)
    .maybeSingle()
  if (eErr) return toResponse(serverError('Could not look up device'))

  if (existing) {
    // Re-registration: update last_seen_at (and clear revoked_at
    // if it was previously revoked, so the user can come back).
    const { error: uErr } = await db
      .from('device_sessions')
      .update({
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
        ...(label ? { label } : {})
      })
      .eq('id', existing.id)
    if (uErr) return toResponse(serverError('Could not update device session'))
    return NextResponse.json({ ok: true, reRegistered: true })
  }

  // New device. Check the cap.
  const { count, error: cErr } = await db
    .from('device_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('revoked_at', null)
  if (cErr) return toResponse(serverError('Could not count device sessions'))

  if ((count || 0) >= MAX_DEVICES) {
    // At or over the cap. List the active sessions and refuse.
    const { data: sessions } = await db
      .from('device_sessions')
      .select('id, label, device_id, last_seen_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: false })
    return NextResponse.json({
      ok: false,
      needsRevoke: true,
      cap: MAX_DEVICES,
      sessions: sessions || []
    })
  }

  // Under the cap: create the new row.
  const { error: iErr } = await db
    .from('device_sessions')
    .insert({
      user_id: user.id,
      device_id: b.deviceId,
      label,
      last_seen_at: new Date().toISOString()
    })
  if (iErr) {
    // Race: another tab might have registered the same device_id
    // in parallel. Treat that as success.
    if (iErr.code === '23505') {
      return NextResponse.json({ ok: true, reRegistered: true })
    }
    return toResponse(serverError('Could not register device session'))
  }
  return NextResponse.json({ ok: true })
}
