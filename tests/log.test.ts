import { describe, it, expect, vi } from 'vitest'
import { log, newRequestId } from '../lib/log'
import { resolveRequestId, REQUEST_ID_HEADER } from '../lib/request-context'

describe('log', () => {
  it('emits a single-line JSON with level, msg, and context', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    log.info({ request_id: 'abc', user_id: 'u' }, 'user did something')
    expect(spy).toHaveBeenCalledTimes(1)
    const line = spy.mock.calls[0][0] as string
    const parsed = JSON.parse(line)
    expect(parsed.level).toBe('info')
    expect(parsed.msg).toBe('user did something')
    expect(parsed.request_id).toBe('abc')
    expect(parsed.user_id).toBe('u')
    expect(parsed.t).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    spy.mockRestore()
  })

  it('redacts known sensitive keys', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log.error({
      request_id: 'abc',
      password: 'hunter2',
      token: 'tk_123',
      authorization: 'Bearer xyz',
      nested: { cookie: 'sb-auth=secret', value: 'ok' }
    }, 'sensitive')
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.password).toBe('[Redacted]')
    expect(parsed.token).toBe('[Redacted]')
    expect(parsed.authorization).toBe('[Redacted]')
    expect(parsed.nested.cookie).toBe('[Redacted]')
    expect(parsed.nested.value).toBe('ok')
    spy.mockRestore()
  })

  it('omits ctx when undefined', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    log.info(undefined, 'no context')
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.msg).toBe('no context')
    // The spread of undefined produces nothing.
    expect('request_id' in parsed).toBe(false)
    spy.mockRestore()
  })

  it('uses console.error for the error level', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log.error({ x: 1 }, 'boom')
    expect(errSpy).toHaveBeenCalledTimes(1)
    errSpy.mockRestore()
  })

  it('uses console.warn for the warn level', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    log.warn({ x: 1 }, 'hmm')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })
})

describe('newRequestId', () => {
  it('returns a 16-char hex-ish string', () => {
    const id = newRequestId()
    expect(id).toMatch(/^[A-Za-z0-9]{16}$/)
  })
  it('returns different ids on consecutive calls', () => {
    const a = newRequestId()
    const b = newRequestId()
    expect(a).not.toBe(b)
  })
})

describe('request context', () => {
  it('reuses a valid incoming x-request-id', () => {
    const req = new Request('http://x/', { headers: { [REQUEST_ID_HEADER]: 'incoming-id-1234' } })
    const id = resolveRequestId(req as any)
    expect(id).toBe('incoming-id-1234')
  })

  it('rejects malformed incoming ids and generates a fresh one', () => {
    const req = new Request('http://x/', { headers: { [REQUEST_ID_HEADER]: 'has spaces and ! chars' } })
    const id = resolveRequestId(req as any)
    expect(id).toMatch(/^[A-Za-z0-9]{16}$/)
    expect(id).not.toBe('has spaces and ! chars')
  })

  it('rejects incoming ids that are too long', () => {
    const long = 'a'.repeat(200)
    const req = new Request('http://x/', { headers: { [REQUEST_ID_HEADER]: long } })
    const id = resolveRequestId(req as any)
    expect(id).not.toBe(long)
  })
})
