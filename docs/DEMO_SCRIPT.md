# Discipline OS — Demo Script (PRD §17)

A 5-minute walkthrough of the system for the cohort lead
or a prospect. Designed to mirror PRD §17's "presentation
narrative" — the four-act story of premium members with
execution needs, not another content feed.

## Pre-flight

Before the demo:

1. **Seed the demo data** (the script lives in
   `scripts/seed-demo.sql` if you want one; otherwise do
   this by hand):
   - One cohort, status='active', start_at = today.
   - 3 teams of 3 members each. Each member has completed
     the last 5 days of required blocks at varying rates
     so the leaderboard shows distinct ranks.
   - 2 reports, pinned in the library. v3 and v1, so the
     stale-content banner can demonstrate the Phase 9b
     behavior.
2. **Open three browser windows** (or three profiles):
   - Admin: `/admin/members`, `/admin/teams`, `/admin/schedule`.
   - Team lead: `/team`, `/team/chat`.
   - Member (you, the demoer): `/dashboard`, `/leaderboard`,
     `/reports`.
3. **Have a second device** (or a Safari tab in standalone
   mode) for the iOS install-hint demo. Without one, the
   iOS block is a screenshot.

## The four acts

### Act 1 — The problem (45s)

> "Premium members don't need more content. They need
> structure, accountability, and a way to know they're
> on track without broadcasting it."

Show the **landing page** (`/`). Note the four-step
"How it works" — the first three sentences are the value
prop, the fourth is the boundary. Then jump to the
**admin surface** (`/admin/members`): "This is what the
cohort lead sees. No vanity metrics, no engagement farm.
Just the people we provisioned, the teams we assembled,
the schedule we set."

### Act 2 — The schedule (60s)

> "Every member gets the same local-time schedule. The
> cutoff is per-cohort. The leaderboard is a scoreboard,
> not a feed."

Open the **member dashboard** (`/dashboard`). Point at:
- The cohort name + day number ("Day 14 of 30").
- The completion bar — required + critical distinction.
- The "Up next" card (the next required block the member
  hasn't done yet).
- The **sync status indicator** below the timezone (Phase
  9a). If you've toggled DevTools offline + completed a
  block, it shows "1 completion pending · queued 30s ago".

Switch to **Settings → Style preset** and click through
the 6 themes. PRD §7.8: each preset is a different
*system* (palette + density + font + shape + motion +
kerning), not just a different color. End on "Arc" — the
editorial cards, the wide letter-spacing, the slow
transition timing all match.

### Act 3 — The accountability loop (90s)

> "Schedule → streak → leaderboard → team progress →
> reports → next day."

Open the **leaderboard** (`/leaderboard`). Click through
the 3 tabs: "All members", "My team", "This week". The
"Week" view is the one that keeps a 3-week-in cohort from
getting stale — it ranks by this-week's check-ins, not
the 3-week cumulative streak.

Open the **team room** (`/team`). The progress log is
the team's accountability surface — short updates with
an Update / Blocker / Milestone / Idea category.

Open the **team chat** (`/team/chat`). The badge on the
chat header shows unread messages since the member last
viewed (Phase 6b). The realtime channel goes green
("Live") when the Supabase WebSocket connection is up.

Open a **report** (`/reports`, then into a v3 report). If
the live version is v4, the Phase 9b VersionBadge shows
"A newer version is available" with a Refresh button. The
5-report offline cache is configured via
`lib/offline/reports-cache.ts`; the SaveOfflineButton
below the body adds the report to the SWR cache for
offline reading.

### Act 4 — The boundary (45s)

> "Privacy-first RLS. Controlled cohort access. Secure
> OTP. Two-device protection. The system makes the
> standard visible; it doesn't make the member's
> inconsistencies public."

Three things to demo:

1. **Two-device login flow.** On a second device (or
   incognito), start the login flow. The first device
   gets a "Device limit reached — pick a session to
   revoke" picker (Phase 6c). The user can keep both
   or sign out the older one.
2. **iOS install hint.** On Safari iOS, tap "Enable
   notifications". The Phase 9c hint walks the user
   through Share → Add to Home Screen (iOS 16.4+;
   web push only works in standalone mode).
3. **Privacy.** Click on `/profile`. The reflection text
   is in the daily check-in, not on the leaderboard. The
   leaderboard shows streaks + completion + days — never
   the reflection.

## Closing line

> "The winning experience is not the number of screens.
> It is the moment a member opens the app, sees the
> next commitment in local time, completes it in one
> tap, knows exactly where they stand, and returns
> tomorrow because the system has made their standard
> visible."

(Pulled verbatim from PRD §17's "Final product statement".)

## Recovery scripts (if the demo breaks)

- `bash scripts/backup.sh` — local backup, idempotent.
- `npx vitest run` — 423+ tests should pass before the
  demo. If something fails, the test name is the bug.
- `npx playwright test` (Phase 9d) — boots the dev
  server, runs the smoke spec. Use this if a page doesn't
  render.
