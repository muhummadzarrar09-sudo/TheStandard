import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import { getActiveUser } from '../../../../lib/auth-server'
import { badRequest, forbidden, toResponse, serverError } from '../../../../lib/api-errors'
import { isUuid } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

const ENDPOINT_MAX = 1024
const P256DH_MAX = 512
const AUTH_MAX = 128

export async function POST(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let body: any
  try {
    body = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  if (!body || typeof body !== 'object') return toResponse(badRequest('Invalid body'))

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
  const p256dh = typeof body.keys?.p256dh === 'string' ? body.keys.p256dh : ''
  const auth = typeof body.keys?.auth === 'string' ? body.keys.auth : ''
  const deviceSessionId = typeof body.deviceSessionId === 'string' ? body.deviceSessionId : null

  if (!endpoint || !p256dh || !auth) {
    return toResponse(badRequest(
      'endpoint, keys.p256dh, and keys.auth are all required',
      { field: 'endpoint' }
    ))
  }
  if (endpoint.length > ENDPOINT_MAX || p256dh.length > P256DH_MAX || auth.length > AUTH_MAX) {
    return toResponse(badRequest('Subscription fields out of range', { field: 'endpoint' }))
  }
  if (!endpoint.startsWith('https://')) {
    return toResponse(badRequest('endpoint must be an https:// URL', { field: 'endpoint' }))
  }
  if (deviceSessionId && !isUuid(deviceSessionId)) {
    return toResponse(badRequest('deviceSessionId must be a UUID', { field: 'deviceSessionId' }))
  }

  const db = await createSupabaseServer()
  // If a deviceSessionId was passed, verify it belongs to this user and
  // is not revoked. This binds the push subscription to a real device.
  if (deviceSessionId) {
    const { data: session } = await db
      .from('device_sessions')
      .select('id, user_id, revoked_at')
      .eq('id', deviceSessionId)
      .maybeSingle()
    if (!session || session.user_id !== user.id || session.revoked_at) {
      return toResponse(forbidden('Unknown device session'))
    }
  }

  const { error: uErr } = await db
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        device_session_id: deviceSessionId,
        endpoint,
        p256dh,
        auth,
        enabled: true,
        last_success_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
    )

  if (uErr) return toResponse(serverError('Could not save subscription'))
  return NextResponse.json({ ok: true })
}
