import { createSupabaseServer } from '../supabase/server'

export type PublishedReport = {
  id: string
  title: string
  interviewee: string | null
  published_at: string
  summary: string
  version: number
}

export type CommunityPost = {
  id: string
  title: string
  body: string
  source_url: string | null
  source_label: string | null
  published_at: string
  pinned: boolean
  version: number
}

export async function getPublishedReports(): Promise<PublishedReport[]> {
  try {
    const db = await createSupabaseServer()
    const { data } = await db
      .from('reports')
      .select('id, title, interviewee, published_at, summary, version')
      .eq('published', true)
      .order('published_at', { ascending: false })
    return (data as PublishedReport[]) || []
  } catch {
    return []
  }
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  try {
    const db = await createSupabaseServer()
    // Pinned items first (newest pinned), then by published date
    // desc. The schema-level pinned boolean orders these; pinned
    // items still show their published_at.
    const { data } = await db
      .from('community_posts')
      .select('id, title, body, source_url, source_label, published_at, pinned, version')
      .eq('published', true)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
    return (data as CommunityPost[]) || []
  } catch {
    return []
  }
}
