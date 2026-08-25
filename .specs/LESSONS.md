# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Give every boundary branch of a checksum or check-digit algorithm its own positive fixture, not just the common case.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: auth-e-usuarios
- evidence: M2 - src/lib/validation/cpf.ts:12 (validation)
- last seen: 2026-08-25T13:30:52Z

### L-002 - When a spec clause is not observable through the external interface, cite the ordered code path as evidence and flag the gap explicitly instead of claiming test coverage.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: auth-e-usuarios
- evidence: CA-AU-03 - src/app/api/auth/login/route.ts:31-43 (specs)
- last seen: 2026-08-25T13:30:52Z

### L-003 - Never place a guard's redirect target under the layout that runs that guard; put redirect targets in a sibling route group guarded only by session.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: auth-e-usuarios
- evidence: SPEC_DEVIATION - src/app/(onboarding)/layout.tsx:3-13 (routes)
- last seen: 2026-08-25T13:30:53Z

### L-004 - Keep constants that edge or proxy code needs in a zero-dependency module so the proxy never transitively imports a database client.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `proxy` · harmful: 0
- features: auth-e-usuarios
- evidence: SPEC_DEVIATION - src/lib/auth/session-cookie.ts:1-12 (proxy)
- last seen: 2026-08-25T13:30:54Z

### L-005 - Use redirect-based session guards only for pages and layouts; API routes must read the session directly and return an explicit 401.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: auth-e-usuarios
- evidence: SPEC_DEVIATION - src/lib/auth/guards.ts:7-9 (routes)
- last seen: 2026-08-25T13:30:54Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
