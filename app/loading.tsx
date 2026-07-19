export const metadata = { title: 'Loading… — Discipline OS' }

import { t } from '../lib/copy'

export default function Loading() {
  return (
    <main className="main" id="main" tabIndex={-1} aria-busy="true">
      <p className="eyebrow">{t('loading.eyebrow')}</p>
      <h1>{t('loading.title')}</h1>
      <p className="muted">{t('loading.body')}</p>
    </main>
  )
}
