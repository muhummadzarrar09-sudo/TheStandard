import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

/**
 * Dashboard — the main landing page after login.
 * Shows the user's profile info, today's schedule summary,
 * streak count, and quick links.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // layout handles redirect

  // ─── Profile ───
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, cohort_id")
    .eq("id", user.id)
    .single();

  // ─── Today's completions ───
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: completions } = await supabase
    .from("block_completions")
    .select("block_key, status, completed_at")
    .eq("user_id", user.id)
    .eq("local_date", today);

  // ─── Streak ───
  const { data: streakData } = await supabase
    .from("leaderboard_projection")
    .select("current_streak, longest_streak")
    .eq("user_id", user.id)
    .single();

  const completed = completions?.filter((c) => c.status === "completed") ?? [];
  const missed = completions?.filter((c) => c.status === "missed") ?? [];
  const streak = streakData?.current_streak ?? 0;
  const longest = streakData?.longest_streak ?? 0;

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 24, marginBottom: 8 }}>
        Welcome back, {profile?.full_name || user.email?.split("@")[0]}
      </h2>

      {/* ─── Stats cards ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 13, color: "#888" }}>Current streak</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{streak}</div>
        </div>
        <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 13, color: "#888" }}>Longest streak</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{longest}</div>
        </div>
        <div style={{ padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 13, color: "#888" }}>Today</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{completed.length} done</div>
          {missed.length > 0 && (
            <div style={{ fontSize: 12, color: "#dc2626" }}>{missed.length} missed</div>
          )}
        </div>
      </div>

      {/* ─── Quick links ─── */}
      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/schedule"
          style={{
            padding: "10px 20px",
            background: "#111827",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          View schedule →
        </Link>
        <Link
          href="/leaderboard"
          style={{
            padding: "10px 20px",
            background: "#f9fafb",
            color: "#111",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            border: "1px solid #e5e7eb",
          }}
        >
          Leaderboard →
        </Link>
      </div>

      {/* ─── Today's completed blocks ─── */}
      {completed.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Completed today</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {completed.map((c) => (
              <li key={c.block_key} style={{
                padding: "8px 12px",
                background: "#f0fdf4",
                borderRadius: 6,
                marginBottom: 4,
                fontSize: 14,
              }}>
                ✅ {c.block_key} — {new Date(c.completed_at!).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
