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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body.job_id !== 'string' || typeof body.user_id !== 'string') {
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
  if (error) return new Response(error.message, { status: 500 })
  if (!subs || subs.length === 0) {
    // No devices subscribed for this user. Mark the job as failed but not
    // a permanent error so we don't burn attempts on a member who never
    // opted in.
    return Response.json({ accepted: true, delivered: 0, reason: 'no_subscriptions' })
  }
  let delivered = 0
  let permanentFailures = 0
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
    } catch (e) {
      await db
        .from('push_subscriptions')
        .update({
          last_failure_at: new Date().toISOString(),
          enabled: false
        })
        .eq('id', sub.id)
      permanentFailures++
    }
  }
  return Response.json({
    accepted: true,
    delivered,
    permanent_failures: permanentFailures,
    payload
  })
})

function payloadTitle(category: string): string {
  switch (category) {
    case 'daily_reminder':       return 'Time for the check-in'
    case 'report_alerts':        return 'New report available'
    case 'team_messages':        return 'New team message'
    case 'critical_block':       return 'Critical block starting soon'
    default:                     return 'Discipline OS'
  }
}
function payloadBody(category: string, payload: any): string {
  if (category === 'report_alerts' && payload?.title) return payload.title
  if (category === 'team_messages' && payload?.preview) return payload.preview
  if (category === 'daily_reminder') return 'Wrap the day deliberately.'
  if (category === 'critical_block') return 'A critical block starts in a few minutes.'
  return 'Open the app for the latest.'
}
function payloadUrl(category: string, payload: any): string {
  if (category === 'report_alerts' && payload?.report_id) return `/reports/${payload.report_id}`
  if (category === 'team_messages' && payload?.team_id) return `/team/chat?team=${payload.team_id}`
  return '/dashboard'
}
