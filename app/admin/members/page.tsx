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
    <main className="main">
      <p className="eyebrow">ADMIN · MEMBERS</p>
      <h1>Run the cohort.</h1>
      <p className="muted">
        Provision access manually. No external membership dependency. Existing rows are not overwritten — only the email, display name, and cohort are updated.
      </p>
      <section className="card" style={{ marginTop: 30 }}>
        <MemberForm onProvisioned={onProvisioned} />
      </section>
      <section className="card" style={{ marginTop: 15 }}>
        <p className="eyebrow">COHORT MEMBERS</p>
        {loading ? (
          <p className="muted">Loading members…</p>
        ) : error ? (
          <p className="muted" style={{ color: '#ff8b82' }}>{error}</p>
        ) : members.length === 0 ? (
          <p className="muted">No members yet. Use the form above to provision the first one.</p>
        ) : (
          members.map(m => (
            <div
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
            </div>
          ))
        )}
      </section>
    </main>
  )
}
