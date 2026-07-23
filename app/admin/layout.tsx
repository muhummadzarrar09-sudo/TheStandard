import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
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

  // ─── Admin role check from DATABASE (same source as (app)/layout) ───
  // NOT from user.app_metadata — that's a DIFFERENT source of truth
  // and causes redirect loops when the two disagree.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const navLinks = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/enrollment", label: "Enrollment" },
    { href: "/admin/members", label: "Members" },
    { href: "/admin/schedule", label: "Schedule" },
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
        <span style={{ fontWeight: 700 }}>The Standard — Admin</span>
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
