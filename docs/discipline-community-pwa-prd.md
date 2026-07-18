# Discipline & Community PWA
## Comprehensive MVP Product Requirements Document

**Status:** Draft for Monday client presentation  
**Audience:** Mustafa, creator/community team, product, design, engineering  
**Date:** 17 July 2026  
**Product type:** Installable Progressive Web App companion to a paid Whop community

---

## 1. Executive Summary

This product is a private, premium companion app for a 30-day cohort. The separate Whop community remains the home for the full community and conversation; this app is the member's daily operating system for disciplined execution.

The product must do more than record habits. It should make the day's expectations visible, reduce the friction of completing them, surface accountability, and connect individual discipline to a team startup outcome.

The MVP's defining feature is the **Strict Daily Schedule**: a local-time, fixed-block day view that members actively complete. Schedule completion powers individual streaks and consistency rankings. Team progress gives the discipline engine a meaningful destination: members are not only trying to maintain a streak, but building one idea together during their access window.

### Product promise

> A structured 30-day execution system that turns daily commitments into visible progress, team accountability, and a startup-building cadence.

This is confident but not a guaranteed-success product. Copy should describe structure, consistency, and execution—not promise wealth or success outcomes.

---

## 2. Product Principles

1. **Discipline over decoration.** Every screen should help a member decide, act, or review.
2. **Fast daily use.** A member should be able to see today's plan and record progress in seconds.
3. **Visible consequence.** Missed required blocks should be unmistakable; the system should not quietly forgive or hide them.
4. **Healthy pressure, not humiliation.** Rankings emphasize consistency and team contribution, never public shaming.
5. **Premium restraint.** No ads, clutter, novelty badges, or generic habit-app language.
6. **Private by default.** Personal data is private; only intentionally shared team/community data is visible to others.
7. **Template now, adaptable later.** The schedule engine must support future adaptive scheduling without requiring a rewrite of the member experience.
8. **Offline-resilient.** Members can view recent reports and today's schedule with inconsistent connectivity; queued actions sync safely when online.

---

## 3. Goals and Non-Goals

### MVP goals

- Give each member a clear, local-time daily schedule.
- Make completion of schedule blocks and weekly commitments quick and satisfying.
- Calculate transparent streak and consistency metrics.
- Create accountability through a consistency-first leaderboard.
- Group members into teams of 3–4 and track a shared startup idea and progress log.
- Provide a read-only community/activity mirror, not a replacement for the separate Whop community.
- Publish and cache interview reports/presentations.
- Send daily reminders and new-report notifications.
- Enforce passwordless OTP enrollment, rate limits, expiry, and a two-device limit.
- Allow six visual presets without changing the underlying product behavior.

### Explicit non-goals for MVP

- Replacing Whop-wide chat, DMs, billing, or the full community experience. The MVP does include limited private team chat for assigned groups.
- Real-time adaptive scheduling based on external APIs or behavioral algorithms.
- A public social network.
- A generic habit library or user-created schedule marketplace.
- Guaranteed outcomes, financial advice, or investment functionality.
- Admin analytics beyond the minimum content/member operations needed to run the cohort.

---

## 4. Target Users and Jobs to Be Done

### Cohort member

A paying member in a 30-day timed cohort.

**Job:** “Tell me exactly what I need to do today, let me record it without friction, and make it obvious whether I am keeping my commitment.”

### Team member

A member collaborating with 2–3 peers on one startup idea.

**Job:** “Show me what my team agreed to build, what changed since yesterday, and what I personally owe the team next.”

### Admin/creator

The creator or operator publishing reports, managing cohorts, assigning teams, and monitoring delivery.

**Job:** “Run a disciplined cohort without manually chasing every member, and publish high-value interview insights in a reliable place.”

---

## 5. MVP Information Architecture

Primary navigation:

1. **Today** — schedule, completion, daily check-in, streak status.
2. **Team** — idea, members, shared progress, team commitments.
3. **Leaderboard** — consistency rankings and cohort/team filters.
4. **Community** — read-only updates and activity mirror.
5. **Reports** — interview reports/presentations, saved for offline viewing.
6. **Settings** — theme preset, notification preferences, timezone, active devices, sign out.

The default landing destination is **Today**, not the community feed. The app should orient members toward action.

---

## 6. Core User Flows

### 6.1 First access and authentication

1. Email is captured by the existing external Typeform-style enrollment form.
2. The email is provisioned/eligible in Supabase for the cohort.
3. Member opens the PWA and enters email.
4. Backend checks eligibility and whether the cohort enrollment window is open.
5. If eligible, a six-digit OTP is sent by email.
6. Member enters the code; code is verified server-side.
7. On first successful login, device timezone is captured using the browser's built-in `Intl.DateTimeFormat().resolvedOptions().timeZone`.
8. Device/session is registered.
9. Member sees a short orientation: 30-day window, schedule expectations, notification permission, team status, and timezone.

**Enrollment rules:**

- No new OTP is issued or accepted for new signups after enrollment closes.
- Existing enrolled members can continue logging in during their access window, subject to cohort policy.
- Unused OTP challenges are invalidated automatically when the enrollment window closes.
- Admin-created members after close can be activated manually in Supabase/admin tooling.

### 6.2 Daily execution

1. Member opens Today.
2. App shows current local date, cohort day number, streak, completion percentage, and next block.
3. Member marks blocks complete with one tap.
4. Completed blocks receive a timestamp and sync status.
5. Required blocks not completed by the daily cutoff are marked missed; the day is not silently repaired.
6. At the reflection block, member completes the daily check-in: one required confirmation plus optional short note.
7. Day completion and streak status update immediately.

### 6.3 Team progress

1. Member opens Team.
2. They see team name, startup idea, members, current objective, and latest progress entries.
3. Member adds their own contribution/update, subject to the team's sharing rules.
4. Team members can see shared team content only—not private personal check-in notes.
5. Admin can assign teams and edit the canonical idea/title.

### 6.4 Reports

1. Member opens Reports.
2. Latest report is featured with title, interviewee, date, summary, and media/presentation link.
3. Member opens a report and can save/cache it for offline viewing.
4. App caches the most recent reports using Cache Storage/service worker; content includes a version and last-updated timestamp.
5. If offline, the app clearly labels cached content and queues no unsupported actions.

### 6.5 Device-limit flow

- Maximum active sessions per email: **2**.
- A third login attempt shows the two active devices with last-seen times and approximate device labels.
- Member must choose one session to revoke before the new session is created.
- The revoked device is invalidated on its next authenticated request and should show a clear sign-out message.
- Device fingerprinting is privacy-conscious: use a server-issued device ID stored locally plus coarse metadata, not invasive fingerprint collection.

---

## 7. Feature Requirements

## 7.1 Strict Daily Schedule — P0 / signature feature

### Default schedule template

| Local time | Block | Required? |
|---|---|---:|
| 05:00–05:30 | Wake, hydrate, light movement | Yes |
| 05:30–06:30 | Exercise | Yes |
| 06:30–07:00 | Meal | Yes |
| 07:00–09:00 | Deep work block 1 | Yes |
| 09:00–09:15 | Break | Yes |
| 09:15–11:15 | Deep work block 2 | Yes |
| 11:15–12:00 | Review latest interview/report; apply one takeaway | Yes |
| 12:00–13:00 | Lunch / rest | Yes |
| 13:00–15:00 | Deep work block 3 — team/startup progress | Yes |
| 15:00–15:30 | Break | Yes |
| 15:30–17:00 | Community/team engagement | Yes |
| 17:00–18:00 | Wind-down movement | Yes |
| 18:00–19:00 | Dinner | Yes |
| 19:00–20:00 | Reflection + plan tomorrow; daily check-in | Yes |
| 20:00–21:00 | Personal time | No / protected |
| 21:00 onward | Wind down for sleep | No / informational |

### Functional behavior

- Render a Google Calendar-style day timeline with a current-time indicator.
- Use the member's IANA timezone and display the timezone explicitly in Settings and on Today.
- Store schedule templates as data: version, timezone behavior, blocks, required flag, cutoff policy, and cohort association.
- Do not hardcode blocks into the UI.
- Support states: upcoming, active, completed, missed, skipped/optional, offline-pending.
- Allow a member to open a block for its instruction and mark it complete.
- A completion must be idempotent: repeated taps cannot create duplicate records.
- The schedule day is based on the member's local calendar date, with a clearly defined cohort-day boundary.
- Day cutoff: default 03:00 local time the following day, configurable by admin. After cutoff, required uncompleted blocks become missed.
- A missed required block breaks the active daily streak. Historical records remain immutable except through an auditable admin correction.

### Product decision to confirm in presentation

The MVP needs one explicit “strictness” policy. Recommended: **all required blocks matter, but the daily check-in and the three deep-work/team blocks are highlighted as Critical.** The score can show both “required completion” and “critical completion” so members understand the consequence without reducing the day to a single opaque number.

## 7.2 Discipline tracker and streaks — P0

- Daily completion percentage.
- Current consecutive-day streak.
- Best streak during cohort.
- Weekly completion score tied to the cohort's learning module/commitment.
- Daily check-in with required completion state and optional reflection.
- Weekly review at the end of each cohort week.
- Visual completion treatment should feel earned, not childish.

### Recommended scoring model

- `day_complete = 1` only when all required blocks are complete by cutoff.
- `critical_day_complete = 1` when all Critical blocks are complete.
- `daily_completion_pct = completed_required / total_required`.
- Streak increments on `day_complete`; any missed required block breaks the active streak.
- Leaderboard ranking: current streak descending, then cohort completion percentage, then number of completed days, then stable join-time tie-breaker.
- Never expose private reflection text or raw sensitive behavior data on the leaderboard.

## 7.3 Leaderboard — P0

- Cohort-wide ranking with display name/avatar or approved alias.
- Filters: all members, team view, current week.
- Show current streak, completion percentage, and last active day.
- Show the member's own rank even if outside the top visible list.
- No vanity counters, follower counts, or public missed-task shaming.
- Include a short explanation of ranking logic.
- Handle ties consistently and fairly.

## 7.4 Team / Startup Mode — P0

- Admin assigns 3–4 members to a team.
- Team has name, startup idea, one-line problem statement, current objective, status, and created/updated dates.
- Shared progress log with author, timestamp, category, and text/link attachment where supported.
- Each member can submit a personal contribution linked to the team.
- Team view shows completion cadence and latest updates, without exposing private individual reflections.
- Team members can propose an idea update; admin approval is recommended for the canonical idea in MVP.
- Empty states must be purposeful: “Your team assignment is being finalized” rather than a broken-looking screen.

### Team chat — P0 signature feature

Include a private, real-time chat channel for each assigned team. This is intentionally narrower than a general community chat product.

- One chat channel per team; only active team members and authorized admins can read or post.
- Text messages only for MVP, with optional links; no file uploads, voice, video, reactions, threads, or DMs initially.
- Show sender display name, timestamp, delivery state, edited/deleted state, and unread count.
- Support pagination/history, optimistic send, retry, and reconnect states.
- New messages may trigger push notifications, but notification bodies must avoid sensitive content and respect quiet hours.
- Members can edit or delete their own recent messages within a defined window; deleted messages remain as an audit tombstone where required.
- Report message, mute team notifications, and block abusive notification noise.
- Admin can remove messages, mute a member from team chat, archive a team, and view an audit log.
- Team chat access ends when the member's app access ends, subject to a configurable read-only grace period.
- Do not expose private reflections, personal schedule details, or leaderboard internals in chat automatically.

**Recommended chat boundary:** team chat is the execution room; Whop remains the wider community discussion space.

## 7.5 Community mirror — P0

- Read-only feed of selected Whop/community activity and official updates.
- Content types: announcement, milestone, prompt, interview notice, cohort update.
- Reverse chronological feed with pinned items.
- No general community chat, DMs, reactions, or broad social moderation system in MVP; private team chat is scoped separately above.
- Every item has source/date and may include a manually configured external community link when relevant.

## 7.6 Reports and presentations — P0

- Report library with latest, featured, and archive states.
- Metadata: title, interviewee, published date, summary, tags, media/presentation URL, cover image, version.
- Readable report detail page with mobile-first typography.
- Offline cache of the latest configurable number; default 5 reports.
- Service worker precaches app shell and runtime-caches report data/assets with stale-while-revalidate behavior.
- Offline state must be visible; stale content must never appear as newly published.
- Admin publication must invalidate/update caches through content versioning.

## 7.7 Notifications — P0

- Daily reminder at a member-configured local time; default 19:00 before reflection/check-in.
- Optional reminders before critical blocks.
- New report/interview notification.
- Team update notification, if enabled.
- Notification preferences per category.
- Store push subscriptions per device/session and remove invalid subscriptions.
- Use a server-side push sender with VAPID keys; never put private keys in the client.
- Ask permission in context after orientation, not on first paint.
- iOS Safari web push requires iOS/iPadOS 16.4+ and installation to the Home Screen; show this as a known limitation with an actionable setup hint.

## 7.8 Six toggleable style presets — P1 but part of MVP shell

All presets use the same components and data, but each changes visual hierarchy, density, typography, motion, and component treatment—not merely colors.

| Preset | Direction | Best emphasis |
|---|---|---|
| Whoop/Oura | Dark, premium, sparse, large single metrics | Today / discipline |
| Linear | Sharp, monochrome, compact, keyboard-friendly | Fast navigation / execution |
| Duolingo | Playful progress, streak emphasis, energetic states | Motivation / leaderboard |
| Robinhood-inspired | Clean fintech hierarchy, confident type, restrained color | Metrics / progress |
| Arc-inspired | Bold color fields, editorial cards, members-club feel | Discovery / reports |
| Discord-inspired | Dense channel/feed structure and strong navigation rail | Community mirror |

Default: **Whoop-style base shell with Duolingo-style streak/progress mechanics.**

Theme choice is persisted per user/device, has accessible contrast, and never changes meaning or permissions. Avoid copying proprietary assets, logos, exact layouts, or brand-specific typefaces.

---

## 8. Authentication, Security, and Privacy

### Authentication

- Supabase Auth with email OTP code only; no magic links.
- Six-digit codes, short expiry (recommended 10 minutes), single use.
- Server-side eligibility and enrollment-window checks on both issuance and verification.
- OTP attempt limit: recommended 5 failed attempts per challenge/email/IP window, then 10-minute lockout.
- Generic error messages to reduce account enumeration.
- Prevent replay, duplicate verification, and race-condition session creation.

### Authorization / RLS

- Supabase Row Level Security enabled on all member-facing tables.
- Member can read/update only their own private profile, sessions, check-ins, and reflections.
- Member can read leaderboard-safe projection only.
- Team members can read their team's shared records; writes are limited to permitted team content.
- Reports and official community posts are readable only by eligible cohort members.
- Admin operations use a protected server-side role/service key, never a client-exposed key.
- Validate all writes server-side; do not trust client-supplied user IDs, streaks, ranks, cohort IDs, or timestamps.
- Audit admin corrections, content publication, team assignment, session revocation, and schedule changes.

### Privacy

- Store minimal device metadata.
- Provide sign-out-all-devices.
- Avoid collecting precise location; timezone is sufficient.
- Explain leaderboard visibility and team-sharing boundaries during onboarding.
- Define retention/deletion policy before launch, especially after a cohort access window ends.

---

## 9. Data Model (MVP)

Suggested Supabase tables:

- `profiles`: `id`, `email`, `display_name`, `avatar_url`, `cohort_id`, `join_at`, `access_start_at`, `access_end_at`, `role`, `timezone`, `theme_preset`.
- `cohorts`: `id`, `name`, `enrollment_open_at`, `enrollment_close_at`, `start_at`, `end_at`, `status`.
- `otp_challenges` or provider-managed challenge metadata: hashed challenge reference, expiry, attempts, invalidated timestamp.
- `device_sessions`: `id`, `user_id`, `device_id`, coarse device label, created/last-seen/revoked timestamps.
- `teams`: `id`, `cohort_id`, `name`, `idea_name`, `problem_statement`, `objective`, `status`.
- `team_members`: `team_id`, `user_id`, `role`, `joined_at`.
- `schedule_templates`: `id`, `name`, `version`, `cohort_id`, `active`, `config_json`.
- `schedule_blocks`: optional normalized block rows, or blocks inside versioned template JSON.
- `daily_schedule_instances`: `id`, `user_id`, `local_date`, `template_version`, timezone, cutoff_at.
- `block_completions`: `id`, `instance_id`, `block_key`, `user_id`, `completed_at`, `status`, `sync_version`; unique on instance/block/user.
- `daily_checkins`: `user_id`, `local_date`, `completed`, `reflection_private`, `created_at`, `updated_at`.
- `weekly_commitments`: `cohort_week`, title, description, required state.
- `team_progress_logs`: `team_id`, `author_id`, body, category, created_at, updated_at.
- `team_messages`: `id`, `team_id`, `author_id`, body, created_at`, updated_at`, deleted_at`, client_message_id`, moderation_status`; unique on `team_id` + `client_message_id`.
- `team_message_reads`: `team_id`, `user_id`, `last_read_message_id`, `last_read_at`.
- `chat_moderation_events`: message/user/admin IDs, action, reason, created_at.
- `reports`: title, interviewee, published_at, summary, body/content URL, media URL, cover URL, version, cache_priority.
- `community_posts`: type, title, body, source_url, published_at, pinned, cohort_id.
- `push_subscriptions`: `user_id`, `device_session_id`, endpoint, keys, enabled, last_success_at.
- `leaderboard_projection`: safe derived fields only; refresh on completion events or scheduled job.

Use database constraints, unique indexes, UTC timestamps, and explicit local-date fields. Streaks/ranks should be derived or recomputable, not trusted as mutable client data.

---

## 10. Technical Architecture

Recommended stack:

- React + TypeScript PWA.
- Supabase Auth, Postgres, RLS, Storage, and Edge Functions.
- Service worker via Workbox or an equivalent maintained PWA toolchain.
- Web Push with VAPID and a server-side scheduled sender.
- Responsive mobile-first UI; installable on iOS and Android.
- Background jobs for OTP invalidation, cutoff processing, leaderboard projection, reminders, and push cleanup.

### Offline strategy

- Cache app shell and static theme assets.
- Cache today's schedule and latest report documents/assets.
- Permit block completion offline and place it in an idempotent outbox.
- On reconnect, sync in order with conflict rules: first valid completion wins; a server-confirmed missed state cannot be overwritten by a late client event without an auditable correction.
- Show sync status and last synced time.

### Observability

Track operational events without storing private reflection content in analytics:

- OTP requested/verified/blocked.
- Login/device-limit decisions.
- Schedule viewed, block completed, sync failure.
- Notification sent/delivered/invalid.
- Report opened/cached.
- Team update created.

Set alerts for OTP delivery failures, push failure spikes, sync errors, and auth anomalies.

---

## 11. Admin and Content Operations

A minimal admin capability is required for the MVP, even if initially implemented through a protected internal tool or Supabase dashboard:

- Create/manage cohort dates and enrollment window.
- Manually add/activate members after enrollment closes.
- Assign/reassign teams and edit canonical team idea.
- Publish/unpublish reports and community posts.
- Choose active schedule template/version.
- View delivery health and correct an erroneous completion with audit reason.
- Trigger a test notification.

A full analytics/admin dashboard and CSV/PDF export are post-MVP unless operations require them for launch.

---

## 12. Phased Delivery Plan

### Phase 0 — Product alignment and technical spike

**Output:** signed-off scope and risk decisions.

- Confirm cohort dates, access rules, admin roles, display-name policy, day cutoff, and strictness policy.
- Confirm whether reports are HTML, PDF, video, or external presentation links.
- Validate Supabase OTP behavior and email provider deliverability.
- Test Web Push on Chrome Android, desktop Chromium, Safari macOS, and supported iOS.
- Produce low-fidelity flows and data/RLS model.

**Exit criteria:** no unresolved decision that blocks schema or auth implementation.

### Phase 1 — Foundation and Today engine

- App shell, routing, PWA manifest, service worker.
- Supabase project, schema, RLS, seed cohort/template.
- OTP auth, enrollment gating, sessions, device limit.
- Timezone detection and Settings.
- Today schedule with completion states, cutoff, offline queue.

**Exit criteria:** a test user can complete a full day, go offline, reconnect, and see correct streak behavior.

### Phase 2 — Accountability loop

- Daily check-in and weekly commitments.
- Streak calculations and leaderboard projection.
- Team assignment, team idea, shared progress log.
- Team chat foundation: channel membership, realtime messages, unread counts, retry states, and basic moderation.
- Default premium theme plus component tokens.

**Exit criteria:** two test teams can use the system for a simulated week; rankings and privacy boundaries are verified.

### Phase 3 — Content and retention

- Reports library/detail pages.
- Team chat hardening: notifications, mute/report/delete controls, audit trail, abuse-rate limits, and history pagination.
- Community read-only feed and optional external links.
- Report caching and offline UX.
- Push subscriptions, daily reminders, report notifications, preferences.
- Notification and delivery monitoring.

**Exit criteria:** a published report reaches eligible members, can be cached, and reminders fire at local configured times.

### Phase 4 — Theme completion, hardening, launch

- Complete all six presets with meaningful layout/density differences.
- Accessibility pass, responsive QA, performance, security review, RLS tests.
- Seed realistic cohort data and run launch rehearsal.
- App install/onboarding guidance and known-limitations messaging.

**Exit criteria:** launch checklist passes on supported browsers/devices; no P0 security, data-integrity, or auth defects.

### Post-MVP

- Adaptive scheduling engine based on behavior and approved external conditions.
- Admin dashboard and richer cohort analytics.
- CSV/PDF personal progress export.
- More schedule templates and admin-controlled variants.
- Team milestones, deliverables, and structured peer review.
- Calendar integration only after privacy and scheduling rules are validated.

---

## 13. Acceptance Criteria

### Critical P0 acceptance criteria

- A non-enrolled email cannot obtain or use a new signup OTP after enrollment closes.
- OTPs expire, are single-use, and lock after the configured failed-attempt threshold.
- A third device login cannot bypass the two-device policy.
- RLS prevents one member from reading another member's private check-ins/reflections.
- Members can see only their own private data plus authorized team, leaderboard, report, and community data.
- Today uses the detected IANA timezone and visibly communicates it.
- Required block completion is idempotent and survives offline/reconnect without duplicates.
- Missing a required block marks it missed after cutoff and breaks the active streak according to the selected policy.
- Leaderboard ranking is reproducible from server-side data and does not accept client-supplied scores.
- A team of 3–4 can share one idea and progress log while private reflections remain private.
- A team member can send, receive, retry, paginate, mute, report, and delete permitted chat messages; a non-member cannot read or write that channel.
- Team chat cannot be used to discover or message users outside the assigned team.
- Latest reports remain viewable offline after being cached.
- Daily and report notifications are sent through the server-side push pipeline; unsupported iOS cases are explained.
- No ads or unrelated monetization surfaces appear anywhere.

### Quality bar

- Mobile-first and usable one-handed.
- Accessible contrast and keyboard/focus support.
- Touch targets at least 44px where practical.
- Loading, empty, offline, error, and sync states are designed—not browser defaults.
- Core Today screen loads quickly on a mid-range mobile connection.
- Copy is direct, premium, and honest; no exaggerated success guarantees.

---

## 14. Success Metrics for the First Cohort

Measure behavior change and reliable delivery, not vanity engagement:

- Day 1 activation rate.
- Percentage of members completing at least one required block on each cohort day.
- Full-day completion rate.
- Median active streak and percentage reaching 7, 14, and 30 days.
- Weekly check-in completion.
- Team progress entries per team per week.
- Report open and offline-save rate.
- Daily reminder delivery/open rate and push opt-in rate.
- OTP failure, lockout, and device-limit rates.
- Sync failure rate and unresolved support incidents.

Set numeric targets after a baseline usability test; do not invent “success” thresholds before observing the first cohort.

---

## 15. Key Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Strict schedule feels punitive or unrealistic | Test with members; distinguish required vs critical; use firm but respectful copy |
| Early wake time is unsuitable for all members | Present as the cohort template; confirm policy and allow future template variants rather than silently changing times |
| Push support is inconsistent | Server delivery monitoring, in-app reminders, clear permission/setup states, iOS limitation messaging |
| OTP email delays harm access | Reliable transactional email provider, resend cooldown, status messaging, support fallback |
| Device fingerprinting creates privacy concern | Server-issued device ID plus coarse metadata; disclose and provide revoke-all control |
| Offline conflicts create false streak changes | Server-authoritative cutoff, idempotent events, explicit sync states, audit trail |
| Leaderboard demotivates lower-ranked members | Show personal rank and progress, avoid public missed-task shame, use team/accountability framing |
| Six themes increase scope | Build tokenized shared components; prioritize default theme first, then verify functional parity |
| App becomes a second community | Keep the feed read-only, manually curated, and link externally only when useful; limit chat to assigned team rooms |
| Team chat becomes unsafe or distracting | Text-only MVP, reporting/muting, admin moderation, rate limits, retention policy, and clear chat purpose |
| Admin content becomes a bottleneck | Minimal publishing workflow and clear report schema from Phase 0 |

---

## 16. Decisions Needed in the Monday Presentation

1. Is the default schedule intended for every member, or should members choose from a small set of cohort-approved templates?
2. Are all listed blocks required, or are some wellness/protected-time blocks informational while deep work/check-in blocks are Critical?
3. What exactly happens when a member misses a day: streak reset only, visible warning, team notification, or admin escalation?
4. Should leaderboard names be legal names, first name + initial, or member-selected aliases?
5. Can members edit their team idea directly, or does an admin approve the canonical version?
6. What is the source and format of reports, and who publishes them?
7. What is the access policy after day 30: immediate lock, read-only grace period, or continued access until a fixed date?
8. Which email provider and push infrastructure are approved?
9. What minimum admin tooling is needed for cohort day one?
10. Which devices/browsers are in the supported launch matrix?

---

## 17. Recommended Presentation Narrative

1. **Problem:** Premium members need an execution system, not another content feed.
2. **Differentiator:** The local-time Strict Daily Schedule makes discipline concrete and measurable.
3. **Accountability loop:** Schedule completion → streak → leaderboard → team progress → reports/learning → next day's action.
4. **Trust:** Privacy-first RLS, controlled cohort access, secure OTP, and two-device protection.
5. **MVP boundary:** A fully functional fixed-template engine now; adaptive intelligence is deliberately reserved for the next phase.
6. **Proof of value:** The first cohort generates measurable completion, streak, team, and report-engagement data to guide iteration.

## Final product statement

This MVP should feel like a private execution room: calm, demanding, and useful every day. The winning experience is not the number of screens. It is the moment a member opens the app, sees the next commitment in local time, completes it in one tap, knows exactly where they stand, and returns tomorrow because the system has made their standard visible.

---

# 18. Research-Backed Scope Expansion

This section adds implementation and launch points identified through current platform documentation and security guidance.

## 18.1 Important Supabase OTP implications

Supabase's email OTP flow uses the same underlying mechanism as magic links, but the email template must explicitly render `{{ .Token }}` and the client must call `verifyOtp` with the email, token, and `type: 'email'` ([Supabase passwordless authentication documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless)).

Supabase defaults are not the same as the product requirement: the current documentation describes a 60-second request interval and one-hour OTP expiry, with expiry configurable. For this product, configure a materially shorter challenge lifetime, such as 10 minutes, and enforce the cohort eligibility gate before issuing a challenge. Do not rely on client-side countdowns or UI-only lockouts. The server remains authoritative.

**Additional auth requirements:**

- Use `shouldCreateUser: false` for the member login request so an arbitrary email cannot create an account automatically.
- Put enrollment eligibility in a server-side function or controlled database operation; do not expose a public “is this email enrolled?” lookup.
- Return the same generic response for unknown and known emails where practical to reduce enumeration.
- Add resend cooldown, per-email and per-IP quotas, and abuse monitoring beyond Supabase defaults.
- Treat the Supabase refresh token as a sensitive credential; never log it or send it to analytics.
- Test concurrent OTP verification and repeated-click behavior.

## 18.2 Supabase RLS must be paired with grants and tests

Supabase states that RLS must be enabled on exposed tables and that policies control row access, while database grants control whether a role can reach the object at all ([Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)). Therefore, “RLS enabled” is not an adequate security acceptance criterion by itself.

Add the following to the engineering definition of done:

- Every exposed table has an explicit RLS migration.
- Every table has least-privilege grants for `anon`, `authenticated`, and service-side roles.
- Every `INSERT` and `UPDATE` policy uses `WITH CHECK` to prevent changing ownership fields, cohort IDs, team IDs, or timestamps.
- Private reflection content is not included in leaderboard views, materialized projections, logs, exports, or push payloads.
- Security tests attempt cross-user reads/writes using real authenticated sessions.
- Service-role operations are isolated to server functions and are never shipped to the browser.
- Admin access is based on a server-validated role, not a client-editable `is_admin` flag.
- Add a migration check that fails CI if a new exposed table lacks RLS.

## 18.3 Standalone website and PWA distribution

The product is a completely separate website hosted and controlled by the product team. It is not embedded in Whop, does not use Whop authentication, does not consume Whop APIs, and does not depend on Whop webhooks.

Whop remains the separate paid community destination. The app may include a manually configured external link back to Whop, but Whop is not an application dependency or access-control service for this MVP.

**Standalone access model:**

- Enrollment comes from the existing external Typeform-style intake process.
- An admin provisions the eligible email, cohort, access start, and access end in Supabase.
- Members authenticate directly on the hosted PWA using email OTP.
- Admins manually add or deactivate members in the internal admin surface/Supabase tooling.
- App access is governed by the app's own cohort and access records, not a live Whop membership check.
- Any Whop link is informational and must fail gracefully if unavailable.

**Distribution requirements:**

- Host on a production HTTPS domain with a valid manifest and service worker.
- Provide an install/onboarding page with Android, desktop, and iOS Home Screen instructions.
- Use a custom domain, branded app icon, splash/theme colors, and installable `display: standalone` configuration.
- The website must remain fully usable in a browser; installation is encouraged but not required except for iOS push support.
- Keep the PWA origin stable after launch because changing origin disrupts storage, service-worker scope, and push subscriptions.
- Maintain staging and production environments with separate Supabase projects or isolated configurations.

## 18.4 Push notifications require a delivery product, not just an API call

The push system should be scoped as a small operational service:

- `push_subscriptions` is one row per browser/device subscription, not one row per user.
- Store endpoint, public keys, user/device/session relation, permission state, last success, last failure, and failure reason.
- Remove subscriptions on permanent provider failures such as expired/invalid endpoints.
- Use a notification job table with idempotency key, category, scheduled time, target user, payload reference, attempt count, and delivery state.
- Never put private reflections, email addresses, or sensitive team information in notification payloads.
- Use deep links that open the relevant Today, Report, or Team screen.
- Support quiet hours and a “do not remind me on rest day” policy only if the cohort rules allow it.
- Add a notification test button in Settings and an admin test-send tool.

On iOS/iPadOS, web push is a progressive enhancement: current platform guidance indicates support from 16.4 onward for Home Screen-installed web apps, with the permission request initiated by user interaction. The product should therefore show an install instruction and a button-triggered permission flow rather than requesting permission on page load. See Apple’s notification overview ([Apple Developer](https://developer.apple.com/notifications/)) and current iOS PWA guidance ([PushEngage documentation](https://www.pushengage.com/documentation/setting-up-web-push-notifications-for-ios-ipad/)).

**Fallback:** if push is unavailable or denied, use in-app “next reminder” state, email fallback for high-value report announcements if approved, and a clear settings diagnosis. Do not claim that push is guaranteed across all devices.

## 18.5 PWA / offline scope needs explicit browser boundaries

The service worker can cache GET resources and app data, but it is not a replacement for a reliable server. Add these boundaries:

- Never cache authenticated HTML or API responses in a shared cache without user scoping.
- Use cache keys that include the user/cohort context where private data is cached.
- Clear private caches on sign-out and account switch.
- Keep reports versioned and cache only approved content types and sizes.
- Provide an offline screen and a “last synced” timestamp.
- Use an IndexedDB outbox for offline completions; do not attempt to cache POST requests as if they were GETs.
- Make sync operations idempotent with a client event ID.
- Define conflict behavior for a block completed after the server has marked the block missed.
- Test storage pressure, browser eviction, multiple tabs, clock changes, DST transitions, and timezone changes.

**Timezone edge cases to add to QA:**

- Member travels across timezones during the cohort.
- Daylight saving transition creates a 23- or 25-hour local day.
- Device clock is wrong.
- Member changes timezone after completing blocks.
- User opens the app around midnight and around the configured cutoff.

Recommended policy: store event timestamps in UTC, store the timezone and local date used at event creation, and do not rewrite historical days when a member travels. Apply the current timezone only to future schedule instances.

## 18.6 Discipline engine needs anti-gaming and fairness rules

A strict tracker creates incentives to game the system unless the rules are explicit. Add:

- Server timestamps for completion events; client time is advisory only.
- One completion per block per schedule instance.
- No retroactive completion after cutoff by default.
- Admin correction requires reason and is visible in audit logs.
- A member cannot change their cohort, team, schedule template, or scoring fields from the client.
- Define whether optional blocks can affect streaks; recommended: they never break streaks.
- Define whether a full-day streak is based on calendar day or the cohort's schedule day; recommended: schedule day with a published cutoff.
- Add “excused day” only if the cohort owner explicitly wants it; if enabled, cap it and label it clearly rather than silently preserving a streak.
- Keep a distinction between “completed,” “excused,” “missed,” and “not applicable.”

### Revised scoring display

Show three numbers rather than one opaque score:

1. **Today:** required blocks completed, e.g. `8/12`.
2. **Critical:** critical blocks completed, e.g. `3/3`.
3. **Streak:** consecutive fully completed schedule days.

Leaderboard ordering remains server-derived and should be explained in plain language. Consider a “personal progress” tab or weekly percentile so members can compete against their own baseline as well as the cohort.

## 18.7 Community mirror needs a manual-content contract

The community page is not a Whop integration and must not scrape or synchronize from Whop. It is a lightweight, read-only feed maintained by the admin.

Recommended MVP model:

- Admin creates or pastes selected announcements, prompts, milestones, and cohort updates into the app.
- Each item may include an optional manually configured external URL to the relevant Whop discussion.
- Store title, summary, source label, publication date, pinned state, cohort, author label, and content version.
- No dependency on Whop availability, permissions, APIs, webhooks, iframe tokens, or external session state.
- If an external link is unavailable, the in-app summary remains readable.

## 18.8 Reports need a publishing contract

Before engineering reports, lock the format:

- HTML article, PDF, slide deck, video, or a combination.
- Maximum mobile payload size.
- Whether downloads are allowed.
- Whether the report can be shared outside the paid community.
- Captions/transcripts for video.
- Alt text and accessible document structure.
- Versioning and corrections.
- Cover image crop rules.
- External embed failure behavior.

Recommended MVP: store structured report metadata plus a mobile-readable HTML summary, with optional external PDF/video links. This gives reliable offline reading without requiring every file format to work offline.

## 18.9 Add a support and recovery surface

Premium members will judge reliability by how quickly they recover from problems. Add:

- “I didn’t receive my code” flow with resend cooldown and support link.
- “I’m logged in on another device” session manager.
- “My schedule is in the wrong timezone” correction flow.
- Sync error retry and support diagnostics code.
- Notification compatibility check.
- Data export request and account deletion request path, even if fulfilled manually at first.
- Admin-visible member status: last login, last sync, push state, cohort day, access expiry.

## 18.10 Expanded QA matrix

### Authentication/security

- Unknown email, eligible email, expired cohort, manually added member.
- Expired OTP, reused OTP, wrong OTP, five-plus attempts, resend race.
- Two active devices, third-device selection, revoked session, sign-out-all.
- RLS cross-user read/write attempts.
- Service-role key absent from client bundle.

### Schedule/data integrity

- Every block state, cutoff, offline completion, reconnect, duplicate tap.
- DST, travel, midnight, clock skew, multiple tabs.
- Server/client conflict and admin correction audit.

### Push/PWA

- Chrome Android, Safari iOS/iPadOS 16.4+, desktop Safari, Chrome, Edge.
- Installed and uninstalled states.
- Permission granted, denied, revoked, endpoint expired.
- App killed, device offline, notification deep link, quiet hours.

### Accessibility/design

- Keyboard-only navigation.
- Screen reader labels for timeline blocks and completion states.
- Reduced motion.
- Contrast in all six presets.
- 200% text zoom and narrow mobile width.
- Long report titles, missing images, empty team, no leaderboard data.

## 18.11 Hardening decisions and operational rules

### Chat safety and abuse controls

- Rate-limit sends per user and team; apply progressive backoff for bursts.
- Enforce maximum message length and reject unsupported HTML/scripts; render text safely.
- Add profanity/spam screening only as a moderation aid, never as the sole decision-maker.
- Provide report reasons: harassment, spam, personal data, illegal content, and other.
- Define admin response targets and escalation path before cohort launch.
- Retain moderation events separately from deleted message content according to the privacy policy.
- Notify the sender when an admin removes their message, with a neutral reason.
- Never send a chat message body in push payloads by default.

### Product rules to lock before build

1. Is team chat available immediately or only after team assignment? Recommended: only after assignment.
2. Are teams permanent for the 30-day cohort? Recommended: admin-controlled reassignment with an audit event.
3. What happens to chat after access expiry? Recommended: read-only for 7 days, then archive.
4. Should admins see all team chat? Recommended: authorized cohort admins can moderate, with access logged.
5. Is media required? Recommended: no for MVP; links and text only.
6. Are chat notifications default-on? Recommended: mention/team activity on, but configurable during onboarding.

### Realtime architecture boundary

Use a realtime channel only for active team membership. Persist every message in Postgres so reconnecting clients can load history. Realtime delivery is an optimization, not the source of truth. On reconnect, query messages after the last acknowledged message ID, deduplicate by `client_message_id`, and display an explicit failed state when persistence did not succeed.

## 18.12 Updated launch gates

Do not launch the paid cohort until:

- Auth, access, device limit, and RLS have passed adversarial tests.
- At least one complete simulated cohort day has been run with offline and timezone scenarios.
- Push has been tested end-to-end on the target device matrix and fallback copy exists.
- Admin can publish a report, assign a team, correct a record, and revoke a session without engineering assistance.
- Support can identify a member's auth, sync, push, and app-access state without reading private reflections.
- Privacy notice, retention policy, terms, and support contact are published.
- Default theme and all alternate presets meet accessibility baseline.
- A rollback plan exists for schedule-template and database migrations.

---

# 19. Research Sources

- Supabase, “Passwordless email logins”: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase, “Row Level Security”: https://supabase.com/docs/guides/database/postgres/row-level-security
- - Apple Developer, “Notifications”: https://developer.apple.com/notifications/
- PushEngage, “Setting Up Web Push Notifications on iOS and iPadOS”: https://www.pushengage.com/documentation/setting-up-web-push-notifications-for-ios-ipad/
- OWASP, “Authentication Cheat Sheet”: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

These sources were used for platform constraints and security/architecture recommendations, not as a substitute for an application-specific penetration test or legal/privacy review.
