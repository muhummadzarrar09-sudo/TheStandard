# Weekly Accountability Track

Implemented:

- Weekly commitment tables with cohort/week ownership.
- RLS for active cohort commitments.
- Per-member completion and private note storage.
- Authenticated GET/PUT commitment API.
- Weekly commitment component with persisted completion state.
- Dashboard integration below schedule execution and before daily reflection.

Behavior loop:

`weekly standard → daily execution → weekly commitment → daily private reflection`
