import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  // ─── Cohort stats ───
  const { data: cohorts } = await admin
    .from("cohorts")
    .select("id, name, access_start_at, access_end_at")
    .order("access_start_at", { ascending: false });

  // ─── Member count per cohort ───
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, cohort_id, role")
    .eq("role", "member");

  const memberCountByCohort = new Map<string, number>();
  for (const p of (profiles ?? [])) {
    const count = memberCountByCohort.get(p.cohort_id) ?? 0;
    memberCountByCohort.set(p.cohort_id, count + 1);
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>Admin Overview</h2>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Cohorts</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #111827" }}>
              <th style={{ padding: 8, textAlign: "left", fontSize: 14 }}>Name</th>
              <th style={{ padding: 8, textAlign: "center", fontSize: 14 }}>Members</th>
              <th style={{ padding: 8, textAlign: "left", fontSize: 14 }}>Start</th>
              <th style={{ padding: 8, textAlign: "left", fontSize: 14 }}>End</th>
              <th style={{ padding: 8, textAlign: "center", fontSize: 14 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(cohorts ?? []).map((cohort) => {
              const now = new Date();
              const start = cohort.access_start_at ? new Date(cohort.access_start_at) : null;
              const end = cohort.access_end_at ? new Date(cohort.access_end_at) : null;
              const isActive = start && end && now >= start && now <= end;

              return (
                <tr key={cohort.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 8, fontSize: 14 }}>{cohort.name}</td>
                  <td style={{ padding: 8, textAlign: "center", fontSize: 14 }}>
                    {memberCountByCohort.get(cohort.id) ?? 0}
                  </td>
                  <td style={{ padding: 8, fontSize: 14 }}>
                    {start?.toLocaleDateString() ?? "—"}
                  </td>
                  <td style={{ padding: 8, fontSize: 14 }}>
                    {end?.toLocaleDateString() ?? "—"}
                  </td>
                  <td style={{
                    padding: 8,
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    color: isActive ? "#166534" : "#888",
                  }}>
                    {isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 14, color: "#888" }}>Total members</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{profiles?.length ?? 0}</div>
      </div>
    </div>
  );
}
