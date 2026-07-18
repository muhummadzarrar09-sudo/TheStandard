import { describe, it, expect, vi } from 'vitest'
import {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  toResponse,
  postgrestErrorResponse
} from '../lib/api-errors'

describe('error helpers', () => {
  it('badRequest returns 400 with the message', () => {
    const r = badRequest('Invalid foo')
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('Invalid foo')
  })

  it('badRequest includes field and details when provided', () => {
    const r = badRequest('Invalid', { field: 'email', details: { got: 1 } })
    expect(r.body.field).toBe('email')
    expect(r.body.details).toEqual({ got: 1 })
  })

  it('unauthorized, forbidden, notFound, conflict, serverError return correct statuses', () => {
    expect(unauthorized().status).toBe(401)
    expect(unauthorized().body.error).toBe('Unauthorized')
    expect(forbidden().status).toBe(403)
    expect(forbidden().body.error).toBe('Forbidden')
    expect(notFound().status).toBe(404)
    expect(notFound().body.error).toBe('Not found')
    expect(conflict('dup').status).toBe(409)
    expect(conflict('dup').body.error).toBe('dup')
    expect(serverError().status).toBe(500)
    expect(serverError().body.error).toBe('Internal error')
  })
})

describe('toResponse', () => {
  it('serializes the body and sets content-type', async () => {
    const r = toResponse(badRequest('nope'))
    expect(r.status).toBe(400)
    const body = await r.json()
    expect(body.error).toBe('nope')
    expect(r.headers.get('content-type')).toBe('application/json')
  })
})

describe('ApiError', () => {
  it('carries status, field, and message', () => {
    const e = new ApiError('boom', 400, { field: 'x' })
    expect(e.status).toBe(400)
    expect(e.field).toBe('x')
    expect(e.message).toBe('boom')
  })
})

describe('postgrestErrorResponse', () => {
  it('returns 409 for known client codes', () => {
    const r = postgrestErrorResponse({ code: '23505', message: 'duplicate' }, 'Already exists')
    expect(r.status).toBe(409)
    expect(r.body.error).toBe('Already exists')
    expect(r.body.details).toEqual({ code: '23505' })
  })

  it('returns generic 500 for unknown codes and logs', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = postgrestErrorResponse({ code: '99999', message: 'catastrophic' }, 'Server fell over')
    expect(r.status).toBe(500)
    expect(r.body.error).toBe('Internal error')
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
