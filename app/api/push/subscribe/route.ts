import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // The previous version only checked that the Authorization header was
  // present — it never validated the JWT, so a logged-out attacker who
  // knew the URL got {ok:true}. It also dropped the subscription on the
  // floor instead of persisting it. Replace with a real server-side flow.
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
  const p256dh = body.keys?.p256dh
  const auth = body.keys?.auth
  const deviceSessionId = typeof body.deviceSessionId === 'string' ? body.deviceSessionId : null

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }
  if (endpoint.length > 1024 || p256dh.length > 512 || auth.length > 128) {
    return NextResponse.json({ error: 'Subscription fields out of range' }, { status: 400 })
  }

  // If a deviceSessionId was passed, verify it belongs to this user and
  // is not revoked. This binds the push subscription to a real device.
  if (deviceSessionId) {
    const { data: session } = await db
      .from('device_sessions')
      .select('id, user_id, revoked_at')
      .eq('id', deviceSessionId)
      .maybeSingle()
    if (!session || session.user_id !== user.id || session.revoked_at) {
      return NextResponse.json({ error: 'Unknown device session' }, { status: 403 })
    }
  }

  const { error } = await db
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

  if (error) {
    return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
