'use client'
import { useEffect, useState } from 'react'
import { MemberForm } from '../../../components/admin/AdminForms'

type Member = {
  id: string
  email: string
  display_name: string | null
  cohort_id: string | null
  role: 'member' | 'admin'
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/members')
      const x = await r.json()
      if (!r.ok) throw new Error(x.error || 'Could not load members')
      setMembers(x.members || [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onProvisioned = (member: Member) => {
    setMembers(prev => {
      const i = prev.findIndex(m => m.email === member.email)
      if (i === -1) return [...prev, member]
      const next = prev.slice()
      next[i] = member
      return next
    })
  }

  return (
    <>
      <p className="eyebrow">ADMIN · MEMBERS</p>
      <h1>Run the cohort.</h1>
      <p className="muted">
        Provision access manually. No external membership dependency. Existing rows are not overwritten — only the email, display name, and cohort are updated.
      </p>
      <section
        className="card"
        style={{ marginTop: 30 }}
        aria-labelledby="provision-form"
      >
        <h2 id="provision-form" className="visually-hidden" style={{ position: 'absolute', left: -9999 }}>Provision a new member</h2>
        <MemberForm onProvisioned={onProvisioned} />
      </section>
      <section
        className="card"
        style={{ marginTop: 15 }}
        aria-labelledby="members-list"
      >
        <p className="eyebrow" id="members-list">COHORT MEMBERS</p>
        {loading ? (
          <p className="muted" role="status">Loading members…</p>
        ) : error ? (
          <p className="muted" role="alert" style={{ color: '#ff8b82' }}>{error}</p>
        ) : members.length === 0 ? (
          <p className="muted">No members yet. Use the form above to provision the first one.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Cohort members">
            {members.map(m => (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '17px 0',
                  borderBottom: '1px solid var(--line)'
                }}
              >
                <div>
                  <b>{m.display_name || m.email}</b>
                  {m.display_name && (
                    <p className="muted" style={{ margin: '4px 0 0' }}>{m.email}</p>
                  )}
                </div>
                <span style={{ color: m.cohort_id ? 'var(--accent)' : 'var(--muted)' }}>
                  {m.cohort_id ? 'In cohort' : 'Unassigned'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
