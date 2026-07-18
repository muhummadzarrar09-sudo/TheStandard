import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'
import { isValidEmail } from '../../../../lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { db } = await requireServerAdmin()
    const { data, error } = await db
      .from('profiles')
      .select('id, email, display_name, cohort_id, role, access_start_at, access_end_at, teams!cohort_id(name)')
      .eq('role', 'member')
      .order('email', { ascending: true })
    if (error) return NextResponse.json({ error: 'Members unavailable' }, { status: 500 })
    return NextResponse.json({ members: data || [] })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db, user } = await requireServerAdmin()
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    const email = String(body.email || '').trim().toLowerCase()
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : null
    const cohortId = typeof body.cohortId === 'string' && body.cohortId.length > 0 ? body.cohortId : null
    // Preserve the existing role on update: only set role to 'member' on insert.
    // If a row with this email already exists, do not overwrite its role.
    const { data: existing } = await db
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle()
    const insertRow: Record<string, unknown> = {
      email,
      display_name: displayName,
      cohort_id: cohortId
    }
    if (!existing) {
      insertRow.role = 'member'
    }
    const { data, error } = await db
      .from('profiles')
      .upsert(insertRow, { onConflict: 'email' })
      .select('id, email, display_name, cohort_id, role')
      .single()
    if (error) return NextResponse.json({ error: 'Member could not be provisioned' }, { status: 500 })
    await db.from('audit_events').insert({
      actor_id: user.id,
      event_type: 'member_provisioned',
      target_id: data.id,
      metadata: { email }
    })
    return NextResponse.json({ member: data })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
