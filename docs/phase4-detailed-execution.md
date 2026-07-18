# Phase 4 Detailed Execution

Phase 4 is not just a visual pass. It hardens the product for a real paid cohort.

## Completed in workspace

- Theme provider persists the selected preset in localStorage.
- Theme provider applies `data-theme` to the root document.
- All six presets now change actual global UI tokens.
- Focus-visible keyboard states added.
- Reduced-motion preference added.
- Theme contrast tokens added for light, dark, neon, and dense variants.
- Active device management route implemented with one-device and sign-out-all controls.
- Settings now points to device management.

## Required launch execution

### Accessibility
- Run axe/Lighthouse on every route and each theme.
- Test keyboard-only focus order, modal traps, screen-reader names, 200% zoom, and reduced motion.
- Verify contrast for text, muted text, borders, progress, active states, and completed blocks in all presets.

### Auth/security
- Run RLS tests with member A, member B, team A, team B, and admin fixtures.
- Verify OTP expiry, replay, enumeration, resend abuse, cohort-close behavior, and device revocation.
- Confirm admin routes are server-gated, not merely hidden in navigation.

### PWA/reliability
- Verify manifest, icons, installability, service-worker scope, update/rollback, offline route behavior, and cache clearing on sign-out.
- Test offline completion replay, duplicate client events, DST, midnight cutoff, travel, and clock skew.

### Production operations
- Configure Vercel Node 22.
- Add Preview and Production environment variables separately.
- Configure cron/authenticated worker calls.
- Add health monitoring and error alerts.
- Document backup/restore, retention, deletion, support escalation, and incident response.

## Exit gate

Phase 4 is complete only when all checklist items have evidence in staging, not merely when the UI looks finished.
