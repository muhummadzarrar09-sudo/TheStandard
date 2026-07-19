'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { createSupabaseBrowser } from '../../lib/supabase/browser'
import { reconcile, type ChatMessage } from '../../lib/team-chat-reconcile'
import { t } from '../../lib/copy'

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
  const [unread, setUnread] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const userIdRef = useRef<string | null>(null)
  // Track whether the user is "at the bottom" of the chat. If they
  // scroll up to read history, new messages don't yank the viewport.
  const stickToBottomRef = useRef(true)
  const client = createSupabaseBrowser()

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
        setErrorMsg(t('chat.errorSendFailed'))
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
  // don't yank them back down. Also auto-mark-read when at the
  // bottom; this resets the unread badge.
  useEffect(() => {
    if (!scrollerRef.current) return
    if (!stickToBottomRef.current) return
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
    // The new message is now on screen; mark it read.
    markRead()
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
      setErrorMsg(t('chat.errorNotSignedIn'))
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
        setErrorMsg(t('chat.errorSendFailed'))
        return
      }
      if (data) {
        dispatch({ type: 'ack', clientMessageId, serverMessage: data as ChatMessage })
      }
    } catch {
      dispatch({ type: 'fail', id: optimistic.id })
      setErrorMsg(t('chat.errorSendFailed'))
    } finally {
      setSendBusy(false)
    }
  }

  function retry(msg: ChatMessage) {
    setInput(msg.body)
    setMessages(prev => prev.filter(m => m.id !== msg.id))
  }

  // Mark-as-read: when the user views the chat (and they're at the
  // bottom), POST the latest message id to /api/team-unread so
  // the next render shows zero unread.
  async function markRead() {
    const last = messages[messages.length - 1]
    if (!last || last.id.startsWith('local-')) return
    try {
      await fetch('/api/team-unread', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ teamId, lastReadMessageId: last.id })
      })
      setUnread(0)
    } catch {
      // best-effort; next view will retry
    }
  }

  // Poll unread count every 15s. (PRD §7.4 wants "unread counts";
  // we don't have a realtime channel on team_message_reads, so a
  // poll is the simplest reliable approach.)
  useEffect(() => {
    let cancelled = false
    async function fetchUnread() {
      try {
        const r = await fetch(`/api/team-unread?teamId=${encodeURIComponent(teamId)}`)
        if (!r.ok) return
        const x = await r.json()
        if (!cancelled) setUnread(typeof x.unread === 'number' ? x.unread : 0)
      } catch {}
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [teamId])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="eyebrow">{t('chat.eyebrow')}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {unread > 0 && (
            <span
              role="status"
              aria-live="polite"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 12
              }}
              aria-label={`${unread} unread messages`}
            >
              {unread} new
            </span>
          )}
          <span
            className="muted"
            style={{ fontSize: 11 }}
            role="status"
            aria-live="polite"
          >
            ● {status === 'live' ? t('chat.connected') : status === 'connecting' ? t('chat.connecting') : t('chat.offline')}
          </span>
        </div>
      </div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="log"
        aria-label={t('chat.heading')}
        style={{ minHeight: 250, maxHeight: 400, overflowY: 'auto', padding: '12px 0' }}
      >
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingMore}
              aria-label={t('chat.loadOlder')}
              style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--accent)', fontSize: 12 }}
            >
              {loadingMore ? t('chat.loadingMore') : t('chat.loadOlder')}
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="muted" style={{ padding: 20, textAlign: 'center' }}>
            {t('chat.empty')}
          </p>
        )}
        {messages.map(m => {
          const isOwn = m.author_id === userIdRef.current
          const time = new Date(m.created_at).toLocaleTimeString()
          return (
            <div
              key={m.id}
              aria-label={isOwn ? t('chat.ariaYouAt', 'en', { time }) : t('chat.ariaTeammateAt', 'en', { time })}
              style={{
                padding: 12,
                background: isOwn ? 'color-mix(in srgb, var(--accent) 12%, var(--bg))' : 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                marginBottom: 6,
                opacity: m.delivery === 'failed' ? 0.7 : 1
              }}
            >
              <p style={{ margin: 0 }}>{m.body}</p>
              <small className="muted" style={{ display: 'block', marginTop: 4, fontSize: 11 }}>
                {time}
                {m.delivery === 'sending' && <span aria-live="polite"> · {t('chat.sending')}</span>}
                {m.delivery === 'failed' && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => retry(m)}
                      aria-label={`${t('chat.retryAria')}: ${m.body}`}
                      style={{
                        background: 'none',
                        border: 0,
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 11
                      }}
                    >
                      {t('chat.failed')}
                    </button>
                  </>
                )}
              </small>
            </div>
          )
        })}
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
        <label htmlFor="chat-input" className="visually-hidden">{t('chat.inputPlaceholder')}</label>
        <input
          id="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={MAX_BODY}
          placeholder={t('chat.inputPlaceholder')}
          aria-label={t('chat.inputLabel')}
          className="input"
          style={{ flex: 1 }}
        />
        <button
          className="button"
          type="submit"
          disabled={!input.trim() || sendBusy}
          aria-label={t('chat.sendLabel')}
        >
          {t('chat.send')}
        </button>
      </form>
      {errorMsg && (
        <p
          role="alert"
          aria-live="assertive"
          className="muted"
          style={{ color: 'var(--danger)', marginTop: 8, fontSize: 12 }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  )
}
