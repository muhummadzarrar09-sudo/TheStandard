// PKCE Auth Callback Route
//
// This route handles the magic link callback using the PKCE
// (Proof Key for Code Exchange) flow, which is more secure than
// the implicit flow because it doesn't put tokens in the URL.
//
// Flow:
// 1. User clicks magic link in email
// 2. Supabase redirects to /auth/callback?code=xxx
// 3. This route exchanges the code for a session server-side
// 4. Tokens are set as HTTP-only cookies (never in URL)
// 5. Redirect to dashboard
//
// Security benefits:
// - No tokens in URL (can't be leaked via referrer, history, logs)
// - Code is single-use and short-lived (5 minutes)
// - Code exchange happens server-side
// - Tokens are HTTP-only cookies (not accessible to JavaScript)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', { error, errorDescription })
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  // No code provided — invalid callback
  if (!code) {
    console.error('Auth callback: no code provided')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  // Create Supabase server client that sets cookies on the response
  const response = NextResponse.redirect(`${origin}${next}`)
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  // Exchange the code for a session
  // The PKCE code verifier is automatically read from the cookie
  // that was set when the magic link was requested
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('Auth callback: code exchange failed', exchangeError)
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  // Success! Cookies are set on the response, redirect to dashboard
  return response
}
