# Next Integration Executed

Implemented the first audit remediation track:

- Server Supabase client using cookie-aware `@supabase/ssr`.
- Browser Supabase client using `createBrowserClient`.
- Global middleware refreshes auth cookies and redirects unauthenticated protected routes.
- Authenticated route layout verifies the server session.
- Admin route layout verifies the server session and `profiles.role === 'admin'`.
- Health route remains public for deployment monitoring.

## Important deployment behavior

The middleware and layouts require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Until those variables exist, local auth-protected routes will redirect or fail to initialize by design. This is expected and prevents accidentally running protected routes without an auth backend.

## Next remediation track

Replace the login/verify screens with real Supabase OTP calls, then replace admin placeholder APIs with server-side authenticated writes.
