# Deep UI and Interaction Audit

## Scope

Static audit of all `app/` and `components/` TSX files, global CSS, PWA manifest, navigation, forms, interactive elements, loading/error states, and automated project checks.

## Verification

- TypeScript: passed
- Automated tests: 518 passed
- Production build: passed
- Interactive elements inventoried: 64+ form/button/navigation elements
- Click/change/submit handlers inventoried: 66
- Image usage: no content images currently rendered by TSX; PWA icons are present

## Findings

### Fixed / acceptable

- Global focus-visible styling exists.
- Root skip link exists and points to `#main`.
- Reduced-motion support exists.
- Mobile navigation exists with active state and safe-area padding.
- Loading and route-error states exist.
- PWA manifest now has 192px and 512px icons.
- Auth verification has expiry, retry, and change-email recovery.
- Interactive controls generally use real buttons/links rather than clickable non-semantic containers.

### High priority remaining

1. **Form button types need a final pass.** Several buttons omit an explicit `type`. Buttons inside forms should explicitly use `type="submit"` or `type="button"` to prevent accidental submissions when new controls are added.
2. **Async feedback is not fully standardized.** Some operations use local text states, while others rely on generic errors. A shared alert/toast pattern would make failures and success states more predictable.
3. **Mobile navigation needs a real-device pass.** Static CSS is sound, but test at 320px, 375px, 390px, 430px, iOS Safari, Android Chrome, and with large text enabled.
4. **Theme contrast needs automated verification.** Six themes exist, but contrast should be measured for every text/status/control combination rather than inferred from tokens.

### Medium priority

5. **Inline styling is extensive.** There are approximately 299 inline-style references across TSX. This makes theme consistency, responsive changes, and visual regression harder. Migrate repeated patterns to semantic classes.
6. **Unicode symbols are used as mobile navigation icons.** These can render inconsistently between operating systems. Replace with an icon component using consistent inline SVG and accessible labels.
7. **Global `.card:hover` affects non-interactive cards.** A hover border can imply clickability on cards that are not links or buttons. Restrict hover treatment to `.card-action`, links, or explicitly interactive cards.
8. **Loading skeletons need per-surface coverage.** The app shell has dashboard loading, but admin and nested report/team surfaces should have route-specific loading layouts to prevent large blank transitions.
9. **Error messaging should preserve field-level context.** Several pages use generic errors. Keep server-safe detail in the UI where it helps the user recover, while avoiding sensitive disclosures.
10. **Long-content and zoom testing is still required.** Test 200% zoom, 400% zoom, long names, long emails, long team names, long report titles, and large text settings.

### Low priority / polish

11. Add explicit pressed states to tabs and segmented controls.
12. Add `aria-live` regions to all save/send/delete status areas.
13. Add empty-state actions for every list with zero records.
14. Add `autocomplete` hints to admin/member forms where useful.
15. Replace remaining hardcoded visual colors with semantic tokens where they affect reusable UI.
16. Add visual regression screenshots for desktop and mobile themes.

## Authorization/UI boundary checks

- Admin pages have server-side role checks.
- Admin APIs have server-side guards.
- Member pages use the authenticated app layout.
- Error and unauthorized pages provide safe navigation back to a permitted surface.
- Client-side hiding alone is not being used as the authorization boundary.
- Admin member listing/provisioning is now cohort-scoped.

## Recommended next UI pass

1. Explicitly type every form button.
2. Create shared `Alert`, `Toast`, `EmptyState`, and `FieldError` components.
3. Replace Unicode navigation icons with inline SVG icons.
4. Restrict hover effects to interactive cards.
5. Add automated contrast checks for all theme tokens.
6. Run real-device and zoom testing.
7. Add route-specific loading states for admin, reports, teams, and settings.

## Overall assessment

The UI foundation is healthy and substantially above a basic dashboard. The biggest remaining risks are consistency and validation rather than a broken visual system: inline-style drift, incomplete async feedback standardization, icon consistency, and the need for real-device/accessibility testing.
