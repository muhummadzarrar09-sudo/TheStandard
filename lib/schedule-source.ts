// Schedule source. The app reads the canonical schedule from
// `public.canonical_schedule_blocks` via a Supabase RPC
// (`get_canonical_schedule_for_cohort`). The hardcoded
// STANDARD_SCHEDULE in `lib/domain/schedule.ts` is now a
// *fallback* used only if the RPC is unreachable (a no-network
// state during build, or a brand-new cohort whose config row
// hasn't been created yet).
//
// This is the single source-of-truth fix for PRD §7.1: "Store
// schedule templates as data ... Do not hardcode blocks into the
// UI."

import { createSupabaseServer } from './supabase/server'
import { STANDARD_SCHEDULE, type ScheduleBlock } from './domain/schedule'
import { rowToBlock, type CanonicalRow } from './schedule-source-shared'

export { rowToBlock, type CanonicalRow } from './schedule-source-shared'

// Read the schedule for a cohort. The cohort id may be null
// (member without a cohort yet, or the admin has not yet
// provisioned the config). In that case we fall back to the
// hardcoded constant.
export async function getScheduleForCohort(cohortId: string | null): Promise<ScheduleBlock[]> {
  if (!cohortId) return STANDARD_SCHEDULE
  const db = await createSupabaseServer()
  const { data, error } = await db.rpc('get_canonical_schedule_for_cohort', { p_cohort: cohortId })
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return STANDARD_SCHEDULE
  }
  return (data as CanonicalRow[]).map(rowToBlock)
}

// Read the per-cohort schedule config (cutoff hour, template
// version). Returns sensible defaults if the cohort has no
// config row.
export async function getScheduleConfigForCohort(cohortId: string | null): Promise<{ cutoffHour: number; templateVersion: number }> {
  if (!cohortId) return { cutoffHour: 3, templateVersion: 1 }
  const db = await createSupabaseServer()
  const { data, error } = await db
    .from('cohort_schedule_config')
    .select('cutoff_hour, schedule_version')
    .eq('cohort_id', cohortId)
    .maybeSingle()
  if (error || !data) return { cutoffHour: 3, templateVersion: 1 }
  return {
    cutoffHour: typeof data.cutoff_hour === 'number' ? data.cutoff_hour : 3,
    templateVersion: typeof data.schedule_version === 'number' ? data.schedule_version : 1
  }
}
