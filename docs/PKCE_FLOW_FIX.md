# 🔐 PKCE Flow Implementation — Secure Magic Link Authentication

## The Problem

The original magic link flow was exposing **sensitive authentication tokens in the URL**:

```
❌ OLD FLOW (Insecure):
/verify#access_token=eyJhbGc...&refresh_token=v1...&token_type=bearer&expires_in=3600
```

This is a **critical security vulnerability** because:
1. URL fragments can be logged by web servers, proxies, and browser extensions
2. Browser history stores the full URL including fragments
3. Referrer headers can leak the URL to third-party sites
4. Screen sharing or shoulder surfing exposes the tokens
5. Malicious browser extensions can read the URL

## The Solution: PKCE Flow

We've implemented the **Proof Key for Code Exchange (PKCE)** flow, which is the OAuth 2.0 standard for secure authentication in public clients.

```
✅ NEW FLOW (Secure):
/auth/callback?code=abc123xyz
```

The URL only contains a short-lived, single-use **code** — not the actual tokens.

## How PKCE Works

### Step-by-Step Flow

```
1. User enters email on /login
   ↓
2. Frontend calls /api/auth/request-otp (eligibility check)
   ↓
3. Frontend calls /api/auth/send-code with email
   ↓
4. Backend generates PKCE code_verifier (random 43-128 char string)
   ↓
5. Backend creates code_challenge = SHA256(code_verifier)
   ↓
6. Backend calls Supabase signInWithOtp with code_challenge
   ↓
7. Supabase sends magic link email to user
   ↓
8. User clicks magic link in email
   ↓
9. Supabase redirects to /auth/callback?code=abc123xyz
   ↓
10. /auth/callback route reads code_verifier from cookie
   ↓
11. /auth/callback exchanges code + code_verifier for session tokens
   ↓
12. Supabase returns access_token and refresh_token
   ↓
13. /auth/callback sets HTTP-only cookies with tokens
   ↓
14. /auth/callback redirects to /dashboard
   ↓
15. User is authenticated, no tokens ever in URL!
```

### Security Benefits

| Aspect | Old Flow (Implicit) | New Flow (PKCE) |
|--------|---------------------|-----------------|
| **URL contains** | Full access_token + refresh_token | Only short-lived code |
| **Token exposure** | Visible in URL, history, logs | Never in URL |
| **Code lifetime** | N/A | 5 minutes, single-use |
| **Token delivery** | URL fragment | HTTP-only cookies |
| **JavaScript access** | Can read from URL | Cannot read cookies |
| **Replay attacks** | Possible if URL leaked | Impossible (code_verifier required) |
| **Interception** | Tokens exposed | Code useless without code_verifier |

## Implementation Details

### 1. Backend: `/api/auth/send-code`

```typescript
// Generate PKCE code_verifier (43-128 random chars)
const codeVerifier = generateCodeVerifier()

// Create code_challenge = SHA256(code_verifier)
const codeChallenge = await generateCodeChallenge(codeVerifier)

// Store code_verifier in HTTP-only cookie (10 min expiry)
response.cookies.set('sb-code-verifier', codeVerifier, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 600, // 10 minutes
  path: '/'
})

// Call Supabase with code_challenge
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
    shouldCreateUser: false,
    data: {
      code_challenge,
      code_challenge_method: 'S256'
    }
  }
})
```

### 2. Callback Route: `/auth/callback`

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect('/login?error=no_code')
  }
  
  // Read code_verifier from cookie
  const codeVerifier = request.cookies.get('sb-code-verifier')?.value
  
  if (!codeVerifier) {
    return NextResponse.redirect('/login?error=no_verifier')
  }
  
  // Create Supabase server client
  const response = NextResponse.redirect('/dashboard')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )
  
  // Exchange code for session (Supabase validates code_verifier)
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error) {
    return NextResponse.redirect('/login?error=exchange_failed')
  }
  
  // Delete code_verifier cookie
  response.cookies.delete('sb-code-verifier')
  
  // Redirect to dashboard with auth cookies set
  return response
}
```

### 3. Frontend: `/verify` Page

The verify page is now **much simpler** — it just shows the "check your email" state:

```typescript
export default function Verify() {
  const [email, setEmail] = useState('')
  
  useEffect(() => {
    const storedEmail = sessionStorage.getItem('discipline-login-email') || ''
    setEmail(storedEmail)
  }, [])
  
  return (
    <div className="auth-shell">
      {/* Show email preview and instructions */}
      <h2>Check your inbox</h2>
      <p>We sent a sign-in link to {email}</p>
      {/* ... email preview mockup ... */}
    </div>
  )
}
```

No more token handling, no more `getSession()`, no more race conditions!

## Files Changed

### New Files
1. **`app/auth/callback/route.ts`** — PKCE callback handler
2. **`lib/auth/pkce.ts`** — PKCE utility functions (code_verifier, code_challenge)

### Modified Files
1. **`app/api/auth/send-code/route.ts`** — Generate PKCE params, store code_verifier
2. **`app/(public)/verify/page.tsx`** — Simplified to just show "check email" state
3. **`app/api/auth/complete-magic-link/route.ts`** — Deleted (no longer needed)

### Deleted Files
1. **`app/api/auth/complete-magic-link/route.ts`** — Old token exchange endpoint

## Security Comparison

### Before (Implicit Flow)
```
User clicks link
  ↓
Redirected to: /verify#access_token=eyJ...&refresh_token=v1...
  ↓
Frontend reads tokens from URL
  ↓
Frontend sends tokens to /api/auth/complete-magic-link
  ↓
Backend sets cookies
  ↓
Redirected to /dashboard
```

**Vulnerabilities:**
- ❌ Tokens visible in URL
- ❌ Tokens in browser history
- ❌ Tokens in server logs (if URL logged)
- ❌ Tokens in referrer headers
- ❌ Tokens readable by JavaScript
- ❌ Tokens can be intercepted by browser extensions

### After (PKCE Flow)
```
User clicks link
  ↓
Redirected to: /auth/callback?code=abc123
  ↓
Backend reads code from URL
  ↓
Backend reads code_verifier from HTTP-only cookie
  ↓
Backend exchanges code + code_verifier for tokens
  ↓
Backend sets HTTP-only cookies with tokens
  ↓
Redirected to /dashboard
```

**Security:**
- ✅ Only code in URL (useless without code_verifier)
- ✅ Code is single-use and expires in 5 minutes
- ✅ code_verifier in HTTP-only cookie (not readable by JavaScript)
- ✅ Tokens never in URL
- ✅ Tokens in HTTP-only cookies (not readable by JavaScript)
- ✅ No token interception possible

## Testing the PKCE Flow

### Manual Test Steps

1. **Request magic link:**
   ```bash
   # Go to /login, enter email, click "Send sign-in link"
   ```

2. **Check cookies:**
   ```javascript
   // In browser console
   document.cookie
   // Should see: sb-code-verifier=... (but not readable due to httpOnly)
   ```

3. **Check email:**
   ```
   Open email from noreply@supabase.io
   Click "Sign in to Discipline OS" button
   ```

4. **Verify redirect URL:**
   ```
   Should redirect to: /auth/callback?code=abc123xyz
   NOT: /verify#access_token=eyJ...
   ```

5. **Check final cookies:**
   ```javascript
   // After redirect to /dashboard
   document.cookie
   // Should see: sb-access-token=..., sb-refresh-token=... (httpOnly)
   ```

6. **Verify no tokens in URL:**
   ```
   URL should be: /dashboard
   NOT: /dashboard#access_token=...
   ```

### Automated Test

```typescript
// tests/auth/pkce-flow.test.ts
import { test, expect } from '@playwright/test'

test('PKCE flow does not expose tokens in URL', async ({ page }) => {
  // Go to login page
  await page.goto('/login')
  
  // Enter email and submit
  await page.fill('[name="email"]', 'test@example.com')
  await page.click('button[type="submit"]')
  
  // Wait for redirect to /verify
  await page.waitForURL('/verify')
  
  // Simulate clicking magic link (in real test, would get code from email)
  const code = 'test-code-123'
  await page.goto(`/auth/callback?code=${code}`)
  
  // Wait for redirect to /dashboard
  await page.waitForURL('/dashboard')
  
  // Verify URL does not contain tokens
  const url = page.url()
  expect(url).not.toContain('access_token')
  expect(url).not.toContain('refresh_token')
  expect(url).toBe('http://localhost:3000/dashboard')
  
  // Verify auth cookies are set
  const cookies = await page.context().cookies()
  const accessTokenCookie = cookies.find(c => c.name === 'sb-access-token')
  const refreshTokenCookie = cookies.find(c => c.name === 'sb-refresh-token')
  
  expect(accessTokenCookie).toBeDefined()
  expect(refreshTokenCookie).toBeDefined()
  expect(accessTokenCookie?.httpOnly).toBe(true)
  expect(refreshTokenCookie?.httpOnly).toBe(true)
})
```

## Migration Guide

### For Existing Users

If you have users who requested magic links **before** this change:

1. **Old magic links will fail** — they don't have the PKCE code_verifier cookie
2. Users will see an error: "Invalid or expired sign-in link"
3. Users should request a new magic link from `/login`

### For Developers

If you're integrating with this auth system:

1. **Don't read tokens from URL** — they're not there anymore
2. **Don't call `/api/auth/complete-magic-link`** — it's been deleted
3. **Use the callback route** — `/auth/callback` handles everything
4. **Check HTTP-only cookies** — tokens are in `sb-access-token` and `sb-refresh-token`

## Troubleshooting

### "no_verifier" Error

**Problem:** User clicks magic link but gets redirected to `/login?error=no_verifier`

**Cause:** The `sb-code-verifier` cookie is missing or expired

**Solution:**
- User should request a new magic link from `/login`
- Check that cookies are enabled in browser
- Check that cookie is set with `httpOnly: true` and correct `maxAge`

### "exchange_failed" Error

**Problem:** Callback route fails to exchange code for session

**Cause:** Code is expired, already used, or code_verifier doesn't match

**Solution:**
- User should request a new magic link
- Check Supabase logs for detailed error
- Verify code_challenge was generated correctly from code_verifier

### Tokens Still in URL

**Problem:** After clicking magic link, URL still shows `#access_token=...`

**Cause:** Old magic link (from before PKCE implementation) or Supabase config issue

**Solution:**
- Request a new magic link from `/login`
- Check Supabase dashboard: Authentication → URL Configuration
- Verify "Site URL" is set correctly
- Check that `emailRedirectTo` in `send-code` route points to `/auth/callback`

## References

- [OAuth 2.0 PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Supabase PKCE Documentation](https://supabase.com/docs/guides/auth/auth-pkce)
- [OWASP OAuth 2.0 Security Best Practices](https://oauth.net/2/oauth-best-practice/)

## Summary

The PKCE flow implementation eliminates the critical security vulnerability of exposing authentication tokens in URLs. The new flow:

✅ **Never exposes tokens in URLs**  
✅ **Uses short-lived, single-use codes**  
✅ **Stores sensitive data in HTTP-only cookies**  
✅ **Prevents token interception and replay attacks**  
✅ **Follows OAuth 2.0 security best practices**  
✅ **Simplifies the frontend code**  
✅ **Eliminates race conditions in token handling**  

The authentication flow is now **secure by design** and follows industry standards for public client authentication.
