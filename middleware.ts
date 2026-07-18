import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveRequestId, REQUEST_ID_HEADER } from './lib/request-context'

export async function middleware(request: NextRequest) {
  // Resolve (or generate) a request id and stamp it on the response so
  // every protected page, every API call, and every static asset gets
  // a correlation id.
  const requestId = resolveRequestId(request)
  let response = NextResponse.next({ request })
  response.headers.set(REQUEST_ID_HEADER, requestId)

  // Build a Supabase client bound to the request/response cookie jars.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value)
          })
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const protectedPath =
    path.startsWith('/dashboard') ||
    path.startsWith('/schedule') ||
    path.startsWith('/tracker') ||
    path.startsWith('/leaderboard') ||
    path.startsWith('/team') ||
    path.startsWith('/community') ||
    path.startsWith('/reports') ||
    path.startsWith('/settings') ||
    path.startsWith('/profile')

  if (protectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url), {
      headers: { [REQUEST_ID_HEADER]: requestId }
    })
  }
  if (path.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url), {
      headers: { [REQUEST_ID_HEADER]: requestId }
    })
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/auth).*)']
}
