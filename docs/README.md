# Discipline OS

Standalone, login-gated Discipline & Community PWA.

## Repository layout

- `app/` — Next.js route groups and pages
- `components/` — reusable UI and feature components
- `themes/` — six complete visual preset token sets
- `lib/` — Supabase, auth, timezone, streak, and server utilities
- `public/` — PWA manifest, service worker, icons
- `types/` — shared TypeScript types
- `docs/` — PRD, scope, and product documentation
- `prototypes/` — disposable visual prototypes, not production route organization

## Route groups

- `(public)` — landing/login/OTP verification
- `(app)` — authenticated member experience
- `(admin)` — separately elevated admin experience
