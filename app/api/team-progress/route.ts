// Team progress log. Members post short updates to their team's
// shared log; admins can read all logs for moderation.
//
// PRD §7.4: "Shared progress log with author, timestamp, category,
// and text/link attachment where supported."
//
// For the MVP we ship text + optional link + category. The link
// is a single URL validated against a permissive regex (any http(s)
// URL); the column is a separate URL field in the underlying
// row so the SQL RLS policy can keep text and link separate.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'
import { badRequest, toResponse, serverError, forbidden, notFound } from '../../../lib/api-errors'
import { isUuid, isBoundedString, trimToRange } from '../../../lib/validation/schedule'

export const dynamic = 'force-dynamic'

const BODY_MAX = 3000
const LINK_MAX = 500
const CATEGORIES = ['update', 'blocker', 'milestone', 'idea'] as const
type Category = typeof CATEGORIES[number]
const URL_RE = /^https?:\/\/[^\s]+$/i

// GET /api/team-progress?teamId=<uuid>
// Returns the team's progress log, most recent first.
export async function GET(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const teamId = new URL(req.url).searchParams.get('teamId')
  if (!teamId) return toResponse(badRequest('teamId required', { field: 'teamId' }))
  if (!isUuid(teamId)) return toResponse(badRequest('teamId must be a UUID', { field: 'teamId' }))

  const db = await createSupabaseServer()
  // Confirm the caller is a team member (the RLS policy also
  // enforces this, but we surface a clear 403 here).
  const { data: membership } = await db
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return toResponse(forbidden('You are not a member of this team.'))

  const { data, error: qErr } = await db
    .from('team_progress_logs')
    .select('id, body, category, link_url, created_at, author_id, profiles!team_progress_logs_author_id_fkey(display_name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (qErr) return toResponse(serverError('Progress log unavailable'))
  return NextResponse.json({ entries: data || [] })
}

// POST /api/team-progress
// Body: { teamId, body, category, linkUrl? }
export async function POST(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let b: any
  try { b = await req.json() } catch { return toResponse(badRequest('Invalid JSON body')) }
  if (!b || typeof b !== 'object') return toResponse(badRequest('Invalid payload'))

  if (typeof b.teamId !== 'string' || !isUuid(b.teamId)) {
    return toResponse(badRequest('teamId must be a UUID', { field: 'teamId' }))
  }
  const body = trimToRange(b.body, 1, BODY_MAX)
  if (body === null) {
    return toResponse(badRequest(`body must be 1..${BODY_MAX} characters`, { field: 'body' }))
  }
  if (typeof b.category !== 'string' || !(CATEGORIES as readonly string[]).includes(b.category)) {
    return toResponse(badRequest(
      `category must be one of: ${CATEGORIES.join(', ')}`,
      { field: 'category' }
    ))
  }
  let linkUrl: string | null = null
  if (b.linkUrl !== undefined && b.linkUrl !== null && b.linkUrl !== '') {
    if (typeof b.linkUrl !== 'string' || !URL_RE.test(b.linkUrl)) {
      return toResponse(badRequest('linkUrl must be a valid http(s) URL', { field: 'linkUrl' }))
    }
    if (b.linkUrl.length > LINK_MAX) {
      return toResponse(badRequest(`linkUrl must be at most ${LINK_MAX} characters`, { field: 'linkUrl' }))
    }
    linkUrl = b.linkUrl
  }

  const db = await createSupabaseServer()
  // Confirm the caller is a team member.
  const { data: membership } = await db
    .from('team_members')
    .select('team_id')
    .eq('team_id', b.teamId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return toResponse(forbidden('You are not a member of this team.'))

  const { data, error: insErr } = await db
    .from('team_progress_logs')
    .insert({
      team_id: b.teamId,
      author_id: user.id,
      body,
      category: b.category,
      link_url: linkUrl
    })
    .select('id, body, category, link_url, created_at, author_id')
    .single()
  if (insErr) return toResponse(serverError('Progress entry could not be saved'))
  return NextResponse.json({ entry: data })
}
