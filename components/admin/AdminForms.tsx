'use client'
import { useState } from 'react'

type Member = {
  id: string
  email: string
  display_name: string | null
  cohort_id: string | null
  role: 'member' | 'admin'
}

export function MemberForm({ onProvisioned }: { onProvisioned?: (member: Member) => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const x = await r.json().catch(() => ({} as any))
      if (!r.ok) {
        setMessage({ kind: 'err', text: x.error || 'Could not provision member.' })
        return
      }
      setMessage({ kind: 'ok', text: 'Member provisioned.' })
      setEmail('')
      if (onProvisioned && x.member) onProvisioned(x.member as Member)
    } catch {
      setMessage({ kind: 'err', text: 'Network error.' })
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor="member-email" className="eyebrow">EMAIL ADDRESS</label>
      <input
        id="member-email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="member@email.com"
        required
        type="email"
        autoComplete="off"
        style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
      />
      <button className="button" disabled={busy} type="submit" style={{ alignSelf: 'flex-start' }}>
        {busy ? 'Provisioning…' : 'Provision member'}
      </button>
      {message && (
        <small className="muted" style={{ color: message.kind === 'err' ? '#ff8b82' : 'var(--accent)' }}>
          {message.text}
        </small>
      )}
    </form>
  )
}

export function ReportForm({ onPublished }: { onPublished?: (report: { id: string; title: string }) => void }) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [interviewee, setInterviewee] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!title.trim() || !summary.trim()) {
      setMessage({ kind: 'err', text: 'Title and summary are required.' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          interviewee: interviewee.trim() || null
        })
      })
      const x = await r.json().catch(() => ({} as any))
      if (!r.ok) {
        setMessage({ kind: 'err', text: x.error || 'Could not publish report.' })
        return
      }
      setMessage({ kind: 'ok', text: 'Report published.' })
      setTitle('')
      setSummary('')
      setInterviewee('')
      if (onPublished && x.report) onPublished(x.report)
    } catch {
      setMessage({ kind: 'err', text: 'Network error.' })
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor="report-title" className="eyebrow">TITLE</label>
      <input
        id="report-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Report title"
        required
        maxLength={200}
        style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
      />
      <label htmlFor="report-interviewee" className="eyebrow">INTERVIEWEE (optional)</label>
      <input
        id="report-interviewee"
        value={interviewee}
        onChange={e => setInterviewee(e.target.value)}
        placeholder="Interviewee name"
        maxLength={120}
        style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
      />
      <label htmlFor="report-summary" className="eyebrow">SUMMARY</label>
      <textarea
        id="report-summary"
        value={summary}
        onChange={e => setSummary(e.target.value)}
        placeholder="Mobile-readable summary"
        required
        maxLength={10000}
        rows={6}
        style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
      />
      <button className="button" disabled={busy} type="submit" style={{ alignSelf: 'flex-start' }}>
        {busy ? 'Publishing…' : 'Publish report'}
      </button>
      {message && (
        <small className="muted" style={{ color: message.kind === 'err' ? '#ff8b82' : 'var(--accent)' }}>
          {message.text}
        </small>
      )}
    </form>
  )
}
