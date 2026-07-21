export default function Loading() {
  return (
    <main className="main" aria-busy="true" aria-label="Loading today">
      <p className="eyebrow">DISCIPLINE OS</p>
      <h1>Preparing your day…</h1>
      <p className="muted">Loading the standard and checking your local time.</p>
      <div className="grid" style={{ marginTop: 24 }}>
        <section className="card" aria-hidden="true">
          <div className="skeleton" style={{ width: '34%', height: 12 }} />
          <div className="skeleton" style={{ width: '28%', height: 32, marginTop: 16 }} />
          <div className="skeleton" style={{ width: '100%', height: 4, marginTop: 18 }} />
        </section>
        <section className="card" aria-hidden="true">
          <div className="skeleton" style={{ width: '30%', height: 12 }} />
          <div className="skeleton" style={{ width: '70%', height: 25, marginTop: 16 }} />
        </section>
      </div>
      <span className="visually-hidden">Loading dashboard content</span>
    </main>
  )
}
