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
              <p className="eyebrow" style={{ color: 'var(--accent)' }}>OFFICIAL UPDATE</p>
              <h2 style={{ fontSize: 19 }}>{p.title}</h2>
              <p className="muted">{p.body}</p>
              <small className="muted">{new Date(p.published_at).toLocaleDateString()}</small>
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
