import { describe, it, expect } from 'vitest'
import { reconcile, type ChatMessage } from '../lib/team-chat-reconcile'

const me = 'user-a'
const other = 'user-b'

function optimistic(body: string, clientId: string): ChatMessage {
  return {
    id: `local-${clientId}`,
    body,
    author_id: me,
    created_at: '2026-01-01T00:00:00.000Z',
    client_message_id: clientId,
    delivery: 'sending'
  }
}

function server(body: string, clientId: string, id = 'srv-1'): ChatMessage {
  return {
    id,
    body,
    author_id: me,
    created_at: '2026-01-01T00:00:00.500Z',
    client_message_id: clientId,
    delivery: 'sent'
  }
}

function remote(id: string, body: string, author = other): ChatMessage {
  return {
    id,
    body,
    author_id: author,
    created_at: '2026-01-01T00:00:01.000Z',
    client_message_id: null,
    delivery: 'sent'
  }
}

describe('reconcile: optimistic + ack', () => {
  it('replaces the optimistic with the server row', () => {
    const a = reconcile([], { type: 'optimistic', message: optimistic('hello', 'c1') })
    expect(a).toHaveLength(1)
    expect(a[0].delivery).toBe('sending')

    const b = reconcile(a, { type: 'ack', clientMessageId: 'c1', serverMessage: server('hello', 'c1', 'srv-1') })
    expect(b).toHaveLength(1)
    expect(b[0].id).toBe('srv-1')
    expect(b[0].delivery).toBe('sent')
  })

  it('does not duplicate when the realtime_insert arrives before the explicit ack', () => {
    let s: ChatMessage[] = []
    s = reconcile(s, { type: 'optimistic', message: optimistic('hello', 'c1') })
    s = reconcile(s, { type: 'realtime_insert', message: server('hello', 'c1', 'srv-1') })
    s = reconcile(s, { type: 'ack', clientMessageId: 'c1', serverMessage: server('hello', 'c1', 'srv-1') })
    expect(s).toHaveLength(1)
    expect(s[0].id).toBe('srv-1')
  })

  it('does not duplicate when the ack arrives before the realtime_insert', () => {
    let s: ChatMessage[] = []
    s = reconcile(s, { type: 'optimistic', message: optimistic('hello', 'c1') })
    s = reconcile(s, { type: 'ack', clientMessageId: 'c1', serverMessage: server('hello', 'c1', 'srv-1') })
    s = reconcile(s, { type: 'realtime_insert', message: server('hello', 'c1', 'srv-1') })
    expect(s).toHaveLength(1)
  })

  it('handles a fast-replaying user who sends two messages back-to-back', () => {
    let s: ChatMessage[] = []
    s = reconcile(s, { type: 'optimistic', message: optimistic('a', 'c1') })
    s = reconcile(s, { type: 'optimistic', message: optimistic('b', 'c2') })
    // acks come back in order
    s = reconcile(s, { type: 'ack', clientMessageId: 'c1', serverMessage: server('a', 'c1', 'srv-1') })
    s = reconcile(s, { type: 'ack', clientMessageId: 'c2', serverMessage: server('b', 'c2', 'srv-2') })
    expect(s).toHaveLength(2)
    expect(s[0].body).toBe('a')
    expect(s[1].body).toBe('b')
  })

  it('appends the server message if the optimistic was removed (e.g. user retried)', () => {
    let s: ChatMessage[] = []
    s = reconcile(s, { type: 'optimistic', message: optimistic('hello', 'c1') })
    s = s.filter(m => m.id !== `local-c1`) // user retried, optimistic removed
    s = reconcile(s, { type: 'ack', clientMessageId: 'c1', serverMessage: server('hello', 'c1', 'srv-1') })
    expect(s).toHaveLength(1)
    expect(s[0].id).toBe('srv-1')
  })

  it('appends a remote message even when our optimistic is in flight', () => {
    let s: ChatMessage[] = []
    s = reconcile(s, { type: 'optimistic', message: optimistic('hello', 'c1') })
    s = reconcile(s, { type: 'realtime_insert', message: remote('srv-2', 'hi from b') })
    s = reconcile(s, { type: 'ack', clientMessageId: 'c1', serverMessage: server('hello', 'c1', 'srv-1') })
    expect(s).toHaveLength(2)
    expect(s[0].body).toBe('hello')
    expect(s[1].body).toBe('hi from b')
  })
})

describe('reconcile: failures', () => {
  it('marks the optimistic as failed so the UI shows retry', () => {
    let s: ChatMessage[] = []
    s = reconcile(s, { type: 'optimistic', message: optimistic('hello', 'c1') })
    s = reconcile(s, { type: 'fail', id: 'local-c1' })
    expect(s[0].delivery).toBe('failed')
  })

  it('fail is a no-op if the optimistic was already removed', () => {
    const s: ChatMessage[] = []
    const next = reconcile(s, { type: 'fail', id: 'local-c1' })
    expect(next).toEqual(s)
  })
})

describe('reconcile: realtime_update (delete)', () => {
  it('removes a soft-deleted message', () => {
    const s: ChatMessage[] = [server('hello', 'c1', 'srv-1'), remote('srv-2', 'hi from b')]
    const next = reconcile(s, { type: 'realtime_update', id: 'srv-1', deleted_at: '2026-01-01T00:01:00.000Z' })
    expect(next).toHaveLength(1)
    expect(next[0].id).toBe('srv-2')
  })

  it('ignores an UPDATE that does not set deleted_at', () => {
    const s: ChatMessage[] = [server('hello', 'c1', 'srv-1')]
    const next = reconcile(s, { type: 'realtime_update', id: 'srv-1', deleted_at: null })
    expect(next).toEqual(s)
  })
})
