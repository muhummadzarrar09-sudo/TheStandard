// Validation tests for the team progress log input. The route
// (app/api/team-progress/route.ts) is integration-tested via the
// Supabase test env; here we just lock the validation rules.

import { describe, it, expect } from 'vitest'

// Mirrors the route's URL check. Tight: must be http(s), at most
// 500 chars. The DB has a check constraint to back this up.
const URL_RE = /^https?:\/\/[^\s]+$/i
const LINK_MAX = 500
const BODY_MAX = 3000
const CATEGORIES = ['update', 'blocker', 'milestone', 'idea'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(v: unknown): boolean {
  return typeof v === 'string' && UUID_RE.test(v)
}

function validate(body: any): { ok: true } | { ok: false; field: string; error: string } {
  if (typeof body.teamId !== 'string' || !isUuid(body.teamId)) {
    return { ok: false, field: 'teamId', error: 'teamId must be a UUID' }
  }
  if (typeof body.body !== 'string' || body.body.length < 1 || body.body.length > BODY_MAX) {
    return { ok: false, field: 'body', error: `body must be 1..${BODY_MAX} characters` }
  }
  if (typeof body.category !== 'string' || !(CATEGORIES as readonly string[]).includes(body.category)) {
    return { ok: false, field: 'category', error: 'category must be one of: update, blocker, milestone, idea' }
  }
  if (body.linkUrl !== undefined && body.linkUrl !== null && body.linkUrl !== '') {
    if (typeof body.linkUrl !== 'string' || !URL_RE.test(body.linkUrl)) {
      return { ok: false, field: 'linkUrl', error: 'linkUrl must be a valid http(s) URL' }
    }
    if (body.linkUrl.length > LINK_MAX) {
      return { ok: false, field: 'linkUrl', error: `linkUrl must be at most ${LINK_MAX} characters` }
    }
  }
  return { ok: true }
}

describe('team progress validation', () => {
  it('accepts a well-formed body', () => {
    const r = validate({
      teamId: '00000000-0000-0000-0000-000000000000',
      body: 'Shipped the landing page.',
      category: 'milestone'
    })
    expect(r.ok).toBe(true)
  })

  it('rejects a missing teamId', () => {
    const r = validate({ body: 'x', category: 'update' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('teamId')
  })

  it('rejects a non-UUID teamId', () => {
    const r = validate({ teamId: 'not-a-uuid', body: 'x', category: 'update' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('teamId')
  })

  it('rejects an empty body', () => {
    const r = validate({ teamId: '00000000-0000-0000-0000-000000000000', body: '', category: 'update' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('body')
  })

  it('rejects a body over 3000 chars', () => {
    const r = validate({ teamId: '00000000-0000-0000-0000-000000000000', body: 'a'.repeat(3001), category: 'update' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('body')
  })

  it('rejects an unknown category', () => {
    const r = validate({ teamId: '00000000-0000-0000-0000-000000000000', body: 'x', category: 'random' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('category')
  })

  it('accepts a valid link', () => {
    const r = validate({
      teamId: '00000000-0000-0000-0000-000000000000',
      body: 'x',
      category: 'idea',
      linkUrl: 'https://example.com/post'
    })
    expect(r.ok).toBe(true)
  })

  it('rejects a non-http link', () => {
    const r = validate({
      teamId: '00000000-0000-0000-0000-000000000000',
      body: 'x',
      category: 'idea',
      linkUrl: 'javascript:alert(1)'
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('linkUrl')
  })

  it('rejects a link over 500 chars', () => {
    const r = validate({
      teamId: '00000000-0000-0000-0000-000000000000',
      body: 'x',
      category: 'idea',
      linkUrl: 'https://example.com/' + 'a'.repeat(500)
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('linkUrl')
  })

  it('treats empty string linkUrl as no link', () => {
    const r = validate({
      teamId: '00000000-0000-0000-0000-000000000000',
      body: 'x',
      category: 'idea',
      linkUrl: ''
    })
    expect(r.ok).toBe(true)
  })

  it('every category is in the enum', () => {
    expect(CATEGORIES).toEqual(['update', 'blocker', 'milestone', 'idea'])
  })
})
