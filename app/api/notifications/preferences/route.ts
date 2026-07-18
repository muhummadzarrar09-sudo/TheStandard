import { NextRequest, NextResponse } from 'next/server'
import { getActiveUser } from '../../../../lib/auth-server'
import { createSupabaseServer } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function validateTime(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'string' || !TIME_RE.test(v)) return undefined
  return v
}

export async function GET(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await createSupabaseServer()
  const { data, error: qErr } = await db
    .from('notification_preferences')
    .select('daily_reminder, report_alerts, team_messages, critical_block_reminder, quiet_start, quiet_end, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (qErr) return NextResponse.json({ error: 'Unavailable' }, { status: 500 })
  return NextResponse.json({
    preferences: data || {
      daily_reminder: true,
      report_alerts: true,
      team_messages: true,
      critical_block_reminder: true,
      quiet_start: null,
      quiet_end: null
    }
  })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await getActiveUser(req)
  if (error) return error
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Validate quiet hours
  const quietStart = validateTime(b.quietStart)
  const quietEnd = validateTime(b.quietEnd)
  if (b.quietStart !== undefined && quietStart === undefined) {
    return NextResponse.json({ error: 'quietStart must be HH:MM or null' }, { status: 400 })
  }
  if (b.quietEnd !== undefined && quietEnd === undefined) {
    return NextResponse.json({ error: 'quietEnd must be HH:MM or null' }, { status: 400 })
  }

  const update: Record<string, unknown> = {
    user_id: user.id,
    daily_reminder: typeof b.dailyReminder === 'boolean' ? b.dailyReminder : true,
    report_alerts: typeof b.reportAlerts === 'boolean' ? b.reportAlerts : true,
    team_messages: typeof b.teamMessages === 'boolean' ? b.teamMessages : true,
    critical_block_reminder: typeof b.criticalBlockReminder === 'boolean' ? b.criticalBlockReminder : true,
    quiet_start: quietStart ?? null,
    quiet_end: quietEnd ?? null,
    updated_at: new Date().toISOString()
  }
  // If quiet hours are partially specified, both must be set.
  if ((quietStart === null) !== (quietEnd === null)) {
    return NextResponse.json({ error: 'quietStart and quietEnd must both be set or both null' }, { status: 400 })
  }

  const db = await createSupabaseServer()
  const { data, error: uErr } = await db
    .from('notification_preferences')
    .upsert(update)
    .select('daily_reminder, report_alerts, team_messages, critical_block_reminder, quiet_start, quiet_end, updated_at')
    .single()
  if (uErr) return NextResponse.json({ error: 'Could not save preferences' }, { status: 500 })
  return NextResponse.json({ preferences: data })
}
