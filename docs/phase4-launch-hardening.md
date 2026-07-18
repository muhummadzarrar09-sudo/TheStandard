# Phase 4 — Theme Completion and Launch Hardening

Implemented:

- Six full theme token sets in `/themes/index.ts`
- Theme picker in the production `/settings` route
- Meaningful differences in density, radius, typography, background, surface, and accent
- Notification and device-management settings entry points
- Vercel/Node 22 deployment configuration from Phase 3

Launch-hardening checklist:

- Run Lighthouse/PWA audit in production
- Test contrast and keyboard navigation across all six presets
- Add focus-visible states and reduced-motion mode
- Run RLS and auth integration tests with staging accounts
- Configure Vercel Node 22 and environment variables
- Test service-worker upgrade/rollback and cache invalidation
- Test iOS Home Screen install and push permission gesture
- Complete admin moderation/content workflows
- Verify backups, retention, deletion, support, and incident runbook
- Run `npm audit` and review vulnerabilities before release
