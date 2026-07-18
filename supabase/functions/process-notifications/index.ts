// Scheduled job: drain notification_jobs whose scheduled_at is due. For each
// queued job, call the send-push function (or, in MVP, mark it as sent
// after a no-op delivery, since real web-push requires the web-push library
// which is not bundled by default in Deno Deploy).
//
// Auth: requires a shared cron secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async req => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: jobs, error } = await db
    .from('notification_jobs')
    .select('id, user_id, category, payload, attempts')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(100)
  if (error) return new Response(error.message, { status: 500 })

  let sent = 0
  let failed = 0
  let skipped = 0
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
    try {
      // Hand off to send-push. We do this synchronously for MVP simplicity;
      // if the call fails we increment attempts and requeue unless we have
      // hit a permanent failure threshold.
      const res = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cron-secret': Deno.env.get('CRON_SECRET') || ''
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
        const permanent = newAttempts >= 5
        await db
          .from('notification_jobs')
          .update({
            status: permanent ? 'failed' : 'queued',
            attempts: newAttempts
          })
          .eq('id', job.id)
        permanent ? failed++ : skipped++
        continue
      }
      await db
        .from('notification_jobs')
        .update({ status: 'sent' })
        .eq('id', job.id)
      sent++
    } catch (e) {
      await db
        .from('notification_jobs')
        .update({
          status: 'queued',
          attempts: (job.attempts || 0) + 1
        })
        .eq('id', job.id)
      skipped++
    }
  }
  return Response.json({ ok: true, sent, failed, skipped, total_considered: jobs?.length || 0 })
})
