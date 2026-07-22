import {redirect} from 'next/navigation';import {createSupabaseServer} from '../../lib/supabase/server'
export default async function AppLayout({children}:{children:React.ReactNode}){const db=await createSupabaseServer();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login?next=%2F');return <>{children}</>}
