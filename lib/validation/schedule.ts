// Generic validators reused across API routes. Keep these as pure
// functions; route handlers should call them and return 400 on failure.

export function validTimezone(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export function validClientEventId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false
  // Reject impossible dates like 2026-13-45 by round-tripping through Date.
  const d = new Date(value + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === value
}

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/
export function isHHMM(value: unknown): value is string {
  return typeof value === 'string' && HHMM_RE.test(value)
}

export function isBoundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max
}

export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

// Trim and clamp a string. Returns null for non-strings.
export function trimToRange(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length < min || trimmed.length > max) return null
  return trimmed
}
