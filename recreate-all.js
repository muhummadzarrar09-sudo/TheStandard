#!/usr/bin/env node
// Run this in your project root (the git repo folder) on your local machine:
//   node recreate-all.js
//
// It will write ALL files for the v2 clean build into your current directory.
// After running, git add, commit, and push.

const fs = require("fs");
const path = require("path");

function write(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log("✅ " + filePath);
}

// ═══════════════════════════════════════════
// ROOT FILES
// ═══════════════════════════════════════════

write("package.json", JSON.stringify({
  name: "the-standard",
  version: "2.0.0",
  private: true,
  scripts: {
    dev: "next dev",
    build: "next build",
    start: "next start",
    lint: "eslint .",
    typecheck: "tsc --noEmit",
    test: "vitest run"
  },
  dependencies: {
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.4",
    "next": "^15.3.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  devDependencies: {
    "@types/node": "^22.15.17",
    "@types/react": "^19.1.4",
    "@types/react-dom": "^19.1.5",
    "eslint": "^9.28.0",
    "eslint-config-next": "^15.3.3",
    "typescript": "^5.8.3",
    "vitest": "^3.1.4"
  },
  engines: { node: ">=22" }
}, null, 2));

write("tsconfig.json", JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    lib: ["dom", "dom.iterable", "ES2022"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "ESNext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    plugins: [{ name: "next" }],
    paths: { "@/*": ["./*"] }
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"]
}, null, 2));

write("next.config.ts", `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No custom server — we rely on middleware + route handlers for auth.
};

export default nextConfig;
`);

write("vercel.json", JSON.stringify({
  $schema: "https://openapi.vercel.sh/vercel.json",
  buildCommand: "npm run build",
  installCommand: "npm ci",
  framework: "nextjs",
  regions: ["iad1"],
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      source: "/api/(.*)",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }
      ]
    },
    {
      source: "/auth/(.*)",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }
      ]
    }
  ]
}, null, 2));

write(".npmrc", `# Enforce exact versions from the lockfile for reproducible builds.
save-exact=true
`);

write(".env.example", `# ─── Supabase ───
# Copy your EXISTING values from the old project's Vercel environment variables.
# These are the SAME vars — no new ones needed.

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── Site ───
# CRITICAL for magic links. Must match Supabase Dashboard → Auth → URL Configuration → Site URL.
# In Vercel, set this to your production domain (e.g. https://thestandard.vercel.app).
# In local dev, use http://localhost:3000.

NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ─── How to set these in Vercel ───
# 1. Go to Vercel Dashboard → your project → Settings → Environment Variables
# 2. Add each variable above (NEXT_PUBLIC ones for all environments,
#    SUPABASE_SERVICE_ROLE_KEY only for Production + Preview, NOT Preview if you want extra safety)
# 3. After adding, redeploy for changes to take effect
`);

write(".gitignore", `# dependencies
node_modules/

# next.js
.next/
out/

# env files
.env
.env.local
.env.*.local

# debug
npm-debug.log*

# misc
*.tsbuildinfo
next-env.d.ts

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Supabase
.supabase/
`);

// ═══════════════════════════════════════════
// SUPABASE LIB
// ═══════════════════════════════════════════

write("lib/supabase/client.ts", `import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
`);

write("lib/supabase/server.ts", `import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components where cookies are read-only.
            // That's fine — the middleware will refresh the session instead.
          }
        },
      },
    }
  );
}
`);

write("lib/supabase/admin.ts", `import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
`);

write("lib/supabase/middleware.ts", `import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function refreshSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
`);

// ═══════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════

write("middleware.ts", `import { type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/auth/callback",
  "/auth/confirm",
  "/offline",
];

export async function middleware(request: NextRequest) {
  let response = await refreshSession(request);

  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
`);

// ═══════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════

write("app/auth/callback/route.ts", `import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("[auth/callback] Supabase error:", error, errorDescription);
    return NextResponse.redirect(
      \`\${origin}/login?error=auth_failed&message=\${encodeURIComponent(errorDescription || error)}\`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError.message);
      return NextResponse.redirect(
        \`\${origin}/login?error=auth_failed&message=\${encodeURIComponent(exchangeError.message)}\`
      );
    }

    return NextResponse.redirect(\`\${origin}/dashboard\`);
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "signup" | "recovery" | "email_change",
    });

    if (verifyError) {
      console.error("[auth/callback] verifyOtp failed:", verifyError.message);
      return NextResponse.redirect(
        \`\${origin}/login?error=auth_failed&message=\${encodeURIComponent(verifyError.message)}\`
      );
    }

    return NextResponse.redirect(\`\${origin}/dashboard\`);
  }

  console.error("[auth/callback] No code or token_hash parameter in URL");
  return NextResponse.redirect(
    \`\${origin}/login?error=auth_failed&message=No+auth+parameters+provided\`
  );
}
`);

write("app/auth/confirm/route.ts", `import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      \`\${origin}/login?error=auth_failed&message=\${encodeURIComponent(errorDescription || error)}\`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        \`\${origin}/login?error=auth_failed&message=\${encodeURIComponent(exchangeError.message)}\`
      );
    }

    return NextResponse.redirect(\`\${origin}/dashboard\`);
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "signup" | "recovery" | "email_change",
    });

    if (verifyError) {
      return NextResponse.redirect(
        \`\${origin}/login?error=auth_failed&message=\${encodeURIComponent(verifyError.message)}\`
      );
    }

    return NextResponse.redirect(\`\${origin}/dashboard\`);
  }

  return NextResponse.redirect(
    \`\${origin}/login?error=auth_failed&message=No+auth+parameters+provided\`
  );
}
`);

write("app/api/auth/logout/route.ts", `import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url));
}
`);

write("app/api/health/route.ts", `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", version: "2.0.0" });
}
`);

write("app/api/schedule/complete/route.ts", `import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const blockKey = formData.get("block_key") as string;

  if (!blockKey) {
    return NextResponse.json({ error: "missing block_key" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

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
  } catch {}

  return NextResponse.redirect(new URL("/schedule", request.url));
}
`);

// ═══════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════

write("app/layout.tsx", `import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Standard — Discipline OS",
  description: "A 30-day execution system. Private, paid, structured.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa" }}>
        {children}
      </body>
    </html>
  );
}
`);

write("app/page.tsx", `import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{
      maxWidth: 600,
      margin: "120px auto",
      padding: 32,
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
    }}>
      <h1 style={{ fontSize: 40, fontWeight: 700, marginBottom: 12 }}>The Standard</h1>
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
`);

write("app/login/page.tsx", `"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: \`\${siteUrl}/auth/callback\`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

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
`);

write("app/(app)/layout.tsx", `import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, cohort_id, access_start_at, access_end_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", padding: 32, fontFamily: "system-ui, sans-serif" }}>
        <h2>Not enrolled</h2>
        <p style={{ color: "#888" }}>
          Your email <strong>{user.email}</strong> is not in an active cohort.
          Contact the administrator.
        </p>
        <Link href="/login" style={{ color: "#111" }}>← Back to login</Link>
      </div>
    );
  }

  const now = new Date();
  const accessStart = profile.access_start_at ? new Date(profile.access_start_at) : null;
  const accessEnd = profile.access_end_at ? new Date(profile.access_end_at) : null;

  if (accessStart && now < accessStart) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", padding: 32, fontFamily: "system-ui, sans-serif" }}>
        <h2>Your cohort hasn&apos;t started yet</h2>
        <p style={{ color: "#888" }}>
          Access opens on <strong>{accessStart.toLocaleDateString()}</strong>.
        </p>
      </div>
    );
  }

  if (accessEnd && now > accessEnd) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", padding: 32, fontFamily: "system-ui, sans-serif" }}>
        <h2>Your cohort has ended</h2>
        <p style={{ color: "#888" }}>
          Access closed on <strong>{accessEnd.toLocaleDateString()}</strong>.
        </p>
      </div>
    );
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/schedule", label: "Schedule" },
    { href: "/streaks", label: "Streaks" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={{ display: "flex", gap: 16, padding: "12px 24px", background: "#111827", color: "#fff", alignItems: "center" }}>
        <span style={{ fontWeight: 700 }}>The Standard</span>
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} style={{ color: "#d1d5db", textDecoration: "none", fontSize: 14 }}>
            {link.label}
          </Link>
        ))}
        <form action="/api/auth/logout" method="POST" style={{ marginLeft: "auto" }}>
          <button type="submit" style={{ background: "transparent", border: "1px solid #d1d5db", color: "#d1d5db", padding: "4px 12px", borderRadius: 4, fontSize: 13, cursor: "pointer" }}>
            Logout
          </button>
        </form>
      </nav>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
`);

write("app/(app)/dashboard/page.tsx", `import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, cohort_id")
    .eq("id", user.id)
    .single();

  const today = new Date().toISOString().split("T")[0];

  const { data: completions } = await supabase
    .from("block_completions")
    .select("block_key, status, completed_at")
    .eq("user_id", user.id)
    .eq("local_date", today);

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
          {missed.length > 0 && <div style={{ fontSize: 12, color: "#dc2626" }}>{missed.length} missed</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Link href="/schedule" style={{ padding: "10px 20px", background: "#111827", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>
          View schedule →
        </Link>
        <Link href="/leaderboard" style={{ padding: "10px 20px", background: "#f9fafb", color: "#111", borderRadius: 8, textDecoration: "none", fontSize: 14, border: "1px solid #e5e7eb" }}>
          Leaderboard →
        </Link>
      </div>
      {completed.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Completed today</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {completed.map((c) => (
              <li key={c.block_key} style={{ padding: "8px 12px", background: "#f0fdf4", borderRadius: 6, marginBottom: 4, fontSize: 14 }}>
                ✅ {c.block_key} — {new Date(c.completed_at!).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
`);

write("app/(app)/schedule/page.tsx", `import { createClient } from "@/lib/supabase/server";

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const { data: dbSchedule } = await supabase
    .from("canonical_schedule_blocks")
    .select("block_key, label, start_time, end_time, required, critical")
    .order("start_time");

  const schedule = (dbSchedule && dbSchedule.length > 0) ? dbSchedule : STANDARD_SCHEDULE;

  const { data: completions } = await supabase
    .from("block_completions")
    .select("block_key, status, completed_at")
    .eq("user_id", user.id)
    .eq("local_date", today);

  const completionMap = new Map((completions ?? []).map((c) => [c.block_key, c]));

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>Today&apos;s Schedule</h2>
      {schedule.map((block) => {
        const completion = completionMap.get(block.block_key);
        const isDone = completion?.status === "completed";
        const isMissed = completion?.status === "missed";

        return (
          <div key={block.block_key} style={{
            padding: 12, marginBottom: 8, borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: isDone ? "#f0fdf4" : isMissed ? "#fee2e2" : "#fff",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {isDone ? "✅" : isMissed ? "❌" : "⏳"} {block.label}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>{block.start_time} – {block.end_time}</div>
              {block.critical && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>CRITICAL</span>}
              {block.required && !block.critical && <span style={{ fontSize: 11, color: "#d97706" }}>Required</span>}
            </div>
            {!isDone && !isMissed && (
              <form action="/api/schedule/complete" method="POST">
                <input type="hidden" name="block_key" value={block.block_key} />
                <button type="submit" style={{ padding: "6px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
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
`);

write("app/(app)/streaks/page.tsx", `import { createClient } from "@/lib/supabase/server";

export default async function StreaksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
`);

write("app/(app)/leaderboard/page.tsx", `import { createClient } from "@/lib/supabase/server";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("cohort_id")
    .eq("id", user.id)
    .single();

  if (!profile?.cohort_id) {
    return <div>No cohort assigned yet.</div>;
  }

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
            <tr key={entry.user_id} style={{ borderBottom: "1px solid #e5e7eb", background: entry.user_id === user.id ? "#f0fdf4" : "transparent" }}>
              <td style={{ padding: 8, fontSize: 14 }}>{i + 1}</td>
              <td style={{ padding: 8, fontSize: 14, fontWeight: entry.user_id === user.id ? 600 : 400 }}>
                {entry.display_name || "Member"}
                {entry.user_id === user.id && <span style={{ fontSize: 11, color: "#166534", marginLeft: 4 }}>you</span>}
              </td>
              <td style={{ padding: 8, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{entry.current_streak}</td>
              <td style={{ padding: 8, textAlign: "center", fontSize: 14 }}>{entry.longest_streak}</td>
              <td style={{ padding: 8, textAlign: "center", fontSize: 14 }}>{entry.total_days_complete}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`);

// ═══════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════

write("app/admin/layout.tsx", `import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
      <nav style={{ display: "flex", gap: 16, padding: "12px 24px", background: "#111827", color: "#fff", alignItems: "center" }}>
        <span style={{ fontWeight: 700 }}>The Standard — Admin</span>
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} style={{ color: "#d1d5db", textDecoration: "none", fontSize: 14 }}>
            {link.label}
          </Link>
        ))}
        <form action="/api/auth/logout" method="POST" style={{ marginLeft: "auto" }}>
          <button type="submit" style={{ background: "transparent", border: "1px solid #d1d5db", color: "#d1d5db", padding: "4px 12px", borderRadius: 4, fontSize: 13, cursor: "pointer" }}>
            Logout
          </button>
        </form>
      </nav>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
`);

write("app/admin/page.tsx", `import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const { data: cohorts } = await admin
    .from("cohorts")
    .select("id, name, access_start_at, access_end_at")
    .order("access_start_at", { ascending: false });

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
                  <td style={{ padding: 8, textAlign: "center", fontSize: 14 }}>{memberCountByCohort.get(cohort.id) ?? 0}</td>
                  <td style={{ padding: 8, fontSize: 14 }}>{start?.toLocaleDateString() ?? "—"}</td>
                  <td style={{ padding: 8, fontSize: 14 }}>{end?.toLocaleDateString() ?? "—"}</td>
                  <td style={{ padding: 8, textAlign: "center", fontSize: 13, fontWeight: 600, color: isActive ? "#166534" : "#888" }}>
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
`);

// ═══════════════════════════════════════════
// DOCS
// ═══════════════════════════════════════════

write("README.md", `# The Standard — Discipline OS v2

Clean rebuild. Same database, same env vars, auth that actually works.

## Quick start

\`\`\`bash
npm install
cp .env.example .env.local   # Fill in your existing Supabase creds
npm run typecheck
npm run build
npm run dev
# Open http://localhost:3000
\`\`\`

## Auth flow (the whole thing, end to end)

\`\`\`
User enters email on /login
  → signInWithOtp({ email, emailRedirectTo: '/auth/callback', shouldCreateUser: false })
  → Supabase sends magic link email
  → User clicks link in email
  → Browser navigates to /auth/callback?code=XXXXX (or ?token_hash=XXXXX&type=magiclink)
  → /auth/callback handler: exchangeCodeForSession(code) OR verifyOtp({ token_hash, type })
  → Session cookies set
  → Redirect to /dashboard
  → ✅ Done
\`\`\`

## Environment variables

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  (or your production domain)
\`\`\`

## See SUPABASE_SETUP.md for the Free-tier configuration guide.
`);

write("SUPABASE_SETUP.md", `# Supabase Setup — Magic Link Configuration (Free Tier)

## Step 1: Site URL + Redirect URLs

1. **Supabase Dashboard → Authentication → URL Configuration**
2. Set **Site URL**: \`https://your-vercel-app.vercel.app\` (or \`http://localhost:3000\` for dev)
3. Add **Redirect URLs**:
   - \`https://your-vercel-app.vercel.app/auth/callback\`
   - \`https://your-vercel-app.vercel.app/auth/confirm\`
   - \`http://localhost:3000/auth/callback\`
   - \`http://localhost:3000/auth/confirm\`

## Step 2: Disable "Confirm email"

1. **Supabase Dashboard → Authentication → Providers → Email**
2. Turn OFF **Confirm email** (saves you from double emails on Free tier)

## Step 3: Free-tier rate limits

| Action | Free tier limit |
|--------|----------------|
| Magic link emails | 3 per hour per email address |
| Auth requests | 30 per minute per IP |

For a 30-person cohort, this is fine.

## Step 4: Ensure profiles exist

1. User in **Supabase Authentication → Users**
2. Matching row in \`public.profiles\` with \`role='member'\`, valid \`cohort_id\`
3. Valid \`access_start_at\` and \`access_end_at\` dates
`);

console.log("\n\n✅ ALL FILES WRITTEN. Now run:");
console.log("  npm install");
console.log("  git add .");
console.log("  git commit -m 'v2 clean build'");
console.log("  git push");
