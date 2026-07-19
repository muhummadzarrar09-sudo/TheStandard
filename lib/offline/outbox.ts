// The completion outbox. Schedule-block completions that happen
// while the user is offline are queued here and replayed when
// the network returns. The store is an IndexedDB table keyed
// by clientEventId so duplicate puts are idempotent.

export type CompletionEvent = {
  clientEventId: string
  blockKey: string
  timezone: string
  createdAt: number
}

const DB = 'discipline-os'
const STORE = 'completion-outbox'
const SYNC_KEY = 'discipline:last-sync'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'clientEventId' })
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export async function queueCompletion(event: CompletionEvent): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(event)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Read the outbox without consuming. Returns the events in
// insertion order so a UI can show the oldest pending first.
export async function peekOutbox(): Promise<CompletionEvent[]> {
  if (typeof indexedDB === 'undefined') return []
  const db = await open()
  return new Promise<CompletionEvent[]>((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).getAll()
    r.onsuccess = () => resolve((r.result || []) as CompletionEvent[])
    r.onerror = () => reject(r.error)
  })
}

export async function flushCompletions(send: (event: CompletionEvent) => Promise<void>): Promise<void> {
  const db = await open()
  const events = await new Promise<CompletionEvent[]>((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).getAll()
    r.onsuccess = () => resolve(r.result || [])
    r.onerror = () => reject(r.error)
  })
  for (const event of events) {
    try {
      await send(event)
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(event.clientEventId)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      try { localStorage.setItem(SYNC_KEY, String(Date.now())) } catch {}
    } catch {
      // First failure: stop draining. The next online event
      // (or page load) will retry the remaining items.
      break
    }
  }
}

// Last successful sync timestamp (ms epoch). null if the user
// has never synced (a brand-new member).
export function readLastSyncAt(): number | null {
  if (typeof localStorage === 'undefined') return null
  const v = localStorage.getItem(SYNC_KEY)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const OUTBOX_STORAGE_KEY = 'discipline:last-sync'
