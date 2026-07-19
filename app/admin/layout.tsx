import { redirect } from 'next/navigation'
import { createSupabaseServer } from '../../lib/supabase/server'
import AppShell from '../../components/ui/AppShell'

const ADMIN_RAIL = [
  { href: '/admin/members', key: 'rail.admin.members' as const },
  { href: '/admin/enrollment', key: 'rail.admin.enrollment' as const },
  { href: '/admin/analytics', key: 'rail.admin.analytics' as const },
  { href: '/admin/reports', key: 'rail.admin.reports' as const }
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = await createSupabaseServer()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  // Send signed-in members to an explicit 401 page (not a silent
  // redirect to /dashboard) so the user understands why the admin
  // surface is unavailable.
  if (profile?.role !== 'admin') redirect('/admin/not-authorized')
  return <AppShell items={ADMIN_RAIL}>{children}</AppShell>
}
