import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  log,
  setSink,
  getSink,
  resetSink,
  memorySink,
  noopSink,
  type LogEntry
} from '../lib/log'
import { bootstrapLogSink } from '../lib/log-bootstrap'
import { otlpHttpSink, batchingSink } from '../lib/log-sinks'

describe('log sink abstraction', () => {
  beforeEach(() => {
    resetSink()
  })
  afterEach(() => {
    resetSink()
  })

  it('routes entries to the active sink', () => {
    const sink = memorySink()
    setSink(sink)
    log.info({ request_id: 'abc' }, 'hi')
    expect(sink.entries).toHaveLength(1)
    expect(sink.entries[0].level).toBe('info')
    expect(sink.entries[0].msg).toBe('hi')
    expect(sink.entries[0].ctx.request_id).toBe('abc')
    expect(sink.entries[0].t).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('swallows sink errors so a misconfigured shipper cannot break requests', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setSink({
      name: 'broken',
      emit() { throw new Error('sink is on fire') }
    })
    expect(() => log.info({ x: 1 }, 'still works')).not.toThrow()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('catches async sink rejections too', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setSink({
      name: 'async-broken',
      async emit() { throw new Error('async boom') }
    })
    log.warn({ y: 2 }, 'still fine')
    // Microtask flush
    await new Promise(r => setTimeout(r, 0))
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('exposes noopSink for tests that want silence', () => {
    setSink(noopSink)
    expect(() => log.info({}, 'silent')).not.toThrow()
  })

  it('memorySink caps the buffer', () => {
    const sink = memorySink(2)
    setSink(sink)
    log.info({}, 'a')
    log.info({}, 'b')
    log.info({}, 'c')
    expect(sink.entries.map(e => e.msg)).toEqual(['b', 'c'])
  })
})

describe('bootstrapLogSink', () => {
  afterEach(() => {
    resetSink()
  })

  it('defaults to console when no env is provided', () => {
    const sink = bootstrapLogSink({})
    expect(sink.name).toBe('console')
    expect(getSink().name).toBe('console')
  })

  it('selects noop when LOG_SINK=noop', () => {
    bootstrapLogSink({ LOG_SINK: 'noop' })
    expect(getSink().name).toBe('noop')
  })

  it('falls back to console when LOG_SINK=otlp has no endpoint', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    bootstrapLogSink({ LOG_SINK: 'otlp' })
    expect(getSink().name).toBe('console')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('selects otlp when LOG_SINK=otlp + endpoint is set', () => {
    const sink = bootstrapLogSink({ LOG_SINK: 'otlp', LOG_OTLP_ENDPOINT: 'https://collector.example.com/v1/logs' })
    expect(sink.name).toBe('otlp-http')
  })
})

describe('otlpHttpSink', () => {
  it('emits an OTLP-shaped envelope to the configured endpoint', async () => {
    const calls: any[] = []
    const fetchMock = vi.fn(async (url, init) => {
      calls.push({ url, init })
      return new Response('{}', { status: 200 })
    })
    ;(globalThis as any).fetch = fetchMock
    const sink = otlpHttpSink({ endpoint: 'https://collector.example.com/v1/logs' })
    sink.emit({ t: '2026-01-01T00:00:00.000Z', level: 'info', msg: 'hello', ctx: { request_id: 'r1' } })
    // wait a tick for the async fire-and-forget
    await new Promise(r => setTimeout(r, 0))
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://collector.example.com/v1/logs')
    const body = JSON.parse(calls[0].init.body)
    expect(body.resourceLogs[0].scopeLogs[0].logRecords[0].body.stringValue).toBe('hello')
    expect(body.resourceLogs[0].scopeLogs[0].logRecords[0].severityText).toBe('INFO')
    delete (globalThis as any).fetch
  })

  it('swallows network errors silently', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('network down') })
    ;(globalThis as any).fetch = fetchMock
    const sink = otlpHttpSink({ endpoint: 'https://collector.example.com/v1/logs' })
    expect(() => sink.emit({ t: '2026-01-01T00:00:00.000Z', level: 'error', msg: 'oops', ctx: {} })).not.toThrow()
    await new Promise(r => setTimeout(r, 0))
    delete (globalThis as any).fetch
  })
})

describe('batchingSink', () => {
  it('flushes entries after the batch window', async () => {
    vi.useFakeTimers()
    const received: LogEntry[] = []
    const inner = {
      name: 'capture',
      emit(e: LogEntry) { received.push(e) }
    }
    const sink = batchingSink(inner, 50)
    sink.emit({ t: 't1', level: 'info', msg: 'a', ctx: {} })
    sink.emit({ t: 't2', level: 'info', msg: 'b', ctx: {} })
    expect(received).toHaveLength(0)
    vi.advanceTimersByTime(60)
    expect(received.map(e => e.msg)).toEqual(['a', 'b'])
    vi.useRealTimers()
  })
})
