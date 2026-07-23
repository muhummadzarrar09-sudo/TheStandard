import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Auth Confirm Route Handler
 *
 * Supabase's Free-tier default email templates sometimes redirect to
 * /auth/confirm instead of /auth/callback. This handler covers that
 * pattern too. Same logic as the callback handler.
 *
 * Both `code` (PKCE) and `token_hash+type` (implicit) patterns are handled.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&message=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&message=${encodeURIComponent(exchangeError.message)}`
      );
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "signup" | "recovery" | "email_change",
    });

    if (verifyError) {
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&message=${encodeURIComponent(verifyError.message)}`
      );
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=auth_failed&message=No+auth+parameters+provided`
  );
}
