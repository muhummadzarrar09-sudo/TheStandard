# Quality and CI Track

## Implemented

- Shared not-found state (`app/not-found.tsx`).
- Authenticated route loading state (`app/(app)/loading.tsx`).
- Authenticated route error boundary (`app/(app)/error.tsx`).
- GitHub Actions workflow (`.github/workflows/ci.yml`) running on Node 22.
- CI steps: install, lint, typecheck, test, build.
- ESLint flat config (`eslint.config.mjs`) extending `eslint-config-next`.
- Vitest config (`vitest.config.ts`) locking the test include path.
- TypeScript `typecheck` script.
- Dependency audit script.
- 38 unit tests across 3 files (domain, auth, notifications).

## CI behavior

CI intentionally runs with no production secrets. It validates compilation,
static correctness, and the unit tests. Authenticated integration tests
belong in a protected staging workflow after Supabase is configured.

## Pinned versions

`package.json` no longer uses `"latest"` for any dev dependency. Each
dev dep is pinned to a caret range that stays within a major. This
prevents a fresh `npm install` from picking up a breaking type change.
