# Supabase Setup — Magic Link Configuration (Free Tier)

You're on Supabase Free tier. Here's exactly what you need to do and what you CAN'T do.

## What Free tier gives you

- ✅ Default Supabase email sender (works, limited to **3 emails per hour per address**)
- ✅ Default magic link email template (can't customize, but it works fine)
- ✅ Row Level Security, auth, all the core features
- ❌ Custom SMTP (needs Pro)
- ❌ Custom email templates (needs Pro)
- ❌ Higher rate limits (needs Pro)

**3 emails per hour** is fine for a private paid cohort — members only need one
magic link per login session. If they spam the button 4+ times in an hour,
the 4th request will fail. The login page will show the error message.

## Step 1: Site URL + Redirect URLs

1. **Supabase Dashboard → Authentication → URL Configuration**
2. Set **Site URL**: `https://your-vercel-app.vercel.app` (or `http://localhost:3000` for dev)
3. Add **Redirect URLs** — click "Add URL" for each:
   ```
   https://your-vercel-app.vercel.app/auth/callback
   https://your-vercel-app.vercel.app/auth/confirm
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/confirm
   ```

**WHY both `/auth/callback` AND `/auth/confirm`:** Supabase's Free-tier default
email template sends magic links with URLs that sometimes hit `/auth/confirm`
and sometimes `/auth/callback`. Both handlers in this project support both
URL patterns (the `code` PKCE format AND the `token_hash+type` implicit format).

## Step 2: Disable "Confirm email" (recommended for Free tier)

1. **Supabase Dashboard → Authentication → Providers → Email**
2. Turn OFF **Confirm email**

Why? Because on Free tier, the confirmation email ALSO uses the default sender.
If you leave it ON, the user gets TWO emails — one magic link, one confirmation.
That's confusing and wastes your 3-per-hour limit. Just turn it off.

## Step 3: Don't touch email templates

You can't customize them on Free tier anyway. The default template looks like:

```
Click this link to log in to The Standard:
[link URL]
```

It's plain, but it works. When you upgrade to Pro, you can make it pretty.

## Step 4: Ensure profiles exist

Free tier doesn't change this — you still need:
1. User in **Supabase Authentication → Users** (admin creates them)
2. Matching row in `public.profiles` with `role='member'`, valid `cohort_id`
3. Valid `access_start_at` and `access_end_at` dates

The login page has `shouldCreateUser: false` — ONLY pre-created users can get
a magic link. Nobody can sign themselves up.

## Step 5: Environment variables in Vercel

1. **Vercel Dashboard → Project → Settings → Environment Variables**
2. Add these (same values from your old project):
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
   NEXT_PUBLIC_SITE_URL          = https://your-vercel-app.vercel.app
   ```
3. Add `SUPABASE_SERVICE_ROLE_KEY` for **Production only** (NOT Preview unless needed)
4. **Redeploy** after adding env vars

## Free-tier rate limits

| Action | Free tier limit |
|--------|----------------|
| Magic link emails | 3 per hour per email address |
| Auth requests | 30 per minute per IP |
| Database rows | 500K total |
| Storage | 1 GB |

For a 30-person cohort over 30 days, this is completely fine.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Email rate limit exceeded" | User clicked "Send magic link" 4+ times in an hour | Free tier limit. Wait 1 hour, or upgrade to Pro |
| Link arrives but shows error | `token_hash` or `code` expired | Magic links expire after 24h. Request a new one |
| Link arrives but redirects to login | Session wasn't set properly | This project handles both URL formats now ✅ |
| Link doesn't arrive | Default sender blocked by spam filter | Check spam. Add Supabase's sender to allowlist |
| "User not found" error | `shouldCreateUser: false` + no auth user | Admin must create user in Supabase first |
