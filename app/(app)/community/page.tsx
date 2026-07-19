import { getCommunityPosts } from '../../../lib/content/queries'
import AppShell from '../../../components/ui/AppShell'
import { COMMUNITY_RAIL } from '../../../lib/nav'

export const dynamic = 'force-dynamic'

export default async function Community() {
  const posts = await getCommunityPosts()
  return (
    <AppShell items={COMMUNITY_RAIL}>
      <p className="eyebrow">CURATED COMMUNITY FEED</p>
      <h1>Stay in the room.</h1>
      <p className="muted">Official updates and selected signals from the wider community. Conversation remains external.</p>
      <div style={{ marginTop: 35 }}>
        {posts.length ? (
          posts.map(p => (
            <article className="card" style={{ marginBottom: 12 }} key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <p className="eyebrow" style={{ color: 'var(--accent)', margin: 0 }}>
                  {p.pinned ? 'PINNED · OFFICIAL UPDATE' : 'OFFICIAL UPDATE'}
                </p>
                <small className="muted" style={{ fontSize: 11 }}>
                  {new Date(p.published_at).toLocaleDateString()} · v{p.version}
                </small>
              </div>
              <h2 style={{ fontSize: 19, marginTop: 6 }}>{p.title}</h2>
              <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{p.body}</p>
              {(p.source_url || p.source_label) && (
                <p style={{ margin: '12px 0 0', fontSize: 12 }}>
                  <span className="muted">Source: </span>
                  {p.source_url ? (
                    <a
                      href={p.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)' }}
                    >
                      {p.source_label || p.source_url}
                    </a>
                  ) : (
                    <span>{p.source_label}</span>
                  )}
                </p>
              )}
            </article>
          ))
        ) : (
          <section className="card">
            <p className="muted">The feed is quiet for now. Official cohort updates will appear here.</p>
          </section>
        )}
      </div>
    </AppShell>
  )
}
