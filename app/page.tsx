import Link from 'next/link'

export const metadata = {
  title: 'Discipline OS — Structure for people building something real',
  description: 'A 30-day execution system for disciplined daily work, team accountability, and startup progress.'
}

export default function Landing() {
  return (
    <main className="main" id="main" tabIndex={-1}>
      <p className="eyebrow">DISCIPLINE OS · PRIVATE COHORT SYSTEM</p>
      <h1>Structure for people building something real.</h1>
      <p className="muted" style={{ maxWidth: 620 }}>
        A 30-day execution system for disciplined daily work, team accountability, and startup progress.
        Sign in to access your cohort. New members are provisioned by the cohort lead.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
        <Link className="button" href="/login">Enter the system →</Link>
        <Link className="muted" href="/login" style={{ alignSelf: 'center' }}>Member sign-in</Link>
      </div>
      <section className="card" style={{ marginTop: 45 }} aria-label="How it works">
        <p className="eyebrow">HOW IT WORKS</p>
        <ol style={{ paddingLeft: 18, lineHeight: 1.8, marginTop: 10 }}>
          <li><b>One standard schedule.</b> Wake at 05:00. Deep work, lunch, team, reflection. The same structure every day so execution becomes automatic.</li>
          <li><b>One cohort.</b> 3–4 people per team. Daily check-ins, weekly commitments, shared chat. Accountability without surveillance.</li>
          <li><b>One leaderboard.</b> Ranked by current streak, completion percentage, completed days. Private reflections stay private.</li>
          <li><b>One rhythm.</b> Reminders fire at your local cutoff. Reports land in the library. Nothing else.</li>
        </ol>
      </section>
    </main>
  )
}
