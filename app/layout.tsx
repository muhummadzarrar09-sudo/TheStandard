import './globals.css'
import { ThemeProvider } from '../themes/theme-provider'
import { presets } from '../themes'
import ServiceWorkerRegistration from '../components/pwa/ServiceWorkerRegistration'
import CsrfBootstrap from '../components/pwa/CsrfBootstrap'
import SkipLink from '../components/ui/SkipLink'
import { getCspNonce } from '../lib/csp-nonce'

// Inline script that runs before React hydration and sets the data-theme
// attribute on <html> from localStorage. Prevents the flash of default
// theme on light themes (duolingo, robinhood) when a user reloads the
// page.
//
// The script carries the per-request CSP nonce so it runs under a
// strict (no-'unsafe-inline') policy. In dev the nonce is also set but
// the policy additionally allows 'unsafe-inline' for HMR.
//
// The allowed list is built from `themes` at module-load so the
// bootstrap and the provider can never drift.
const themeBootstrap = `
(function () {
  try {
    var t = localStorage.getItem('discipline-theme');
    var allowed = ${JSON.stringify(presets)};
    if (t && allowed.indexOf(t) !== -1) {
      document.documentElement.dataset.theme = t;
    }
  } catch (e) {}
})();
`

export const metadata = {
  title: 'Discipline OS — 30-day execution system',
  description: 'A 30-day execution system for disciplined daily work, team accountability, and startup progress.',
  openGraph: {
    title: 'Discipline OS — 30-day execution system',
    description: 'A 30-day execution system for disciplined daily work, team accountability, and startup progress.',
    type: 'website'
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await getCspNonce()) ?? undefined
  return (
    <html lang="en">
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <SkipLink />
        <ThemeProvider>
          <CsrfBootstrap />
          <ServiceWorkerRegistration />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
