import Link from 'next/link'
import { t } from '../../../lib/copy'

// Shown to logged-in members who try to visit /admin/*. The admin
// layout redirects them here instead of /dashboard, so the
// redirect is explicit and the user understands what happened.

export const metadata = {
  title: 'Not authorized — Discipline OS'
}

export default function NotAuthorized() {
  return (
    <main className="main" id="main" tabIndex={-1}>
      <p className="eyebrow">NOT AUTHORIZED</p>
      <h1>This area is for cohort admins.</h1>
      <p className="muted" style={{ maxWidth: 540 }}>
        You're signed in as a member. The admin surface is only
        available to cohort admins. If you believe you should have
        access, contact the cohort lead.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
        <Link className="button" href="/dashboard">{t('notFound.cta')}</Link>
        <Link className="muted" href="/profile" style={{ alignSelf: 'center' }}>View your profile</Link>
      </div>
    </main>
  )
}
