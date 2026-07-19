import { createSupabaseServer } from '../supabase/server'
import { unauthorized, forbidden, type ApiResponse } from '../api-errors'

export type ServerAdminContext = {
  db: Awaited<ReturnType<typeof createSupabaseServer>>
  user: { id: string }
  // The cohort the admin manages. PRD 11: "an admin manages a single
  // cohort." Routes that touch cohort-scoped data should always read
  // this and reject any request that targets a different cohort.
  cohortId: string | null
}

// Throws an ApiResponse on failure (so the route's try/catch can convert
// it via withErrorHandling) or returns the admin's context on success.
export async function requireServerAdmin(): Promise<ServerAdminContext> {
  const db = await createSupabaseServer()
  const { data: { user }, error } = await db.auth.getUser()
  if (error || !user) throw unauthorized()
  const { data: profile } = await db
    .from('profiles')
    .select('role, cohort_id')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw forbidden()
  return { db, user, cohortId: profile?.cohort_id ?? null }
}

// Helper for routes that *require* the admin to be assigned to a
// cohort (e.g. enrollment, export). Throws 403 if the admin has no
// cohort. Routes that can operate cohort-less (e.g. listing all
// cohorts the admin has access to) should call requireServerAdmin()
// directly and handle a null cohortId themselves.
export async function requireServerAdminWithCohort(): Promise<ServerAdminContext & { cohortId: string }> {
  const ctx = await requireServerAdmin()
  if (!ctx.cohortId) throw forbidden('No cohort assigned to this admin.')
  return ctx as ServerAdminContext & { cohortId: string }
}
