// Next.js instrumentation entry. Called once on server startup.
// Wires the log sink based on LOG_SINK env. The instrumentation
// hook is documented at https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
// and runs before any route handler.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapLogSink } = await import('./lib/log-bootstrap')
    bootstrapLogSink()
  }
}
