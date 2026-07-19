// Per-cohort weekly commitments. The active cohort's commitments are
// surfaced; members can mark their own weekly commitments complete
// and attach a short private note.
import { NextRequest } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'
import { withErrorHandling, withRequestIdHeader, withAccessLog } from '../../../lib/api-handler'
import { badRequest, toResponse, serverError, type ApiResponse } from '../../../lib/api-errors'
import { isUuid, trimToRange } from '../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

const NOTE_MAX = 2000

export const GET = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (req: NextRequest): Promise<Response> => {
      const { user, error } = await getActiveUser(req)
      if (error) return toResponse(error)
      if (!user) return toResponse(serverError())

      const db = await createSupabaseServer()
      const { data: profile } = await db
        .from('profiles')
        .select('cohort_id')
        .eq('id', user.id)
        .single()
      if (!profile?.cohort_id) {
        return Response.json({ commitments: [] })
      }

      const { data, error: qErr } = await db
        .from('weekly_commitments')
        .select('id, cohort_week, title, description, user_weekly_commitments(completed, note, updated_at)')
        .eq('cohort_id', profile.cohort_id)
        .eq('active', true)
        .order('cohort_week')
      if (qErr) return toResponse(serverError('Commitments unavailable'))
      return Response.json({ commitments: data || [] })
    })
  )
)

export const PUT = withErrorHandling(
  withRequestIdHeader(
    withAccessLog(async (req: NextRequest): Promise<Response> => {
      const { user, error } = await getActiveUser(req)
      if (error) return toResponse(error)
      if (!user) return toResponse(serverError())

      let b: any
      try { b = await req.json() } catch { return toResponse(badRequest('Invalid JSON body')) }
      if (!b || typeof b !== 'object') return toResponse(badRequest('Invalid body'))

      if (typeof b.commitmentId !== 'string' || !isUuid(b.commitmentId)) {
        return toResponse(badRequest('commitmentId is required and must be a UUID', { field: 'commitmentId' }))
      }
      if (typeof b.completed !== 'boolean') {
        return toResponse(badRequest('completed must be a boolean', { field: 'completed' }))
      }

      // Note is optional. If provided, must be a string <= NOTE_MAX chars.
      let note: string | null = null
      if (b.note !== undefined && b.note !== null && b.note !== '') {
        const trimmed = trimToRange(b.note, 1, NOTE_MAX)
        if (trimmed === null) {
          return toResponse(badRequest(`note must be 1..${NOTE_MAX} characters`, { field: 'note' }))
        }
        note = trimmed
      }

      const db = await createSupabaseServer()
      const { data, error: uErr } = await db
        .from('user_weekly_commitments')
        .upsert(
          {
            user_id: user.id,
            commitment_id: b.commitmentId,
            completed: b.completed,
            note,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,commitment_id' }
        )
        .select()
        .single()
      if (uErr) return toResponse(serverError('Commitment could not be saved'))
      return Response.json({ commitment: data })
    })
  )
)
