# Phase 5 — Post-MVP Intelligence and Operations

Phase 5 begins only after the first cohort produces real behavior data. It must not silently turn the strict schedule into an opaque algorithm.

## Started in workspace

- `/admin/analytics` — aggregated cohort health surface
- `/schedule` — versioned schedule-template selector surface
- Privacy boundary: analytics excludes private reflections and personal notes
- Adaptive scheduling is explicitly disabled until validated

## Planned build tracks

1. **Admin operations:** member management, cohort analytics, report publishing, enrollment controls, intervention notes.
2. **Schedule templates:** multiple cohort-approved templates, versioning, preview, rollback, effective dates.
3. **Team milestones:** deliverables, owners, due dates, progress evidence, review states.
4. **Personal exports:** CSV/PDF of a member's own progress only.
5. **Adaptive scheduling research:** rules-based experiments first; no opaque behavioral score or guaranteed-success language.
6. **Cohort learning:** compare templates and outcomes without exposing private member data.

## Guardrails

- No adaptive schedule changes without member visibility and an override explanation.
- No health, financial, or psychological inference from completion data.
- No leaderboard ranking from hidden or unreviewable variables.
- Admin analytics are aggregated by default and auditable.
- Every schedule-template change is versioned and reversible.
