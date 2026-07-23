import { createClient } from "@/lib/supabase/server";

export default async function StreaksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: streakData } = await supabase
    .from("leaderboard_projection")
    .select("current_streak, longest_streak, total_days_complete")
    .eq("user_id", user.id)
    .single();

  const current = streakData?.current_streak ?? 0;
  const longest = streakData?.longest_streak ?? 0;
  const total = streakData?.total_days_complete ?? 0;

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>Your Streaks</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={{ padding: 20, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Current</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{current}</div>
          <div style={{ fontSize: 12, color: "#888" }}>days</div>
        </div>
        <div style={{ padding: 20, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Longest</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{longest}</div>
          <div style={{ fontSize: 12, color: "#888" }}>days</div>
        </div>
        <div style={{ padding: 20, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Total complete</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{total}</div>
          <div style={{ fontSize: 12, color: "#888" }}>days</div>
        </div>
      </div>
    </div>
  );
}
