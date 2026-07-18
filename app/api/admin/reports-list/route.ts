import { NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { db } = await requireServerAdmin()
    const { data, error } = await db
      .from('reports')
      .select('id, title, version, published, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
    if (error) return NextResponse.json({ error: 'Reports unavailable' }, { status: 500 })
    return NextResponse.json({ reports: data || [] })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
