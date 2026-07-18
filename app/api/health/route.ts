import { createSupabaseServer } from '../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

// Shallow health check: returns 200 with a body describing service state.
// Used by Vercel + cron monitoring. Does not auth-check.
export async function GET(): Promise<Response> {
  const start = Date.now()
  const checks: { name: string; ok: boolean; ms: number; error?: string }[] = []
  let overallOk = true

  // 1. Supabase: a lightweight query that confirms reachability + auth.
  try {
    const t0 = Date.now()
    const db = await createSupabaseServer()
    const { error } = await db.from('cohorts').select('id').limit(1)
    if (error) {
      checks.push({ name: 'supabase', ok: false, ms: Date.now() - t0, error: error.message })
      overallOk = false
    } else {
      checks.push({ name: 'supabase', ok: true, ms: Date.now() - t0 })
    }
  } catch (e) {
    checks.push({ name: 'supabase', ok: false, ms: 0, error: e instanceof Error ? e.message : 'unknown' })
    overallOk = false
  }

  return Response.json(
    {
      ok: overallOk,
      service: 'discipline-os',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - start,
      checks
    },
    { status: overallOk ? 200 : 503 }
  )
}
