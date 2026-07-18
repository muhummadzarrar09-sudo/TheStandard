import { supabaseBrowser } from '../supabase'
export async function requireAdmin(){const db=supabaseBrowser();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('UNAUTHORIZED');const {data}=await db.from('profiles').select('role').eq('id',user.id).single();if(data?.role!=='admin')throw new Error('FORBIDDEN');return user}
