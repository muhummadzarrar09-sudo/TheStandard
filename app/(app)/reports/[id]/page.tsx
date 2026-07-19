import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServer } from '../../../../lib/supabase/server'
import SaveOfflineButton from '../../../../components/reports/SaveOfflineButton'
import AppShell from '../../../../components/ui/AppShell'
import { MEMBER_RAIL } from '../../../../lib/nav'

export const dynamic = 'force-dynamic'

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await createSupabaseServer()
  const { data: report } = await db
    .from('reports')
    .select('id, title, interviewee, published_at, summary, body, version, cover_url, media_url, tags, source_url')
    .eq('id', id)
    .eq('published', true)
    .single()
  if (!report) return notFound()

  return (
    <AppShell items={MEMBER_RAIL}>
      <Link href="/reports" className="muted">← Intelligence library</Link>
      <p className="eyebrow" style={{ marginTop: 35 }}>
        INTERVIEW · {new Date(report.published_at).toLocaleDateString()} · VERSION {report.version}
      </p>
      <h1>{report.title}</h1>
      {report.interviewee && <p className="muted">Interview with {report.interviewee}</p>}
      <article
        className="card"
        style={{ marginTop: 35, lineHeight: 1.8 }}
        aria-label={`Report: ${report.title}`}
      >
        <p>{report.summary}</p>
        {report.body && <div style={{ whiteSpace: 'pre-wrap' }}>{report.body}</div>}
        <SaveOfflineButton reportId={id} />
      </article>
    </AppShell>
  )
}
