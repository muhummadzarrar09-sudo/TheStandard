# Phase 3 — Content, Offline, and Retention

## Delivered in prototype
- Reports / intelligence library
- Latest interview feature card
- Archive view
- Curated community feed surface
- Saved-offline indicator
- Links back to Today and Team Room

## Production implementation
- `reports`, `community_posts`, and `report_saves` tables with RLS
- Admin publishing workflow with versioning
- Service-worker runtime caching for latest five reports
- IndexedDB cache metadata and stale-content labels
- VAPID push subscriptions per device
- Daily reminder job at member local time
- New-report push notification job
- Expired subscription cleanup
- Notification preferences, quiet hours, and iOS install guidance
- Offline report detail route with readable HTML summary

## Exit criteria
- Latest report can be published, opened, cached, and read offline.
- A new report reaches eligible members through push where supported.
- Denied/unavailable push has an in-app fallback.
- Private member data is never placed in report/community payloads.
- Admin can unpublish/correct a report and update its cache version.
