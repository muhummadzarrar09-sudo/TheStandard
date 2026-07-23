import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase session refresh in middleware.
 *
 * This runs on EVERY request. It:
 *  1. Reads the auth cookies.
 *  2. Refreshes the session if expired.
 *  3. Sets updated cookies back on the response.
 *
 * CRITICAL: This does NOT do route protection.
 * Route protection is in the main middleware function,
 * AFTER session refresh, so we know who the user is.
 */
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
          // Set on the request so downstream handlers see them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild the response with updated cookies
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This will refresh the session if expired — no need to call
  // supabase.auth.getSession() separately, this does it internally.
  await supabase.auth.getUser();

  return supabaseResponse;
}
