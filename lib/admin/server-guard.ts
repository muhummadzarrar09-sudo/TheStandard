import { createSupabaseServer } from '../supabase/server'
import { unauthorized, forbidden, type ApiResponse } from '../api-errors'

// Throws an ApiResponse on failure (so the route's try/catch can convert
// it via withErrorHandling) or returns { db, user } on success.
export async function requireServerAdmin(): Promise<{ db: Awaited<ReturnType<typeof createSupabaseServer>>; user: { id: string } }> {
  const db = await createSupabaseServer()
  const { data: { user }, error } = await db.auth.getUser()
  if (error || !user) throw unauthorized()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw forbidden()
  return { db, user }
}

export type ServerAdminContext = Awaited<ReturnType<typeof requireServerAdmin>>
