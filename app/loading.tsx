export const metadata = { title: 'Loading… — Discipline OS' }

// Top-level loading state. Renders while a slow server component is
// being resolved (e.g. on first visit to /). The (app) group has its
// own loading.tsx for authenticated navigation.
export default function Loading() {
  return (
    <main className="main" id="main" tabIndex={-1} aria-busy="true">
      <p className="eyebrow">DISCIPLINE OS</p>
      <h1>Preparing your day…</h1>
      <p className="muted">Loading the standard and checking your local time.</p>
    </main>
  )
}
