import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../lib/supabase/server'
import { getActiveUser } from '../../../lib/auth-server'
import { badRequest, toResponse, serverError } from '../../../lib/api-errors'
import { validTimezone, trimToRange, isOneOf } from '../../../lib/validation/schedule'
import { presets } from '../../../themes/theme-provider'

export const dynamic = 'force-dynamic'

const DISPLAY_NAME_MAX = 80

export async function GET(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  const db = await createSupabaseServer()
  const { data, error: qErr } = await db
    .from('profiles')
    .select('id, email, display_name, cohort_id, timezone, theme_preset, access_start_at, access_end_at')
    .eq('id', user.id)
    .single()
  if (qErr) return toResponse(serverError('Profile unavailable'))
  return NextResponse.json({ profile: data })
}

export async function PATCH(req: NextRequest): Promise<Response> {
  const { user, error } = await getActiveUser(req)
  if (error) return toResponse(error)
  if (!user) return toResponse(serverError())

  let body: any
  try {
    body = await req.json()
  } catch {
    return toResponse(badRequest('Invalid JSON body'))
  }
  if (!body || typeof body !== 'object') return toResponse(badRequest('Invalid body'))

  // Validate the three writable columns explicitly. The migration 007
  // policy and trigger prevent any other column from changing even
  // if a future maintainer adds one to the allowed list.
  const update: Record<string, string> = {}

  if (body.displayName !== undefined) {
    if (body.displayName === null) {
      update.display_name = ''
    } else {
      const name = trimToRange(body.displayName, 1, DISPLAY_NAME_MAX)
      if (name === null) {
        return toResponse(badRequest(
          `displayName must be 1..${DISPLAY_NAME_MAX} characters`,
          { field: 'displayName' }
        ))
      }
      update.display_name = name
    }
  }

  if (body.timezone !== undefined) {
    if (!validTimezone(body.timezone)) {
      return toResponse(badRequest('Invalid timezone', { field: 'timezone' }))
    }
    update.timezone = body.timezone
  }

  if (body.themePreset !== undefined) {
    if (!isOneOf(body.themePreset, presets)) {
      return toResponse(badRequest(
        `themePreset must be one of: ${presets.join(', ')}`,
        { field: 'themePreset' }
      ))
    }
    update.theme_preset = body.themePreset
  }

  if (Object.keys(update).length === 0) {
    return toResponse(badRequest('No valid fields to update'))
  }

  const db = await createSupabaseServer()
  const { data, error: uErr } = await db
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select('id, display_name, timezone, theme_preset')
    .single()
  if (uErr) return toResponse(serverError('Profile could not be updated'))
  return NextResponse.json({ profile: data })
}
