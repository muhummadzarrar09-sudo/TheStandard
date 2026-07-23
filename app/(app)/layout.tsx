import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

/**
 * Protected layout for all member pages.
 * Checks auth and enrollment in server component —
 * this is the REAL guard, not just middleware.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ─── Enrollment check ───
  // Use the anon client (RLS will filter by the logged-in user's profile).
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, cohort_id, access_start_at, access_end_at")
    .eq("id", user.id)
    .single();

  // No profile → not enrolled
  if (!profile) {
    return (
      <div style={{
        maxWidth: 420,
        margin: "80px auto",
        padding: 32,
        fontFamily: "system-ui, sans-serif",
      }}>
        <h2>Not enrolled</h2>
        <p style={{ color: "#888" }}>
          Your email <strong>{user.email}</strong> is not in an active cohort.
          Contact the administrator.
        </p>
        <Link href="/login" style={{ color: "#111" }}>← Back to login</Link>
      </div>
    );
  }

  // ─── Access window check ───
  const now = new Date();
  const accessStart = profile.access_start_at ? new Date(profile.access_start_at) : null;
  const accessEnd = profile.access_end_at ? new Date(profile.access_end_at) : null;

  if (accessStart && now < accessStart) {
    return (
      <div style={{
        maxWidth: 420,
        margin: "80px auto",
        padding: 32,
        fontFamily: "system-ui, sans-serif",
      }}>
        <h2>Your cohort hasn&apos;t started yet</h2>
        <p style={{ color: "#888" }}>
          Access opens on <strong>{accessStart.toLocaleDateString()}</strong>.
          You&apos;ll get a reminder when it begins.
        </p>
      </div>
    );
  }

  if (accessEnd && now > accessEnd) {
    return (
      <div style={{
        maxWidth: 420,
        margin: "80px auto",
        padding: 32,
        fontFamily: "system-ui, sans-serif",
      }}>
        <h2>Your cohort has ended</h2>
        <p style={{ color: "#888" }}>
          Access closed on <strong>{accessEnd.toLocaleDateString()}</strong>.
          Thank you for completing the program.
        </p>
      </div>
    );
  }

  // ─── Admin redirect ───
  if (profile.role === "admin") {
    redirect("/admin");
  }

  // ─── Navigation ───
  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/schedule", label: "Schedule" },
    { href: "/streaks", label: "Streaks" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={{
        display: "flex",
        gap: 16,
        padding: "12px 24px",
        background: "#111827",
        color: "#fff",
        alignItems: "center",
      }}>
        <span style={{ fontWeight: 700 }}>The Standard</span>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ color: "#d1d5db", textDecoration: "none", fontSize: 14 }}
          >
            {link.label}
          </Link>
        ))}
        <form action="/api/auth/logout" method="POST" style={{ marginLeft: "auto" }}>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid #d1d5db",
              color: "#d1d5db",
              padding: "4px 12px",
              borderRadius: 4,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </form>
      </nav>
      <main style={{ padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
