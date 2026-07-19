'use client'

import { useEffect, useState } from 'react'
import { t } from '../../../lib/copy'

type Team = {
  id: string
  name: string
  idea_name: string | null
  problem_statement: string | null
  objective: string | null
  status: 'active' | 'paused' | 'archived'
  team_members: { user_id: string; profiles: { email: string; display_name: string | null } }[]
}

type Member = {
  id: string
  email: string
  display_name: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const STATUSES: Team['status'][] = ['active', 'paused', 'archived']

// Admin team-assignment UI (PRD §11). The admin can:
//   - Create a new team (name + idea + objective + members).
//   - Edit an existing team (name, idea, problem, objective, status).
//   - Reassign members (replaces the roster; the modal makes this
//     clear so a click can't drop a teammate by accident).
//   - Archive a team (status='archived').

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [t1, m1] = await Promise.all([
        fetch('/api/admin/teams').then(r => r.json()),
        fetch('/api/admin/members').then(r => r.json())
      ])
      if (t1.error) throw new Error(t1.error)
      if (m1.error) throw new Error(m1.error)
      setTeams(t1.teams || [])
      setMembers(m1.members || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load teams')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  return (
    <>
      <p className="eyebrow">ADMIN · TEAMS</p>
      <h1>Shape the cohort.</h1>
      <p className="muted">
        Create teams, edit the canonical team idea, and assign 3–4 members per team.
        Archiving hides a team from the active leaderboard without deleting its history.
      </p>
      {error && (
        <p role="alert" className="muted" style={{ color: 'var(--danger)', marginTop: 12 }}>
          {error}
        </p>
      )}
      <NewTeamForm members={members} onCreated={t => setTeams(prev => [...prev, t])} />
      <section
        className="card"
        style={{ marginTop: 15 }}
        aria-labelledby="teams-list"
      >
        <p className="eyebrow" id="teams-list">TEAMS</p>
        {loading ? (
          <p className="muted" role="status">Loading teams…</p>
        ) : teams.length === 0 ? (
          <p className="muted">No teams yet. Create one above.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {teams.map(team => (
              <li key={team.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--line)' }}>
                <TeamEditor
                  team={team}
                  members={members}
                  onUpdated={t => setTeams(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function NewTeamForm({ members, onCreated }: { members: Member[]; onCreated: (t: Team) => void }) {
  const [name, setName] = useState('')
  const [idea, setIdea] = useState('')
  const [objective, setObjective] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Team name is required.')
      setState('error')
      return
    }
    setState('saving')
    setError(null)
    try {
      const r = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          idea_name: idea.trim() || null,
          objective: objective.trim() || null,
          memberIds: selected
        })
      })
      const x = await r.json()
      if (!r.ok) {
        setError(x.error || 'Could not create team.')
        setState('error')
        return
      }
      // The server response only includes the team's fields, not the
      // joined members. Build a Team-shaped object for the list.
      onCreated({
        ...x.team,
        team_members: selected.map(uid => {
          const m = members.find(x => x.id === uid)
          return { user_id: uid, profiles: { email: m?.email || '', display_name: m?.display_name || null } }
        })
      })
      setName(''); setIdea(''); setObjective(''); setSelected([])
      setState('saved')
    } catch {
      setError('Network error.')
      setState('error')
    }
  }

  return (
    <section className="card" style={{ marginTop: 30 }} aria-labelledby="new-team-heading">
      <p className="eyebrow" id="new-team-heading">NEW TEAM</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <label htmlFor="team-name" className="eyebrow">NAME</label>
        <input
          id="team-name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={80}
          className="input"
        />
        <label htmlFor="team-idea" className="eyebrow">CANONICAL IDEA</label>
        <input
          id="team-idea"
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="One line: what is this team building?"
          maxLength={2000}
          className="input"
        />
        <label htmlFor="team-objective" className="eyebrow">OBJECTIVE</label>
        <input
          id="team-objective"
          value={objective}
          onChange={e => setObjective(e.target.value)}
          maxLength={2000}
          className="input"
        />
        <MemberPicker members={members} selected={selected} onChange={setSelected} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="button" type="submit" disabled={state === 'saving'}>
            {state === 'saving' ? 'Creating…' : 'Create team'}
          </button>
          {state !== 'idle' && (
            <span
              role="status"
              aria-live="polite"
              className="muted"
              style={{ fontSize: 12, color: state === 'error' ? 'var(--danger)' : 'var(--accent)' }}
            >
              {state === 'error' ? error : state === 'saved' ? 'Created.' : ''}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

function MemberPicker({
  members, selected, onChange
}: {
  members: Member[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  // If no members loaded, just show a hint.
  if (members.length === 0) {
    return <p className="muted" style={{ fontSize: 12 }}>No members loaded; add them on the Members page first.</p>
  }
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="eyebrow" style={{ marginBottom: 6 }}>MEMBERS</legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
        {members.map(m => {
          const checked = selected.includes(m.id)
          return (
            <label
              key={m.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked ? [...selected, m.id] : selected.filter(x => x !== m.id))}
                aria-label={m.display_name || m.email}
              />
              <span style={{ fontSize: 13 }}>{m.display_name || m.email}</span>
            </label>
          )
        })}
      </div>
      <small className="muted" style={{ display: 'block', marginTop: 6, fontSize: 11 }}>
        3–4 members per team is the convention. Selection here only sets the initial roster.
      </small>
    </fieldset>
  )
}

function TeamEditor({ team, members, onUpdated }: {
  team: Team
  members: Member[]
  onUpdated: (t: Partial<Team> & { id: string }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [idea, setIdea] = useState(team.idea_name || '')
  const [problem, setProblem] = useState(team.problem_statement || '')
  const [objective, setObjective] = useState(team.objective || '')
  const [status, setStatus] = useState<Team['status']>(team.status)
  const [roster, setRoster] = useState<string[]>(team.team_members.map(m => m.user_id))
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(team.name)
    setIdea(team.idea_name || '')
    setProblem(team.problem_statement || '')
    setObjective(team.objective || '')
    setStatus(team.status)
    setRoster(team.team_members.map(m => m.user_id))
  }

  async function save() {
    setState('saving')
    setError(null)
    try {
      const r = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: team.id,
          name: name.trim(),
          idea_name: idea.trim() || null,
          problem_statement: problem.trim() || null,
          objective: objective.trim() || null,
          status,
          memberIds: roster
        })
      })
      const x = await r.json()
      if (!r.ok) {
        setError(x.error || 'Could not save team.')
        setState('error')
        return
      }
      onUpdated({ id: team.id, ...x.team })
      setState('saved')
      setEditing(false)
    } catch {
      setError('Network error.')
      setState('error')
    }
  }

  async function archive() {
    if (!confirm(`Archive ${team.name}? Members keep their data; the team is hidden from the active leaderboard.`)) return
    setState('saving')
    try {
      const r = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: team.id, status: 'archived' })
      })
      const x = await r.json()
      if (!r.ok) { setError(x.error || 'Could not archive.'); setState('error'); return }
      onUpdated({ id: team.id, status: 'archived' })
    } catch {
      setError('Network error.')
      setState('error')
    }
  }

  if (!editing) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div>
            <b style={{ fontSize: 16 }}>{team.name}</b>
            <span className="muted" style={{ marginLeft: 8, fontSize: 11 }}>· {team.status}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => { reset(); setEditing(true) }}
              className="button"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Edit
            </button>
            {team.status !== 'archived' && (
              <button
                type="button"
                onClick={archive}
                className="button"
                style={{ padding: '6px 12px', fontSize: 12, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line)' }}
              >
                Archive
              </button>
            )}
          </div>
        </div>
        {team.idea_name && <p className="muted" style={{ margin: '6px 0 0' }}>{team.idea_name}</p>}
        {team.objective && <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>Objective · {team.objective}</p>}
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
          {team.team_members.length} member{team.team_members.length === 1 ? '' : 's'} ·
          {' '}{team.team_members.map(m => m.profiles.display_name || m.profiles.email).join(', ') || 'none'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={80}
          className="input"
          aria-label="Team name"
        />
        <input
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="Canonical idea"
          maxLength={2000}
          className="input"
          aria-label="Canonical idea"
        />
        <textarea
          value={problem}
          onChange={e => setProblem(e.target.value)}
          placeholder="Problem statement (optional)"
          maxLength={2000}
          className="input"
          style={{ minHeight: 60, font: 'inherit' }}
          aria-label="Problem statement"
        />
        <input
          value={objective}
          onChange={e => setObjective(e.target.value)}
          placeholder="Objective (optional)"
          maxLength={2000}
          className="input"
          aria-label="Objective"
        />
        <label>
          <span className="eyebrow" style={{ marginRight: 8 }}>STATUS</span>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as Team['status'])}
            className="input"
            style={{ width: 'auto' }}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <MemberPicker members={members} selected={roster} onChange={setRoster} />
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 12, margin: 0 }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="button" onClick={save} disabled={state === 'saving'}>
            {state === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { reset(); setEditing(false) }}
            style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
