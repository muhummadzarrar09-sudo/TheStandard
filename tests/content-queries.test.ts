// Type-level guards for the content query layer. The queries
// themselves call createSupabaseServer, so the runtime tests live
// in the route-level integration tests. These tests lock the
// shape of the returned rows (PRD §7.5 + §7.6 — pinned, source,
// version) so a future maintainer doesn't drop a column.

import { describe, it, expect } from 'vitest'
import type { CommunityPost, PublishedReport } from '../lib/content/queries'

describe('content query types', () => {
  it('CommunityPost carries pinned, source, and version', () => {
    const sample: CommunityPost = {
      id: 'p1',
      title: 'Hello',
      body: 'World',
      source_url: 'https://example.com/x',
      source_label: 'X thread',
      published_at: '2026-01-15T00:00:00Z',
      pinned: true,
      version: 2
    }
    expect(sample.pinned).toBe(true)
    expect(sample.source_url).toBe('https://example.com/x')
    expect(sample.source_label).toBe('X thread')
    expect(sample.version).toBe(2)
  })

  it('PublishedReport carries version + interviewee', () => {
    const r: PublishedReport = {
      id: 'r1',
      title: 'The Standard',
      interviewee: 'A. Person',
      published_at: '2026-01-15T00:00:00Z',
      summary: 'A summary',
      version: 3
    }
    expect(r.version).toBe(3)
    expect(r.interviewee).toBe('A. Person')
  })
})
