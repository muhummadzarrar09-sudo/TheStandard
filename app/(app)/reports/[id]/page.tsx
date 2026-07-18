import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import SaveOfflineButton from '../../../../components/reports/SaveOfflineButton'

export const dynamic = 'force-dynamic'

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let report: any = null
  try {
    const db = await createSupabaseServer()
    const { data } = await db
      .from('reports')
      .select('id, title, interviewee, published_at, summary, body, version, cover_url, media_url, interviewee, tags, source_url')
      .eq('id', id)
      .eq('published', true)
      .single()
    report = data
  } catch {
    // notFound below
  }
  if (!report) return notFound()

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">DISCIPLINE<small>EXECUTION SYSTEM</small></div>
        <nav>
          <Link href="/dashboard">Today</Link>
          <Link href="/reports">Reports</Link>
          <Link className="active" href={`/reports/${id}`}>Current report</Link>
        </nav>
      </aside>
      <main className="main">
        <Link href="/reports" className="muted">← Intelligence library</Link>
        <p className="eyebrow" style={{ marginTop: 35 }}>
          INTERVIEW · {new Date(report.published_at).toLocaleDateString()} · VERSION {report.version}
        </p>
        <h1>{report.title}</h1>
        {report.interviewee && <p className="muted">Interview with {report.interviewee}</p>}
        <article className="card" style={{ marginTop: 35, lineHeight: 1.8 }}>
          <p>{report.summary}</p>
          {report.body && <div style={{ whiteSpace: 'pre-wrap' }}>{report.body}</div>}
          <SaveOfflineButton reportId={id} />
        </article>
      </main>
    </div>
  )
}
