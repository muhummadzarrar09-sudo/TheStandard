import Link from 'next/link'
import { t } from '../lib/copy'

export const metadata = {
  title: 'Discipline OS — Structure for people building something real',
  description: t('app.tagline')
}

export default function Landing() {
  return (
    <main className="main" id="main" tabIndex={-1}>
      <p className="eyebrow">DISCIPLINE OS · PRIVATE COHORT SYSTEM</p>
      <h1>Structure for people building something real.</h1>
      <p className="muted" style={{ maxWidth: 620 }}>{t('app.tagline')}</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
        <Link className="button" href="/login">{t('app.landingCta')}</Link>
        <Link className="muted" href="/login" style={{ alignSelf: 'center' }}>{t('app.memberSignin')}</Link>
      </div>
      <section className="card" style={{ marginTop: 45 }} aria-label={t('app.howItWorksEyebrow')}>
        <p className="eyebrow">{t('app.howItWorksEyebrow')}</p>
        <ol style={{ paddingLeft: 18, lineHeight: 1.8, marginTop: 10 }}>
          <li>{t('app.howItWorks1')}</li>
          <li>{t('app.howItWorks2')}</li>
          <li>{t('app.howItWorks3')}</li>
          <li>{t('app.howItWorks4')}</li>
        </ol>
      </section>
    </main>
  )
}
