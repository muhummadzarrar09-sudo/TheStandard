// Scheduled job: drain notification_jobs whose scheduled_at
// is due. For each queued job, call the send-push function
// (or, in MVP, mark it as sent after a no-op delivery, since
// real web-push requires the web-push library which is not
// bundled by default in Deno Deploy).
//
// Backoff (Phase 9): failed jobs are not retried immediately.
// The function writes next_retry_at with an exponential
// schedule so a temporarily-failing endpoint doesn't get
// hammered every 5 minutes. 5 attempts is the cap; then
// status='failed'.
//
// Auth: requires a shared cron secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Backoff schedule, in minutes, by attempt number (0-indexed).
// attempt N has just been recorded; the NEXT eligible time is
// this many minutes from now. attempt 0 = newly created = no
// delay.
const BACKOFF_MIN: number[] = [0, 1, 5, 30, 60]
const PERMANENT_THRESHOLD = 5

// Apply +/- 20% jitter so parallel crons don't synchronize.
function jitter(ms: number): number {
  const j = ms * 0.2
  return ms + (Math.random() * 2 - 1) * j
}

function backoffMs(attempts: number): number {
  const idx = Math.min(attempts, BACKOFF_MIN.length - 1)
  return jitter(BACKOFF_MIN[idx] * 60_000)
}

Deno.serve(async req => {
  const requestId = crypto.randomUUID()
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    console.log(JSON.stringify({ t: new Date().toISOString(), level: 'warn', request_id: requestId, msg: 'unauthorized cron hit' }))
    return new Response('Unauthorized', { status: 401 })
  }
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  // Drain queued jobs that are due now. The next_retry_at check
  // lets a temporarily-failed job sit out its backoff window
  // without being repeatedly attempted.
  const { data: jobs, error } = await db
    .from('notification_jobs')
    .select('id, user_id, category, payload, attempts')
    .eq('status', 'queued')
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(100)
  if (error) {
    console.log(JSON.stringify({ t: new Date().toISOString(), level: 'error', request_id: requestId, msg: 'drain query failed', err: error.message }))
    return new Response(error.message, { status: 500 })
  }

  let sent = 0
  let failed = 0
  let skipped = 0
  let retried = 0
  for (const job of jobs || []) {
    // Mark as processing so a parallel cron doesn't double-send.
    const { data: claimed } = await db
      .from('notification_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id)
      .eq('status', 'queued')
      .select('id')
      .single()
    if (!claimed) {
      skipped++
      continue
    }
    const jobRequestId = `${requestId}-${job.id.slice(0, 8)}`
    try {
      const res = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cron-secret': Deno.env.get('CRON_SECRET') || '',
            'x-request-id': jobRequestId
          },
          body: JSON.stringify({
            job_id: job.id,
            user_id: job.user_id,
            category: job.category,
            payload: job.payload
          })
        }
      )
      if (!res.ok) {
        const newAttempts = (job.attempts || 0) + 1
        const permanent = newAttempts >= PERMANENT_THRESHOLD
        if (permanent) {
          const nextRetry = new Date(Date.now() + backoffMs(BACKOFF_MIN.length - 1))
          await db
            .from('notification_jobs')
            .update({
              status: 'failed',
              attempts: newAttempts,
              next_retry_at: nextRetry.toISOString(),
              last_error: `send-push ${res.status}`
            })
            .eq('id', job.id)
          failed++
          console.log(JSON.stringify({ t: new Date().toISOString(), level: 'error', request_id: jobRequestId, job_id: job.id, user_id: job.user_id, category: job.category, attempts: newAttempts, msg: 'notification permanently failed', err: `send-push ${res.status}` }))
        } else {
          const nextRetry = new Date(Date.now() + backoffMs(newAttempts))
          await db
            .from('notification_jobs')
            .update({
              status: 'queued',
              attempts: newAttempts,
              next_retry_at: nextRetry.toISOString(),
              last_error: `send-push ${res.status}`
            })
            .eq('id', job.id)
          retried++
          console.log(JSON.stringify({ t: new Date().toISOString(), level: 'warn', request_id: jobRequestId, job_id: job.id, user_id: job.user_id, category: job.category, attempts: newAttempts, next_retry_at: nextRetry.toISOString(), msg: 'notification will retry' }))
        }
        continue
      }
      await db
        .from('notification_jobs')
        .update({ status: 'sent', last_error: null })
        .eq('id', job.id)
      sent++
      console.log(JSON.stringify({ t: new Date().toISOString(), level: 'info', request_id: jobRequestId, job_id: job.id, user_id: job.user_id, category: job.category, msg: 'notification sent' }))
    } catch (e) {
      const newAttempts = (job.attempts || 0) + 1
      const permanent = newAttempts >= PERMANENT_THRESHOLD
      const nextRetry = new Date(Date.now() + backoffMs(permanent ? BACKOFF_MIN.length - 1 : newAttempts))
      await db
        .from('notification_jobs')
        .update({
          status: permanent ? 'failed' : 'queued',
          attempts: newAttempts,
          next_retry_at: nextRetry.toISOString(),
          last_error: e instanceof Error ? e.message : String(e)
        })
        .eq('id', job.id)
      if (permanent) {
        failed++
        console.log(JSON.stringify({ t: new Date().toISOString(), level: 'error', request_id: jobRequestId, job_id: job.id, user_id: job.user_id, category: job.category, attempts: newAttempts, msg: 'notification permanently failed', err: e instanceof Error ? e.message : String(e) }))
      } else {
        retried++
        console.log(JSON.stringify({ t: new Date().toISOString(), level: 'warn', request_id: jobRequestId, job_id: job.id, user_id: job.user_id, category: job.category, attempts: newAttempts, next_retry_at: nextRetry.toISOString(), msg: 'notification will retry', err: e instanceof Error ? e.message : String(e) }))
      }
    }
  }
  const summary = { ok: true, sent, failed, skipped, retried, total_considered: jobs?.length || 0 }
  console.log(JSON.stringify({ t: new Date().toISOString(), level: 'info', request_id: requestId, msg: 'drain complete', ...summary }))
  return Response.json(summary)
})
