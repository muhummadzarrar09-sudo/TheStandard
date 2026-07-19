import Link from 'next/link'

export const metadata = {
  title: 'Not found — Discipline OS'
}

export default function NotFound() {
  return (
    <main className="main" id="main" tabIndex={-1}>
      <p className="eyebrow">404 · NOT ON THE SCHEDULE</p>
      <h1>This page does not exist.</h1>
      <p className="muted" style={{ maxWidth: 540 }}>
        The link you followed does not match a surface in the system.
        If you got here from a notification, the link may be from a
        previous cohort. Return to the execution dashboard and take the
        next commitment.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
        <Link className="button" href="/dashboard">Return to Today →</Link>
        <Link className="muted" href="/login" style={{ alignSelf: 'center' }}>Sign in</Link>
      </div>
    </main>
  )
}
