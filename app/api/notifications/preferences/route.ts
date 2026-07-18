import { NextRequest, NextResponse } from 'next/server'
import { getActiveUser } from '../../../../lib/auth-server'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import { badRequest, toResponse, serverError } from '../../../../lib/api-errors'
import { isHHMM } from '../../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

// Coerce a quiet-hours value: null/undefined/'' → null; valid HH:MM →
// string; anything else → undefined (caller treats undefined as 400).
function coerceHHMM(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === '') return null
  if (isHHMM(v)) return v
  return undefined
}

const DEFAULTS = {
  daily_reminder: true,
  report_alerts: true,
  team_messages: true,
  critical_block_reminder: true,
  quiet_start: null as string | null,
  quiet_end: null as string | null
}

export async function GET(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const db = await createSupabaseServer()
  const { data, error: qErr } = await db
    .from('notification_preferences')
    .select('daily_reminder, report_alerts, team_messages, critical_block_reminder, quiet_start, quiet_end, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (qErr) return toResponse(serverError('Preferences unavailable'))
  return NextResponse.json({ preferences: data || DEFAULTS })
}

export async function PATCH(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let b: any
  try {
    b = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  if (!b || typeof b !== 'object') return toResponse(badRequest('Invalid payload'))

  // Validate every input. The API uses camelCase on the wire.
  if (b.dailyReminder !== undefined && typeof b.dailyReminder !== 'boolean') {
    return toResponse(badRequest('dailyReminder must be a boolean', { field: 'dailyReminder' }))
  }
  if (b.reportAlerts !== undefined && typeof b.reportAlerts !== 'boolean') {
    return toResponse(badRequest('reportAlerts must be a boolean', { field: 'reportAlerts' }))
  }
  if (b.teamMessages !== undefined && typeof b.teamMessages !== 'boolean') {
    return toResponse(badRequest('teamMessages must be a boolean', { field: 'teamMessages' }))
  }
  if (b.criticalBlockReminder !== undefined && typeof b.criticalBlockReminder !== 'boolean') {
    return toResponse(badRequest('criticalBlockReminder must be a boolean', { field: 'criticalBlockReminder' }))
  }

  const quietStart = coerceHHMM(b.quietStart)
  const quietEnd = coerceHHMM(b.quietEnd)
  if (b.quietStart !== undefined && quietStart === undefined) {
    return toResponse(badRequest('quietStart must be HH:MM or null', { field: 'quietStart' }))
  }
  if (b.quietEnd !== undefined && quietEnd === undefined) {
    return toResponse(badRequest('quietEnd must be HH:MM or null', { field: 'quietEnd' }))
  }
  // If quiet hours are partially specified, both must be set.
  if ((quietStart === null) !== (quietEnd === null)) {
    return toResponse(badRequest(
      'quietStart and quietEnd must both be set or both null',
      { field: 'quietStart' }
    ))
  }

  const update: Record<string, unknown> = {
    user_id: user.id,
    daily_reminder: typeof b.dailyReminder === 'boolean' ? b.dailyReminder : DEFAULTS.daily_reminder,
    report_alerts: typeof b.reportAlerts === 'boolean' ? b.reportAlerts : DEFAULTS.report_alerts,
    team_messages: typeof b.teamMessages === 'boolean' ? b.teamMessages : DEFAULTS.team_messages,
    critical_block_reminder: typeof b.criticalBlockReminder === 'boolean' ? b.criticalBlockReminder : DEFAULTS.critical_block_reminder,
    quiet_start: quietStart ?? null,
    quiet_end: quietEnd ?? null,
    updated_at: new Date().toISOString()
  }

  const db = await createSupabaseServer()
  const { data, error: uErr } = await db
    .from('notification_preferences')
    .upsert(update)
    .select('daily_reminder, report_alerts, team_messages, critical_block_reminder, quiet_start, quiet_end, updated_at')
    .single()
  if (uErr) return toResponse(serverError('Could not save preferences'))
  return NextResponse.json({ preferences: data })
}
