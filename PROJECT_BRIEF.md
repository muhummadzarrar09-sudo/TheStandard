# TheStandard — Project Brief

**TheStandard** is a private, discipline-focused web app (a “Discipline OS”) for customers who purchase access to a structured personal-performance program.

## What the app does

- Authenticates admins and customers through Supabase email OTP.
- Grants access only to enrolled users whose access window is currently active.
- Organizes users into cohorts and teams.
- Provides daily schedules, check-ins, commitments, progress tracking, milestones, reports, leaderboard features, and team/community communication.
- Supports offline report saving and device/session management.
- Gives admins dashboards for enrollment, members, cohorts, schedules, teams, analytics, reports, and exports.

## Current setup/workflow

1. A user is created in **Supabase Authentication → Users**.
2. A matching row is added to `public.profiles` using the same Auth user UUID.
3. Admins use `role = 'admin'`; paying customers use `role = 'member'`.
4. Customers are assigned to an active cohort with valid `access_start_at` and `access_end_at` dates.
5. The user enters their email on the deployed app, receives a six-digit OTP, and signs in.
6. The server checks enrollment using the Supabase service-role client, then verifies the OTP and creates the authenticated session.

## Technology

- Next.js 16, React 19, TypeScript
- Supabase Auth, PostgreSQL, Row Level Security, and server APIs
- Vercel deployment
- npm lockfile-based production installation with `npm ci`

## Recent fixes

- Regenerated `package-lock.json` with optional native dependencies so Vercel builds successfully.
- Fixed pre-login enrollment lookup to use the server-only `SUPABASE_SERVICE_ROLE_KEY`, allowing enrolled users to request OTPs despite anonymous RLS restrictions.

## Environment variables

The required Supabase variables have been copied into Vercel with the correct values and should be enabled for the relevant deployment environments:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-or-secret-key
```

After changing Vercel environment variables, a new deployment is required for the changes to take effect. The service-role key is used only by server-side API routes for pre-login enrollment checks and OTP verification.

## Important security rules

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Keep it only in Vercel server environment variables.
- Keep customers as `member` and reserve `admin` for trusted staff.
- Configure SMTP in Supabase before sending OTPs to a larger customer base.
