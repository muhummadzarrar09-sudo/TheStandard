import Link from 'next/link'
import { t } from '../lib/copy'

export const metadata = {
  title: 'Not found — Discipline OS'
}

export default function NotFound() {
  return (
    <main className="main" id="main" tabIndex={-1}>
      <p className="eyebrow">{t('notFound.eyebrow')}</p>
      <h1>{t('notFound.title')}</h1>
      <p className="muted" style={{ maxWidth: 540 }}>{t('notFound.body')}</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
        <Link className="button" href="/dashboard">{t('notFound.cta')}</Link>
        <Link className="muted" href="/login" style={{ alignSelf: 'center' }}>{t('notFound.signin')}</Link>
      </div>
    </main>
  )
}
