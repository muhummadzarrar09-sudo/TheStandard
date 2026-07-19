// Backoff schedule for the notification_jobs queue. Mirrors
// the constants in supabase/functions/process-notifications
// so a vitest unit suite can pin the behavior without
// running the Deno function.
//
// Backoff (minutes) by attempt number (0-indexed):
//   N=0  -> 0   (immediately eligible)
//   N=1  -> 1
//   N=2  -> 5
//   N=3  -> 30
//   N=4+ -> 60
// 5 attempts is the cap (PERMANENT_THRESHOLD).

export const BACKOFF_MIN: readonly number[] = [0, 1, 5, 30, 60]
export const PERMANENT_THRESHOLD = 5

// Returns the raw backoff (no jitter) for the given attempt
// number. attempts=0 means "no failures yet" — the job is
// eligible immediately. attempts=1 means "failed once" —
// back off 1 minute.
export function backoffMinutes(attempts: number): number {
  if (attempts <= 0) return 0
  const idx = Math.min(attempts, BACKOFF_MIN.length - 1)
  return BACKOFF_MIN[idx]
}

// True if the next attempt would be a permanent failure
// (don't requeue; mark status='failed').
export function isPermanent(attempts: number): boolean {
  return attempts >= PERMANENT_THRESHOLD
}

// Compute the next_retry_at timestamp for a job that has
// just had `attempts` failures recorded.
export function nextRetryAt(attempts: number, now: number = Date.now()): Date {
  return new Date(now + backoffMinutes(attempts) * 60_000)
}
