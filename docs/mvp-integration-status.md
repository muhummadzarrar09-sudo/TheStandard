# MVP Integration Status

The remaining Phase 5 wiring surfaces now exist:

- Admin guard helper
- Admin member API boundary
- Enrollment API boundary
- Report publishing API boundary
- CSV export endpoint
- Team milestone schema and RLS

Before production, replace the API boundary implementations with authenticated server-side Supabase operations. These endpoints intentionally return safe placeholders until environment variables and the Supabase project are connected; the browser must never be trusted for admin authorization.

## MVP launch order

1. Configure Node 22 on Vercel.
2. Add Supabase/VAPID variables.
3. Apply migrations 001–003.
4. Deploy Edge Functions.
5. Connect API handlers to server Supabase client and admin guard.
6. Seed one cohort, one schedule template, and one test team.
7. Run auth/RLS/offline/push staging tests.
8. Deploy Preview, validate, then promote Production.
