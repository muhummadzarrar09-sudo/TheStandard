"use client";

import { useState } from "react";

/**
 * Login page — Magic Link flow via server-side endpoint.
 *
 * The client NEVER calls Supabase auth directly.
 * It calls /api/auth/send-magic-link which:
 *  1. Checks enrollment (service-role key, bypasses RLS)
 *  2. Checks if auth user exists
 *  3. Checks access window
 *  4. Only THEN sends the magic link
 *
 * This gives proper error messages instead of Supabase's cryptic ones.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    // Call OUR server endpoint, not Supabase directly
    const res = await fetch("/api/auth/send-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setErrorMessage(data.error || "Something went wrong. Try again.");
      return;
    }

    setStatus("sent");
  }

  // Check if redirected back with an error from the callback handler
  const urlParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const urlError = urlParams.get("message");

  return (
    <div style={{
      maxWidth: 420,
      margin: "80px auto",
      padding: 32,
      fontFamily: "system-ui, sans-serif",
    }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>The Standard</h1>
      <p style={{ color: "#888", marginBottom: 32 }}>Member access — magic link login</p>

      {urlError && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          background: "#fee2e2",
          color: "#991b1b",
          borderRadius: 8,
          fontSize: 14,
        }}>
          {urlError}
        </div>
      )}

      {status === "sent" ? (
        <div style={{
          padding: 20,
          background: "#f0fdf4",
          color: "#166534",
          borderRadius: 8,
        }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Check your email</p>
          <p style={{ fontSize: 14 }}>
            We sent a magic link to <strong>{email}</strong>.
            Click it and you&apos;ll be logged in automatically.
          </p>
          <p style={{ fontSize: 13, color: "#4ade80", marginTop: 12 }}>
            The link expires in 24 hours.
          </p>
          <button
            onClick={() => { setStatus("idle"); setEmail(""); }}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid #166534",
              color: "#166534",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleMagicLink}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "sending"}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              border: "1px solid #ddd",
              borderRadius: 8,
              marginBottom: 16,
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              background: status === "sending" ? "#9ca3af" : "#111827",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: status === "sending" ? "not-allowed" : "pointer",
            }}
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}

      {status === "error" && errorMessage && (
        <div style={{
          padding: 12,
          marginTop: 16,
          background: "#fee2e2",
          color: "#991b1b",
          borderRadius: 8,
          fontSize: 14,
        }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}
