import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Complete a schedule block.
 * POST /api/schedule/complete
 * Body: { block_key: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const blockKey = formData.get("block_key") as string;

  if (!blockKey) {
    return NextResponse.json({ error: "missing block_key" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  // ─── Insert the completion using the anon client (RLS will validate) ───
  const { error } = await supabase
    .from("block_completions")
    .upsert({
      user_id: user.id,
      block_key: blockKey,
      local_date: today,
      status: "completed",
      completed_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,block_key,local_date",
    });

  if (error) {
    console.error("[schedule/complete] Insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ─── Refresh leaderboard (try, don't block on failure) ───
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("cohort_id")
      .eq("id", user.id)
      .single();

    if (profile?.cohort_id) {
      await admin.rpc("refresh_leaderboard_for_cohort", { cohort_id: profile.cohort_id });
    }
  } catch {
    // Leaderboard refresh is nice-to-have; don't fail the completion on it
  }

  // ─── Redirect back to schedule page ───
  return NextResponse.redirect(new URL("/schedule", request.url));
}
