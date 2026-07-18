import './globals.css'
import { ThemeProvider } from '../themes/theme-provider'
import ServiceWorkerRegistration from '../components/pwa/ServiceWorkerRegistration'
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><ThemeProvider><ServiceWorkerRegistration />{children}</ThemeProvider></body></html>}
