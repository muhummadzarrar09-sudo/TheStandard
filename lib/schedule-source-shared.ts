// Pure mapping helpers for the schedule source. Kept in its own
// file so tests can import without pulling in the @supabase/ssr
// dependency that lib/schedule-source.ts uses.

import type { ScheduleBlock } from './domain/schedule'

export type CanonicalRow = {
  key: string
  start_time: string
  end_time: string | null
  label: string
  required: boolean
  critical: boolean
  sort_order: number
}

// Convert a row from the canonical table (time fields) into the
// app's internal ScheduleBlock shape (HH:MM string fields).
export function rowToBlock(row: CanonicalRow): ScheduleBlock {
  return {
    key: row.key,
    start: row.start_time.slice(0, 5),
    end: row.end_time ? row.end_time.slice(0, 5) : undefined,
    label: row.label,
    required: row.required,
    critical: row.critical
  }
}
