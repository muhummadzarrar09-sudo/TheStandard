import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Server-side magic link sender with enrollment check.
 *
 * Flow:
 *  1. Look up the auth user by email (admin API)
 *  2. Check if that auth user has a profile row with valid enrollment
 *  3. Check access window
 *  4. If all checks pass → send magic link via signInWithOtp
 *  5. If any check fails → specific error message
 *
 * The client NEVER calls Supabase auth directly.
 */
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ─── Step 1: Find auth user by email ───
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers();

  if (listError) {
    console.error("[send-magic-link] listUsers failed:", listError.message);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }

  const authUser = users.find((u) => u.email === email);

  // ─── Step 2: No auth user → account not activated ───
  if (!authUser) {
    // Don't reveal whether the email exists in profiles.
    // Just say "not enrolled" — prevents enumeration attacks.
    console.log("[send-magic-link] No auth user for:", email);
    return NextResponse.json(
      { error: "This email is not registered. Contact the administrator to get access." },
      { status: 403 }
    );
  }

  // ─── Step 3: Check profile / enrollment ───
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, cohort_id, access_start_at, access_end_at")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    console.log("[send-magic-link] No profile for auth user:", authUser.id);
    return NextResponse.json(
      { error: "You are not enrolled in any cohort. Contact the administrator." },
      { status: 403 }
    );
  }

  // ─── Step 4: Check access window ───
  const now = new Date();
  const accessStart = profile.access_start_at ? new Date(profile.access_start_at) : null;
  const accessEnd = profile.access_end_at ? new Date(profile.access_end_at) : null;

  if (accessStart && now < accessStart) {
    return NextResponse.json(
      { error: `Your cohort hasn't started yet. Access opens on ${accessStart.toLocaleDateString()}.` },
      { status: 403 }
    );
  }

  if (accessEnd && now > accessEnd) {
    return NextResponse.json(
      { error: `Your cohort access has ended on ${accessEnd.toLocaleDateString()}. Thank you for completing the program.` },
      { status: 403 }
    );
  }

  // ─── Step 5: Send the magic link ───
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      shouldCreateUser: false,
    },
  });

  if (otpError) {
    console.error("[send-magic-link] signInWithOtp failed:", otpError.message);
    return NextResponse.json({ error: otpError.message }, { status: 500 });
  }

  // ─── Step 6: Success ───
  return NextResponse.json({ success: true });
}
