import { type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Routes that do NOT require authentication.
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/auth/callback",
  "/auth/confirm",
  "/offline",
];

// Routes that require the admin role.
const ADMIN_ROUTES = ["/admin"];

export async function middleware(request: NextRequest) {
  // ─── Step 1: Refresh the Supabase session ───
  let response = await refreshSession(request);

  // ─── Step 2: Check if the route is public ───
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return response;
  }

  // ─── Step 3: Get the user ───
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // We already refreshed in step 1, no need to set again here
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── Step 4: Not logged in → send to login ───
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // ─── Step 5: Admin route guard ───
  // NOTE: We do NOT check admin role in middleware.
  // Role checking happens in the server component layouts,
  // which can query the database (the canonical source).
  // Middleware only checks: "is this person logged in?"
  //
  // The admin layout does the actual role check using profile.role
  // from the database — NOT user.app_metadata.role (which can
  // disagree with the DB and cause redirect loops).
  //
  // If a non-admin somehow hits /admin, the admin layout will
  // redirect them to /dashboard. No infinite loop because both
  // layouts check the SAME database field.

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
