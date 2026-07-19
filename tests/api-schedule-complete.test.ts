import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase server factory. The integration test injects a
// per-test mock by reassigning the implementation.
const supabaseMockHolder: { current: any } = { current: null }
vi.mock('../lib/supabase/server', () => ({
  createSupabaseServer: async () => supabaseMockHolder.current
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} })
}))

import { POST as scheduleComplete } from '../app/api/schedule/complete/route'
import { makeSupabaseMock } from './_helpers/mockSupabase'

function makeRequest(body: any, deviceId?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (deviceId) headers['x-device-id'] = deviceId
  return new Request('http://localhost/api/schedule/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
}

describe('POST /api/schedule/complete', () => {
  beforeEach(() => {
    supabaseMockHolder.current = null
  })

  it('401s when there is no authenticated user', async () => {
    supabaseMockHolder.current = makeSupabaseMock({ user: null })
    const res = await scheduleComplete(makeRequest({
      blockKey: 'wake',
      timezone: 'UTC',
      clientEventId: 'evt-aaaaaaaaaa'
    }) as any)
    expect(res.status).toBe(401)
  })

  it('400s on a missing blockKey', async () => {
    supabaseMockHolder.current = makeSupabaseMock()
    const res = await scheduleComplete(makeRequest({
      timezone: 'UTC',
      clientEventId: 'evt-aaaaaaaaaa'
    }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('blockKey')
  })

  it('400s on a bad timezone', async () => {
    supabaseMockHolder.current = makeSupabaseMock()
    const res = await scheduleComplete(makeRequest({
      blockKey: 'wake',
      timezone: 'Not/AZone',
      clientEventId: 'evt-aaaaaaaaaa'
    }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('timezone')
  })

  it('400s on an unknown blockKey', async () => {
    supabaseMockHolder.current = makeSupabaseMock()
    const res = await scheduleComplete(makeRequest({
      blockKey: 'definitely-not-a-block',
      timezone: 'UTC',
      clientEventId: 'evt-aaaaaaaaaa'
    }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('blockKey')
  })

  it('400s on a too-short client event id', async () => {
    supabaseMockHolder.current = makeSupabaseMock()
    const res = await scheduleComplete(makeRequest({
      blockKey: 'wake',
      timezone: 'UTC',
      clientEventId: 'short'
    }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('clientEventId')
  })

  it('rejects when the device session is revoked', async () => {
    supabaseMockHolder.current = makeSupabaseMock({
      overrides: {
        device_sessions: (op, _chain) => {
          if (op === 'maybeSingle') {
            return Promise.resolve({ data: { id: 's-1', revoked_at: '2024-01-01' }, error: null })
          }
          return { data: null, error: null }
        }
      }
    })
    const res = await scheduleComplete(makeRequest({
      blockKey: 'wake',
      timezone: 'UTC',
      clientEventId: 'evt-aaaaaaaaaa'
    }, 'device-abc-1234') as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/signed out/i)
  })

  it('409s when the current time is past the day cutoff', async () => {
    // Pin now to 2026-06-15T04:00:00Z (after the 03:00 UTC cutoff) so
    // the cutoff-day guard rejects the request. The block-start check
    // would also reject for 'wake' at this time-of-day, but the cutoff
    // check runs first, so we see 409 'day is closed'.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T04:00:00Z'))
    supabaseMockHolder.current = makeSupabaseMock()
    const res = await scheduleComplete(makeRequest({
      blockKey: 'wake',
      timezone: 'UTC',
      clientEventId: 'evt-aaaaaaaaaa'
    }) as any)
    vi.useRealTimers()
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/day is closed/i)
  })

  it('409s when the request is for a block that has not yet started', async () => {
    // Pin now to 2026-12-15T01:00:00Z (before the 03:00 UTC cutoff,
    // so the cutoff check passes). Block 'wake' starts at 05:00 UTC,
    // so 01:00 is before it → the route's time-of-day guard rejects
    // the request as 'Block not yet active'.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-15T01:00:00Z'))
    supabaseMockHolder.current = makeSupabaseMock()
    const res = await scheduleComplete(makeRequest({
      blockKey: 'wake',
      timezone: 'UTC',
      clientEventId: 'evt-aaaaaaaaaa'
    }) as any)
    vi.useRealTimers()
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/not yet active/i)
  })
})
