import { NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { db } = await requireServerAdmin()
    const { data, error } = await db
      .from('cohorts')
      .select('id, name, status, enrollment_open_at, enrollment_close_at, start_at, end_at')
      .order('start_at', { ascending: false })
    if (error) return NextResponse.json({ error: 'Cohorts unavailable' }, { status: 500 })
    return NextResponse.json({ cohorts: data || [] })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
