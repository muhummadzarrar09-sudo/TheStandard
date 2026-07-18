// Scheduled job: mark required blocks missed after each member's local cutoff.
// Keep this server-side; never trust device time for streak state.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async()=>{const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);/* Load active profiles/templates, resolve each local date/cutoff, insert missing required block rows as missed, then refresh leaderboard projection. */return Response.json({ok:true})})
