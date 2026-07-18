import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdmin } from '../../../../lib/admin/server-guard'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { db, user } = await requireServerAdmin()
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    const title = String(body.title || '').trim()
    const summary = String(body.summary || '').trim()
    const interviewee = typeof body.interviewee === 'string' ? body.interviewee.trim().slice(0, 120) || null : null
    const bodyText = typeof body.body === 'string' ? body.body : null
    if (!title || !summary || title.length > 200 || summary.length > 10000) {
      return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
    }

    // If a report with the same title already exists, treat this as a new
    // version of that report: increment version, update fields, keep id.
    // Otherwise create a new row.
    const { data: existing } = await db
      .from('reports')
      .select('id, version')
      .eq('title', title)
      .maybeSingle()

    let data: any
    if (existing) {
      const newVersion = (existing.version || 1) + 1
      const { data: updated, error: uErr } = await db
        .from('reports')
        .update({
          summary,
          body: bodyText,
          interviewee,
          published: true,
          version: newVersion,
          published_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (uErr) return NextResponse.json({ error: 'Report could not be updated' }, { status: 500 })
      data = updated
      await db.from('audit_events').insert({
        actor_id: user.id,
        event_type: 'report_updated',
        target_id: data.id,
        metadata: { version: newVersion }
      })
    } else {
      const { data: created, error: cErr } = await db
        .from('reports')
        .insert({
          title, summary, body: bodyText, interviewee,
          published: true, version: 1
        })
        .select()
        .single()
      if (cErr) return NextResponse.json({ error: 'Report could not be published' }, { status: 500 })
      data = created
      await db.from('audit_events').insert({
        actor_id: user.id,
        event_type: 'report_published',
        target_id: data.id
      })
    }
    return NextResponse.json({ report: data })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
