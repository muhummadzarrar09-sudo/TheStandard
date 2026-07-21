// Server-only environment validation. Values are never returned or logged.
// Keep this module free of imports that could reach client bundles.

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OTP_TOKEN_SECRET'
] as const

export type RequiredEnv = (typeof required)[number]

export function getMissingServerEnv(): RequiredEnv[] {
  return required.filter(name => !process.env[name] || process.env[name]!.trim().length === 0)
}

export function assertServerEnv(): void {
  const missing = getMissingServerEnv()
  if (missing.length > 0) {
    throw new Error(`Missing required server configuration: ${missing.join(', ')}`)
  }
}
