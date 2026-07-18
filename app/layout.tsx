import './globals.css'
import { ThemeProvider } from '../themes/theme-provider'
import ServiceWorkerRegistration from '../components/pwa/ServiceWorkerRegistration'

// Inline script that runs before React hydration and sets the data-theme
// attribute on <html> from localStorage. Prevents the flash of default
// theme on light themes (duolingo, robinhood) when a user reloads the
// page.
const themeBootstrap = `
(function () {
  try {
    var t = localStorage.getItem('discipline-theme');
    var allowed = ['whoop-oura','linear','duolingo','robinhood','arc','discord'];
    if (t && allowed.indexOf(t) !== -1) {
      document.documentElement.dataset.theme = t;
    }
  } catch (e) {}
})();
`

export const metadata = {
  title: 'Discipline OS',
  description: 'A 30-day execution system for disciplined daily work, team accountability, and startup progress.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <ThemeProvider>
          <ServiceWorkerRegistration />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
