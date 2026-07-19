'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { createSupabaseBrowser } from '../../lib/supabase/browser'
import { reconcile, type ChatMessage } from '../../lib/team-chat-reconcile'

const PAGE_SIZE = 50
const MAX_BODY = 2000

export default function TeamChat({ teamId }: { teamId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>('connecting')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sendBusy, setSendBusy] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const userIdRef = useRef<string | null>(null)
  // Track whether the user is "at the bottom" of the chat. If they
  // scroll up to read history, new messages don't yank the viewport.
  const stickToBottomRef = useRef(true)
  const client = createSupabaseBrowser()

  // Wrapper so the component's setMessages signature stays the same
  // and the reducer stays a pure function (testable in isolation).
  const dispatch = useCallback((event: Parameters<typeof reconcile>[1]) => {
    setMessages(prev => reconcile(prev, event))
  }, [])

  // Initial load + realtime subscription
  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof client.channel> | null = null

    async function init() {
      const { data: { user } } = await client.auth.getUser()
      if (user) userIdRef.current = user.id

      const { data, error } = await client
        .from('team_messages')
        .select('id, body, author_id, created_at, client_message_id')
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (!active) return
      if (error) {
        setStatus('offline')
        setErrorMsg('Could not load messages.')
        return
      }
      const list = (data || []).slice().reverse().map(m => ({ ...m, delivery: 'sent' as const }))
      setMessages(list)
      setHasMore((data || []).length === PAGE_SIZE)
      setStatus('live')

      channel = client
        .channel(`team:${teamId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
          (payload) => {
            const m = payload.new as ChatMessage
            dispatch({ type: 'realtime_insert', message: m })
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
          (payload) => {
            const m = payload.new as ChatMessage & { deleted_at?: string | null }
            if (m.deleted_at) {
              dispatch({ type: 'realtime_update', id: m.id, deleted_at: m.deleted_at })
            }
          }
        )
        .subscribe(s => setStatus(s === 'SUBSCRIBED' ? 'live' : 'offline'))
    }
    init()
    return () => {
      active = false
      if (channel) client.removeChannel(channel)
    }
  }, [teamId, client, dispatch])

  // Track whether the user is scrolled to the bottom. We use a ref so
  // the scroll handler doesn't re-render.
  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distanceFromBottom < 24
  }, [])

  // Auto-scroll to bottom when new messages arrive *and* the user is
  // already at the bottom. If they scrolled up to read history, we
  // don't yank them back down.
  useEffect(() => {
    if (!scrollerRef.current) return
    if (!stickToBottomRef.current) return
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [messages.length])

  async function loadOlder() {
    if (loadingMore || !hasMore || messages.length === 0) return
    setLoadingMore(true)
    const oldest = messages[0]
    const { data, error } = await client
      .from('team_messages')
      .select('id, body, author_id, created_at, client_message_id')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (!error && data) {
      const older = data.slice().reverse().map(m => ({ ...m, delivery: 'sent' as const }))
      setMessages(prev => [...older, ...prev])
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoadingMore(false)
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    if (sendBusy) return
    const body = input.trim().slice(0, MAX_BODY)
    if (!body) return
    setErrorMsg(null)
    const userId = userIdRef.current
    if (!userId) {
      setErrorMsg('You must be signed in to send a message.')
      return
    }
    const clientMessageId = crypto.randomUUID()
    const optimistic: ChatMessage = {
      id: `local-${clientMessageId}`,
      body,
      author_id: userId,
      created_at: new Date().toISOString(),
      client_message_id: clientMessageId,
      delivery: 'sending'
    }
    dispatch({ type: 'optimistic', message: optimistic })
    setInput('')
    setSendBusy(true)
    try {
      const { data, error } = await client
        .from('team_messages')
        .insert({
          team_id: teamId,
          author_id: userId,
          body,
          client_message_id: clientMessageId
        })
        .select('id, body, author_id, created_at, client_message_id')
        .single()
      if (error) {
        dispatch({ type: 'fail', id: optimistic.id })
        setErrorMsg('Could not send. Tap retry.')
        return
      }
      if (data) {
        dispatch({ type: 'ack', clientMessageId, serverMessage: data as ChatMessage })
      }
    } catch {
      dispatch({ type: 'fail', id: optimistic.id })
      setErrorMsg('Could not send. Tap retry.')
    } finally {
      setSendBusy(false)
    }
  }

  function retry(msg: ChatMessage) {
    setInput(msg.body)
    // Remove the failed optimistic so the next send doesn't
    // collide with a stale id.
    setMessages(prev => prev.filter(m => m.id !== msg.id))
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="eyebrow">PRIVATE EXECUTION ROOM</p>
        <span
          className="muted"
          style={{ fontSize: 11 }}
          role="status"
          aria-live="polite"
        >
          ● {status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting…' : 'Offline'}
        </span>
      </div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="log"
        aria-label="Team chat messages"
        aria-live="polite"
        style={{ minHeight: 250, maxHeight: 400, overflowY: 'auto', padding: '12px 0' }}
      >
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingMore}
              aria-label="Load older messages"
              style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--accent)', fontSize: 12 }}
            >
              {loadingMore ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="muted" style={{ padding: 20, textAlign: 'center' }}>
            No messages yet. Be the first to start the room.
          </p>
        )}
        {messages.map(m => {
          const isOwn = m.author_id === userIdRef.current
          return (
            <div
              key={m.id}
              aria-label={`${isOwn ? 'You' : 'Teammate'} at ${new Date(m.created_at).toLocaleTimeString()}`}
              style={{
                padding: 12,
                background: isOwn ? 'var(--accent)12' : 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                marginBottom: 6,
                opacity: m.delivery === 'failed' ? 0.7 : 1
              }}
            >
              <p style={{ margin: 0 }}>{m.body}</p>
              <small className="muted" style={{ display: 'block', marginTop: 4, fontSize: 11 }}>
                {new Date(m.created_at).toLocaleTimeString()}
                {m.delivery === 'sending' && <span aria-live="polite"> · sending…</span>}
                {m.delivery === 'failed' && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => retry(m)}
                      aria-label={`Retry: ${m.body}`}
                      style={{
                        background: 'none',
                        border: 0,
                        color: '#ff8b82',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 11
                      }}
                    >
                      failed · tap to retry
                    </button>
                  </>
                )}
              </small>
            </div>
          )
        })}
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
        <label htmlFor="chat-input" className="visually-hidden">Send a message to your team</label>
        <input
          id="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={MAX_BODY}
          placeholder="Message your team…"
          aria-label="Message your team"
          style={{ flex: 1, padding: 12, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
        />
        <button
          className="button"
          type="submit"
          disabled={!input.trim() || sendBusy}
          aria-label="Send message"
        >
          Send →
        </button>
      </form>
      {errorMsg && (
        <p
          role="alert"
          aria-live="assertive"
          className="muted"
          style={{ color: '#ff8b82', marginTop: 8, fontSize: 12 }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  )
}
