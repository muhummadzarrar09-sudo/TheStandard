import { createSupabaseServer } from './supabase/server'
import { plausibleDeviceId } from './auth'
import { NextRequest } from 'next/server'
import { unauthorized, type ApiResponse } from './api-errors'

// Resolves the authenticated user and, if x-device-id is present, enforces
// device revocation. Returns the user, or an ApiResponse describing the
// failure (which the caller should convert to a Response via toResponse).
// When x-device-id is absent, the helper still returns the user; the call
// site can choose to require the header or treat its absence as best-effort.
export async function getActiveUser(req: NextRequest): Promise<{ user: { id: string } | null; error: ApiResponse | null }> {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    return { user: null, error: unauthorized() }
  }
  const header = req.headers.get('x-device-id')
  if (!plausibleDeviceId(header)) {
    return { user, error: null }
  }
  const { data: session } = await db
    .from('device_sessions')
    .select('id, revoked_at')
    .eq('user_id', user.id)
    .eq('device_id', header)
    .maybeSingle()
  if (!session) {
    return { user: null, error: unauthorized('Unknown device') }
  }
  if (session.revoked_at) {
    return { user: null, error: unauthorized('This device has been signed out. Please sign in again.') }
  }
  return { user, error: null }
}
