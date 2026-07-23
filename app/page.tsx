import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{
      maxWidth: 600,
      margin: "120px auto",
      padding: 32,
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
    }}>
      <h1 style={{ fontSize: 40, fontWeight: 700, marginBottom: 12 }}>
        The Standard
      </h1>
      <p style={{ fontSize: 18, color: "#666", marginBottom: 40 }}>
        Discipline OS — a 30-day execution system for those who chose to show up.
      </p>
      <Link
        href="/login"
        style={{
          display: "inline-block",
          padding: "14px 32px",
          background: "#111827",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Member access
      </Link>
    </div>
  );
}
