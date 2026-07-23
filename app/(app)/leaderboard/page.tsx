import { createClient } from "@/lib/supabase/server";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get the user's cohort
  const { data: profile } = await supabase
    .from("profiles")
    .select("cohort_id")
    .eq("id", user.id)
    .single();

  if (!profile?.cohort_id) {
    return <div>No cohort assigned yet.</div>;
  }

  // Leaderboard for this cohort — sorted by current streak descending
  const { data: leaderboard } = await supabase
    .from("leaderboard_projection")
    .select("user_id, current_streak, longest_streak, total_days_complete, display_name")
    .eq("cohort_id", profile.cohort_id)
    .order("current_streak", { ascending: false });

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>Leaderboard</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #111827" }}>
            <th style={{ padding: 8, textAlign: "left", fontSize: 14 }}>#</th>
            <th style={{ padding: 8, textAlign: "left", fontSize: 14 }}>Name</th>
            <th style={{ padding: 8, textAlign: "center", fontSize: 14 }}>Streak</th>
            <th style={{ padding: 8, textAlign: "center", fontSize: 14 }}>Best</th>
            <th style={{ padding: 8, textAlign: "center", fontSize: 14 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(leaderboard ?? []).map((entry, i) => (
            <tr
              key={entry.user_id}
              style={{
                borderBottom: "1px solid #e5e7eb",
                background: entry.user_id === user.id ? "#f0fdf4" : "transparent",
              }}
            >
              <td style={{ padding: 8, fontSize: 14 }}>{i + 1}</td>
              <td style={{ padding: 8, fontSize: 14, fontWeight: entry.user_id === user.id ? 600 : 400 }}>
                {entry.display_name || "Member"}
                {entry.user_id === user.id && (
                  <span style={{ fontSize: 11, color: "#166534", marginLeft: 4 }}>you</span>
                )}
              </td>
              <td style={{ padding: 8, textAlign: "center", fontSize: 14, fontWeight: 700 }}>
                {entry.current_streak}
              </td>
              <td style={{ padding: 8, textAlign: "center", fontSize: 14 }}>
                {entry.longest_streak}
              </td>
              <td style={{ padding: 8, textAlign: "center", fontSize: 14 }}>
                {entry.total_days_complete}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
