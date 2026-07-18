# Quality and CI Track

Implemented:

- Shared not-found state
- Authenticated route loading state
- Authenticated route error boundary
- GitHub Actions workflow using Node 22
- Clean install and production build checks
- TypeScript `typecheck` script
- Dependency audit script

CI intentionally runs with no production secrets. It validates compilation and static correctness only; authenticated integration tests belong in a protected staging workflow after Supabase is configured.
