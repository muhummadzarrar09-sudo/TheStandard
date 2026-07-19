// Pure reconciliation logic for the team chat's optimistic-update +
// realtime-merge state machine. Extracted from components/team/TeamChat
// so we can unit-test the dedup + ordering cases without React.
//
// The function is intentionally a plain reducer: `prev + event ->
// next`. The component wraps it in a useState setter, and tests wrap
// it in a loop. Keeping it pure means a fast-replaying user can send
// 5 messages in 50ms and the state machine handles it deterministically.

export type ChatMessage = {
  id: string
  body: string
  author_id: string
  created_at: string
  client_message_id?: string | null
  delivery?: 'sending' | 'sent' | 'failed'
}

export type ChatEvent =
  // A new optimistic message that we just put on the wire.
  | { type: 'optimistic'; message: ChatMessage }
  // The server acknowledged a send — `serverMessage` has the real id
  // and created_at, the client_message_id links it to the optimistic.
  | { type: 'ack'; clientMessageId: string; serverMessage: ChatMessage }
  // A send failed.
  | { type: 'fail'; id: string }
  // A realtime INSERT from the channel (could be us, could be someone
  // else, could be the same message arriving via two channels).
  | { type: 'realtime_insert'; message: ChatMessage }
  // A realtime UPDATE (the only field we care about is deleted_at).
  | { type: 'realtime_update'; id: string; deleted_at: string | null }

export function reconcile(prev: ChatMessage[], event: ChatEvent): ChatMessage[] {
  switch (event.type) {
    case 'optimistic':
      // Append; deduplicate by client_message_id (shouldn't happen,
      // but a fast-replaying user can race themselves).
      if (prev.some(m => m.client_message_id && m.client_message_id === event.message.client_message_id)) {
        return prev
      }
      return [...prev, event.message]

    case 'ack': {
      // Replace the optimistic by client_message_id. The optimistic
      // might already have been removed (e.g. user retried, the
      // optimistic was removed by the retry function). In that case
      // we append the server message at the end. This is the bug fix
      // for the duplicate-message race: prior code appended the
      // server message *and* left the optimistic, so a fast user
      // who sent two messages in <50ms saw their second one
      // duplicated.
      const idx = prev.findIndex(m => m.client_message_id === event.clientMessageId)
      if (idx === -1) {
        // Optimistic was removed (e.g. retry). The realtime_insert
        // for this row may also have already arrived; if so, dedup
        // by id.
        if (prev.some(m => m.id === event.serverMessage.id)) return prev
        return [...prev, event.serverMessage]
      }
      const next = prev.slice()
      next[idx] = { ...event.serverMessage, delivery: 'sent' }
      return next
    }

    case 'fail': {
      // Mark the optimistic (matched by id, which is `local-<uuid>`
      // for optimistic rows) as failed so the UI shows the retry
      // affordance.
      const idx = prev.findIndex(m => m.id === event.id)
      if (idx === -1) return prev
      const next = prev.slice()
      next[idx] = { ...next[idx], delivery: 'failed' }
      return next
    }

    case 'realtime_insert': {
      // Three cases:
      // 1. We have an optimistic with the same client_message_id:
      //    replace it. This is the optimistic->confirmed path that
      //    is independent of the explicit ack (in case the realtime
      //    event beats the awaited insert().single() resolve).
      // 2. We have a row with the same id already (could happen if
      //    both the realtime and the awaited insert resolve with
      //    the same row): no-op.
      // 3. Neither: append.
      if (event.message.client_message_id) {
        const idx = prev.findIndex(m => m.client_message_id === event.message.client_message_id)
        if (idx !== -1) {
          const next = prev.slice()
          next[idx] = { ...event.message, delivery: 'sent' }
          return next
        }
      }
      if (prev.some(m => m.id === event.message.id)) return prev
      return [...prev, { ...event.message, delivery: 'sent' }]
    }

    case 'realtime_update':
      // We only act on the deleted_at transition. UPDATE doesn't
      // change body or any other field that the chat renders.
      if (!event.deleted_at) return prev
      return prev.filter(m => m.id !== event.id)
  }
}
