import { createClient } from "@/lib/supabase/server";

/**
 * Schedule page — shows the daily schedule and lets the user mark blocks complete.
 * This reads from the `canonical_schedule_blocks` table if it exists
 * (data-driven schedule from Phase 6a), otherwise falls back to the
 * hardcoded STANDARD_SCHEDULE constant.
 */

// Fallback schedule if the DB table doesn't exist yet
const STANDARD_SCHEDULE = [
  { block_key: "wake-up", label: "Wake Up", start_time: "05:00", end_time: "05:15", required: false, critical: false },
  { block_key: "movement", label: "Movement", start_time: "05:15", end_time: "06:00", required: true, critical: false },
  { block_key: "deep-1", label: "Deep Work 1", start_time: "06:00", end_time: "08:30", required: true, critical: true },
  { block_key: "break-1", label: "Break", start_time: "08:30", end_time: "09:00", required: false, critical: false },
  { block_key: "skill-build", label: "Skill Build", start_time: "09:00", end_time: "11:00", required: true, critical: false },
  { block_key: "break-2", label: "Break", start_time: "11:00", end_time: "11:30", required: false, critical: false },
  { block_key: "deep-2", label: "Deep Work 2", start_time: "11:30", end_time: "14:00", required: true, critical: true },
  { block_key: "lunch", label: "Lunch", start_time: "14:00", end_time: "14:30", required: false, critical: false },
  { block_key: "team-deep-work", label: "Team Deep Work", start_time: "14:30", end_time: "16:30", required: true, critical: true },
  { block_key: "break-3", label: "Break", start_time: "16:30", end_time: "17:00", required: false, critical: false },
  { block_key: "review-planning", label: "Review & Planning", start_time: "17:00", end_time: "17:30", required: true, critical: false },
  { block_key: "reflection", label: "Reflection", start_time: "17:30", end_time: "18:00", required: true, critical: true },
];

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  // ─── Try data-driven schedule from DB ───
  const { data: dbSchedule } = await supabase
    .from("canonical_schedule_blocks")
    .select("block_key, label, start_time, end_time, required, critical")
    .order("start_time");

  const schedule = (dbSchedule && dbSchedule.length > 0) ? dbSchedule : STANDARD_SCHEDULE;

  // ─── Today's completions ───
  const { data: completions } = await supabase
    .from("block_completions")
    .select("block_key, status, completed_at")
    .eq("user_id", user.id)
    .eq("local_date", today);

  // Map for quick lookup
  const completionMap = new Map(
    (completions ?? []).map((c) => [c.block_key, c])
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>Today&apos;s Schedule</h2>

      {schedule.map((block) => {
        const completion = completionMap.get(block.block_key);
        const isDone = completion?.status === "completed";
        const isMissed = completion?.status === "missed";

        return (
          <div key={block.block_key} style={{
            padding: 12,
            marginBottom: 8,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: isDone ? "#f0fdf4" : isMissed ? "#fee2e2" : "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {isDone ? "✅" : isMissed ? "❌" : "⏳"} {block.label}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>
                {block.start_time} – {block.end_time}
              </div>
              {block.critical && (
                <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
                  CRITICAL
                </span>
              )}
              {block.required && !block.critical && (
                <span style={{ fontSize: 11, color: "#d97706" }}>
                  Required
                </span>
              )}
            </div>

            {!isDone && !isMissed && (
              <form action="/api/schedule/complete" method="POST">
                <input type="hidden" name="block_key" value={block.block_key} />
                <button
                  type="submit"
                  style={{
                    padding: "6px 16px",
                    background: "#111827",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Complete
                </button>
              </form>
            )}

            {isDone && completion?.completed_at && (
              <span style={{ fontSize: 12, color: "#166534" }}>
                Done at {new Date(completion.completed_at).toLocaleTimeString()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
