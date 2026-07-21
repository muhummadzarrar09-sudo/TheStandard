# TheStandard UI Excellence Plan

## Goal

Raise the product from an estimated **7.5/10** to a polished, trustworthy **10/10 experience** across visual design, accessibility, mobile UX, authentication, dashboard clarity, performance, and interaction quality.

The product should feel like a premium discipline and performance system: focused, calm, clear, motivating, and reliable.

---

## Target scorecard

| Area | Current estimate | 10/10 target |
|---|---:|---:|
| Visual direction | 8.5 | 10 |
| Color system | 8 | 10 |
| Component consistency | 7.5 | 10 |
| Mobile UX | 6.5 | 10 |
| Authentication UX | 5.5 | 10 |
| Accessibility | 8 | 10 |
| Product polish | 7 | 10 |
| Performance and reliability | To validate | 10 |

---

# Phase 0 — Establish the design foundation

## 0.1 Define the primary product identity

Choose **Whoop/Oura-inspired Discipline OS** as the primary brand direction. Keep the other themes as optional presets, but do not let them compete with the core identity.

Define:

- Brand promise: “Do the work. Keep the standard.”
- Primary visual mood: calm, premium, disciplined, data-aware.
- Primary accent: lime performance accent on a near-black surface.
- Primary content hierarchy: today first, progress second, history third.
- Voice: concise, direct, encouraging, never childish or overly corporate.

## 0.2 Create design tokens

Centralize all visual tokens in one system:

- Backgrounds and surfaces
- Text and muted text
- Borders and dividers
- Accent, success, warning, and danger states
- Spacing scale
- Typography scale
- Radius scale
- Shadows and elevation
- Motion durations and easing
- Focus-ring styles
- Breakpoints

Every component should use tokens rather than one-off values.

## 0.3 Create a component inventory

Document and standardize:

- Buttons
- Inputs
- Selects
- Checkboxes and switches
- Cards
- Tables
- Tabs
- Badges
- Toasts
- Alerts
- Modals
- Drawers
- Empty states
- Loading skeletons
- Error states
- Progress indicators
- Date/time controls
- Navigation items

Each component needs documented states:

- Default
- Hover
- Focus
- Active
- Disabled
- Loading
- Success
- Error
- Empty
- Mobile

### Acceptance criteria

- No duplicated button/input styling across pages.
- Every component uses tokens.
- Every interactive component has visible focus and disabled states.
- Theme changes affect the entire system without breaking contrast or layout.

---

# Phase 1 — Visual direction: 8.5 → 10

## 1.1 Improve the primary shell

Refine the authenticated shell with:

- Stronger brand lockup in the rail.
- Clear current-page indicator.
- User identity and cohort context.
- Compact progress summary in navigation.
- Clearly separated primary and secondary navigation.
- Persistent account/settings access.
- Consistent page title and supporting description.

## 1.2 Improve page hierarchy

Every page should answer these questions immediately:

1. Where am I?
2. What matters today?
3. What action should I take next?
4. What changed since my last visit?

Use a consistent page structure:

```text
Page title
One-line context
Primary action / today’s focus
Key metrics or main content
Secondary details
History / supporting information
```

## 1.3 Improve surface depth

Use subtle elevation and grouping rather than flat collections of cards:

- Primary card: highest contrast.
- Secondary cards: lower contrast.
- Supporting rows: divider-based.
- Avoid excessive borders around every element.
- Use accent color only for meaningful actions or status.

## 1.4 Improve typography

- Load the selected fonts locally or through a controlled, production-safe mechanism.
- Use a consistent type scale.
- Make page titles more distinctive.
- Use tabular numerals for metrics and dates.
- Avoid excessive uppercase labels.
- Maintain readable line lengths.

### Acceptance criteria

- A first-time user can identify the primary action within five seconds.
- No page feels visually disconnected from the rest of the app.
- Metrics, actions, and warnings have visibly different hierarchy.

---

# Phase 2 — Color and theme system: 8 → 10

## 2.1 Establish semantic colors

Use semantic names instead of only palette names:

- `--color-action`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`
- `--color-surface-primary`
- `--color-surface-secondary`
- `--color-text-primary`
- `--color-text-secondary`

## 2.2 Validate contrast

Every theme must meet WCAG AA contrast targets:

- Normal text: at least 4.5:1.
- Large text: at least 3:1.
- Controls and focus indicators: clearly visible.
- Status should never be communicated by color alone.

## 2.3 Improve theme switching

- Add a theme preview before applying.
- Persist the preference reliably.
- Respect system light/dark preference on first visit.
- Animate only safe color changes.
- Ensure charts, badges, dialogs, tables, and inputs adapt correctly.
- Add a “recommended” label to the primary theme.

## 2.4 Avoid theme fragmentation

Keep the same information hierarchy across themes. Themes may change mood and component treatment, but should not change how users find essential actions.

### Acceptance criteria

- Contrast audit passes for all six themes.
- No text becomes unreadable in any theme.
- All components render correctly in every preset.
- Theme selection works on desktop and mobile.

---

# Phase 3 — Component consistency: 7.5 → 10

## 3.1 Buttons

Implement consistent variants:

- Primary
- Secondary
- Quiet
- Destructive
- Link
- Icon-only

Every button needs:

- Loading spinner or progress state
- Disabled state
- Keyboard focus state
- Pressed state
- Clear success/error feedback
- Minimum touch target of 44×44px on mobile

## 3.2 Forms

Every form should include:

- Visible label
- Helpful placeholder only where appropriate
- Inline validation
- Error text beside the field
- Server-error fallback
- Submit loading state
- Success confirmation
- Keyboard-friendly tab order
- Autofocus only when it helps

## 3.3 Feedback system

Create a consistent feedback layer:

- Toast for short-lived confirmation
- Inline alert for page-level problems
- Field error for input problems
- Modal for destructive confirmation
- Empty state for missing content
- Skeleton for loading content
- Retry action for recoverable errors

## 3.4 Tables and data views

- Responsive table-to-card transformation.
- Clear column labels.
- Sort and filter states.
- Pagination or virtualized loading where needed.
- Export feedback.
- Empty and error states.
- Safe handling of long names and emails.

### Acceptance criteria

- Every page uses the same component states.
- No raw browser alerts for product actions.
- Every async operation tells the user what is happening.
- Every failed operation gives a useful next step.

---

# Phase 4 — Mobile UX: 6.5 → 10

## 4.1 Replace hidden rail with mobile navigation

The current mobile behavior hides the rail. Replace it with:

- Bottom navigation for the 4–5 highest-priority destinations.
- “More” drawer for secondary destinations.
- Persistent account/profile access.
- Active-page indicator.
- Safe-area padding for modern phones.

Recommended bottom navigation:

```text
Today | Schedule | Progress | Team | More
```

## 4.2 Mobile layout rules

- Minimum 44px touch targets.
- No horizontal scrolling except intentional carousels.
- Cards stack predictably.
- Tables become cards or horizontally scroll only when necessary.
- Inputs never zoom unexpectedly on iOS.
- Primary action remains reachable with one hand.
- Avoid large empty vertical gaps.

## 4.3 Mobile dashboard

Prioritize:

1. Today’s next block.
2. Completion progress.
3. Critical reminder.
4. Streak or momentum.
5. Quick check-in.

## 4.4 Offline and network states

Show clear states for:

- Offline mode
- Pending sync
- Sync succeeded
- Sync conflict
- Failed sync with retry

### Acceptance criteria

- Usable at 320px width.
- No clipped controls at 375px, 390px, or 430px widths.
- All primary flows work with touch only.
- Mobile navigation remains visible and understandable.

---

# Phase 5 — Authentication UX: 5.5 → 10

## 5.1 Use one consistent OTP flow

The intended flow should be:

```text
Enter enrolled email
→ enrollment check
→ send real six-digit Supabase OTP
→ verify code
→ establish SSR session
→ register device
→ dashboard
```

Do not mix magic links and numeric OTPs.

## 5.2 Login screen improvements

- Explain that the email must be enrolled.
- Show a clear loading state.
- Use generic but useful security-safe errors.
- Preserve the email after recoverable errors.
- Provide an obvious “Need help?” path.
- Prevent duplicate submissions.

## 5.3 Verification screen improvements

Add:

- Masked email display.
- Six separate OTP boxes or a polished single OTP input.
- Auto-focus.
- Paste support.
- Automatic submit after six digits, with a short confirmation state.
- Countdown to expiry.
- Resend countdown.
- “Change email” action.
- Clear invalid-code feedback.
- Clear expired-code recovery.
- “Check spam/junk” guidance.
- “Code sent” confirmation.

## 5.4 Server-side auth correctness

- Use the service-role client only in server routes.
- Validate required environment variables at runtime.
- Never expose secrets with `NEXT_PUBLIC_`.
- Consume gate tokens only after successful verification.
- Do not consume tokens on failed code attempts.
- Keep lockout and rate-limit behavior understandable.
- Log safe diagnostic error codes without exposing secrets.
- Make session-cookie creation observable in server logs.

## 5.5 Auth test matrix

Test:

- Correct enrolled email.
- Unenrolled email.
- Mixed-case email.
- Whitespace around email.
- Invalid email.
- Correct OTP.
- Wrong OTP once.
- Wrong OTP repeatedly.
- Expired OTP.
- Resend before cooldown.
- Resend after cooldown.
- Refresh on verification screen.
- Back navigation.
- Multiple browser tabs.
- Mobile Safari.
- Mobile Chrome.
- Missing environment variable.
- Incorrect service-role key.
- Expired access window.
- Closed cohort.
- Existing device.
- Device cap reached.

### Acceptance criteria

- A user can recover from every normal mistake without restarting unnecessarily.
- Every auth error provides a next action.
- No valid user is blocked by a stale client-side token.
- The app never exposes whether an arbitrary email is enrolled.
- Successful login reliably persists across navigation and refresh.

---

# Phase 6 — Dashboard and product hierarchy: 7 → 10

## 6.1 Make “Today” the home experience

The dashboard should prioritize:

- Current date and cohort phase.
- Completion percentage.
- Current or next schedule block.
- One primary action.
- Missed or at-risk items.
- Streak/momentum.
- Team signal.

## 6.2 Add progressive disclosure

Do not show every metric at equal weight.

- First level: immediate action.
- Second level: progress and status.
- Third level: history, details, and analytics.

## 6.3 Improve empty states

Every empty state should explain:

- What is missing.
- Why it matters.
- What the user can do next.
- A primary action.

## 6.4 Improve admin experience

Admin pages should clearly distinguish:

- Enrollment operations.
- Member access status.
- Cohort health.
- Schedule management.
- Reports and exports.
- Security/audit actions.

Use filters, saved views, bulk actions, confirmation dialogs, and visible result counts.

### Acceptance criteria

- Users know their next action without scanning the entire dashboard.
- Admins can locate a member or cohort in under 10 seconds.
- Important failures and access-expiry states are prominent but not alarming.

---

# Phase 7 — Accessibility: 8 → 10

## Requirements

- Semantic landmarks on every page.
- One clear H1 per page.
- Logical heading hierarchy.
- Labels for every form control.
- Keyboard-only completion of all critical flows.
- Visible focus indicators.
- Accessible names for icon-only buttons.
- `aria-live` for important async status changes.
- Dialog focus trapping and restoration.
- No color-only status indicators.
- Reduced-motion support.
- Screen-reader friendly loading and error states.
- Touch targets at least 44×44px.

## Testing

Use:

- axe or Lighthouse accessibility checks.
- Keyboard-only navigation.
- VoiceOver on iOS/macOS.
- NVDA on Windows.
- Zoom at 200%.
- High-contrast and reduced-motion settings.

### Acceptance criteria

- Zero critical accessibility violations.
- All primary user journeys are keyboard-completable.
- Error and success messages are announced appropriately.

---

# Phase 8 — Performance, reliability, and polish

## Performance

- Use server components where possible.
- Keep client components limited to interactive areas.
- Lazy-load heavy admin/report views.
- Optimize images and icons.
- Avoid unnecessary re-fetching.
- Add loading skeletons rather than layout jumps.
- Measure Core Web Vitals.

Targets:

- LCP under 2.5 seconds on a normal mobile connection.
- INP under 200ms for primary interactions.
- CLS under 0.1.
- No blocking JavaScript for static content.

## Reliability

- Add structured server error logging with request IDs.
- Provide safe retry behavior.
- Detect missing environment variables during deployment.
- Add health checks for Supabase connectivity.
- Test auth cookies after login.
- Add clear offline and degraded-network states.
- Confirm cron failures are observable.

## Micro-interactions

Add restrained motion for:

- Completing a schedule block.
- Progress updates.
- Saving a report.
- Sending a team message.
- Successful login.
- Theme switching.

Respect `prefers-reduced-motion`.

### Acceptance criteria

- No important action feels unresponsive.
- Every async action has a visible pending state.
- No layout shift occurs when content loads.
- Failures are recoverable and explain what happened.

---

# Phase 9 — Quality assurance and release gates

## Automated gates

Before every production deployment:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Add or maintain tests for:

- Auth token lifecycle.
- OTP retry and resend behavior.
- Access windows.
- Cohort status.
- Device registration.
- RLS behavior.
- Theme token integrity.
- Responsive layout assumptions.
- Offline sync.

## Manual release checklist

- [ ] Login with admin account.
- [ ] Login with member account.
- [ ] Unenrolled user is rejected safely.
- [ ] Wrong OTP can be retried.
- [ ] Resend works after cooldown.
- [ ] Expired access is rejected.
- [ ] Admin routes are protected.
- [ ] Member cannot access admin routes.
- [ ] Dashboard works on mobile.
- [ ] Bottom navigation works.
- [ ] All themes pass contrast review.
- [ ] Offline behavior is understandable.
- [ ] No secrets appear in browser bundles or logs.
- [ ] Vercel production environment variables are present.
- [ ] Supabase SMTP delivery works.

## UX research loop

Test with:

- One first-time admin.
- One first-time customer.
- One returning customer.
- One mobile-only user.
- One user with accessibility needs.

Ask each person to complete:

1. Sign in.
2. Find today’s action.
3. Complete a block.
4. Review progress.
5. Find team communication.
6. Find help or recover from an error.

Record:

- Time to completion.
- Wrong turns.
- Questions asked.
- Abandoned actions.
- Confusing labels.
- Emotional response to progress and failure states.

---

# Recommended execution order

## Week 1 — Stabilize

1. Finish the unified OTP flow.
2. Add auth lifecycle tests.
3. Add environment validation and safe diagnostics.
4. Fix mobile navigation.
5. Standardize loading, error, empty, and success states.

## Week 2 — Product clarity

1. Redesign the Today dashboard hierarchy.
2. Improve admin navigation and member search.
3. Add mobile dashboard priority order.
4. Improve authentication screens and recovery states.
5. Add skeletons and retry actions.

## Week 3 — Design-system polish

1. Centralize all tokens.
2. Standardize components and variants.
3. Audit theme contrast.
4. Refine typography and spacing.
5. Add focused micro-interactions.

## Week 4 — Accessibility and performance

1. Run automated accessibility checks.
2. Complete keyboard and screen-reader review.
3. Optimize images, bundles, and data fetching.
4. Test offline and slow-network behavior.
5. Run the full release checklist.

---

# Definition of “10/10”

TheStandard is 10/10 when:

- A new user understands the product without being taught.
- A customer can sign in, recover from mistakes, and reach today’s action quickly.
- Admins can manage access and cohorts confidently.
- Mobile users have the same core capability as desktop users.
- The interface feels consistent on every page.
- Every loading, success, empty, and failure state is intentional.
- Accessibility is built into the experience rather than added afterward.
- Themes feel polished without fragmenting the product.
- The app remains trustworthy during slow networks, expired access, and service failures.
- Automated checks and real-user testing support every production release.
