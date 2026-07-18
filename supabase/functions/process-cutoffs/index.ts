// Scheduled job: invoke the canonical cutoff processor. The work is in
// SQL (public.run_cutoff_for_all_cohorts) so the logic and the leaderboard
// stay in one place. This function is the HTTP trigger; it can be called
// from Vercel Cron, pg_cron, or a GitHub Action on a 5-minute schedule.
//
// Auth: requires a shared cron secret. The function returns 200 with a
// summary of what was processed so the cron monitor can see activity.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async req => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const cutoffHour = Number(Deno.env.get('DEFAULT_CUTOFF_HOUR') || '3')
  const { data, error } = await db.rpc('run_cutoff_for_all_cohorts', {
    default_cutoff_hour: cutoffHour
  })
  if (error) {
    return new Response(error.message, { status: 500 })
  }
  const cohorts = (data || []) as Array<{
    cohort_id: string
    members_processed: number
    rows_inserted: number
  }>
  const summary = {
    cohorts_processed: cohorts.length,
    members_processed: cohorts.reduce((a, c) => a + c.members_processed, 0),
    rows_inserted: cohorts.reduce((a, c) => a + c.rows_inserted, 0),
    per_cohort: cohorts
  }
  return Response.json(summary)
})
