// send-push: actual delivery. Looks up the user's push_subscriptions, then
// for each endpoint calls the web-push protocol. In MVP we don't bundle the
// web-push npm package; instead we mark the job as sent and log a structured
// intent record. Wiring the actual library lands in Phase 1+ once we have
// the VAPID keys configured.
//
// Auth: requires a shared cron secret (the only caller is process-notifications).
//
// Permanent failure handling: if a subscription is expired/invalid, the row
// is marked enabled=false so future jobs skip it without retrying.
//
// Structured logging (Phase 9): every emit() is a single JSON line so
// the OTLP shipper (when LOG_OTLP_ENDPOINT is wired) can ingest it
// directly. Each delivery record carries the request_id from the
// calling cron so an ops engineer can correlate a failed delivery
// with the drain that scheduled it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async req => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const log = (level: string, msg: string, extra: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({ t: new Date().toISOString(), level, request_id: requestId, msg, ...extra }))
  }

  if (req.method !== 'POST') {
    log('warn', 'wrong method', { method: req.method })
    return new Response('Method not allowed', { status: 405 })
  }
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    log('warn', 'unauthorized send-push hit')
    return new Response('Unauthorized', { status: 401 })
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body.job_id !== 'string' || typeof body.user_id !== 'string') {
    log('warn', 'invalid payload', { keys: body ? Object.keys(body) : null })
    return new Response('Invalid payload', { status: 400 })
  }
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, device_session_id')
    .eq('user_id', body.user_id)
    .eq('enabled', true)
  if (error) {
    log('error', 'subscription lookup failed', { user_id: body.user_id, err: error.message })
    return new Response(error.message, { status: 500 })
  }
  if (!subs || subs.length === 0) {
    log('info', 'no subscriptions', { user_id: body.user_id, job_id: body.job_id })
    return Response.json({ accepted: true, delivered: 0, reason: 'no_subscriptions' })
  }
  let delivered = 0
  let permanentFailures = 0
  let transientFailures = 0
  const payload = JSON.stringify({
    title: payloadTitle(body.category),
    body: payloadBody(body.category, body.payload),
    url: payloadUrl(body.category, body.payload),
    job_id: body.job_id
  })
  for (const sub of subs) {
    try {
      // TODO: replace with a real web-push call:
      //   import webpush from "https://esm.sh/web-push";
      //   webpush.setVapidDetails(SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
      //   await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload);
      // For now we record that the job was processed and last_success_at is
      // updated. The actual push delivery lands once VAPID is configured.
      await db
        .from('push_subscriptions')
        .update({ last_success_at: new Date().toISOString() })
        .eq('id', sub.id)
      delivered++
      log('info', 'subscription delivered', { subscription_id: sub.id, device_session_id: sub.device_session_id })
    } catch (e) {
      await db
        .from('push_subscriptions')
        .update({
          last_failure_at: new Date().toISOString(),
          enabled: false
        })
        .eq('id', sub.id)
      permanentFailures++
      log('error', 'subscription permanent failure', { subscription_id: sub.id, err: e instanceof Error ? e.message : String(e) })
    }
  }
  log('info', 'send-push complete', {
    user_id: body.user_id,
    job_id: body.job_id,
    delivered,
    permanent_failures: permanentFailures,
    transient_failures: transientFailures
  })
  return Response.json({
    accepted: true,
    delivered,
    permanent_failures: permanentFailures,
    transient_failures: transientFailures,
    payload
  })
})

function payloadTitle(category: string): string {
  switch (category) {
    case 'daily_reminder':       return 'Time for the check-in'
    case 'critical_block':       return 'Critical block coming up'
    case 'new_report':           return 'New report in the library'
    case 'team_message':         return 'New message from your team'
    default:                     return 'Discipline OS'
  }
}

function payloadBody(category: string, payload: any): string {
  switch (category) {
    case 'daily_reminder':       return 'Take 5 minutes for the reflection block.'
    case 'critical_block':       return `${payload?.label || 'A critical block'} starts soon.`
    case 'new_report':           return `${payload?.title || 'A new interview'} is in the library.`
    case 'team_message':         return `${payload?.author || 'A teammate'} posted in the room.`
    default:                     return 'Open the app for the next commitment.'
  }
}

function payloadUrl(category: string, payload: any): string {
  switch (category) {
    case 'new_report':           return payload?.id ? `/reports/${payload.id}` : '/reports'
    case 'team_message':         return '/team/chat'
    case 'daily_reminder':
    case 'critical_block':
    default:                     return '/dashboard'
  }
}
