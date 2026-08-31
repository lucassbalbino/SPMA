# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-014 - Assert every conjunct of a multi-part criterion; proving the action succeeded leaves the resulting-state half unverified.
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `tests` · harmful: 0
- features: cadastro-ofertante-verba, avaliacao-aluno
- evidence: CA-OV-12 - e2e/verbas-id.spec.ts:96-115 (tests) (+1 more)
- last seen: 2026-08-28T17:17:04Z

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

### L-006 - When a spec forbids several forms of the same secret, assert every form the spec names; matching only the hashed form leaves a plaintext leak undetected.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: auth-e-usuarios
- evidence: e2e/primeiro-acesso.spec.ts:53 (mutant M8) (tests)
- last seen: 2026-08-25T18:50:12Z

### L-007 - Assert a forbidden secret's absence against the whole serialized response body, not a property of one nested object, or a leak placed elsewhere in the payload survives.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: auth-e-usuarios
- evidence: M2b - e2e/login.spec.ts:222 (tests)
- last seen: 2026-08-25T20:00:33Z

### L-008 - Order the gate so the build runs before typecheck whenever the framework generates global types into its build directory.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `tooling` · harmful: 0
- features: auth-e-usuarios
- evidence: E4 - src/app/layout.tsx:20 (tooling)
- last seen: 2026-08-25T20:00:33Z

### L-009 - Pin database connection options that survive a cold server auth cache, so the suite does not silently depend on a warm cache after a restart.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `tooling` · harmful: 0
- features: auth-e-usuarios
- evidence: E3 - .env.test:3 (tooling)
- last seen: 2026-08-25T20:00:34Z

### L-010 - A timing-attack test must calibrate its tolerance against the operation it protects (measure the crypto cost in-test), not a wide fixed ratio: under a dev server, framework overhead dwarfs the signal and a band like 0.2-5 passes with and without the normalization.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e/timing-tests` · harmful: 0
- features: seguranca-transversal
- evidence: e2e/login.spec.ts:349-350 (mutant M5) (e2e/timing-tests)
- last seen: 2026-08-26T18:22:38Z

### L-011 - To prove a timing-normalization side effect, assert which operation ran with which argument (e.g. spy the crypto call and check the value passed), not a wall-clock ratio: under a dev server, framework overhead can dwarf the crypto signal so no tolerance band discriminates the mutation, while a call-based assertion is immune to that noise. Supersedes L-010, which prescribed calibrating the wall-clock band instead - that approach was tried and failed the same mutation.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e/timing-tests` · harmful: 0
- features: seguranca-transversal
- evidence: src/app/api/auth/login/route.integration.test.ts (mutant M5, iteration 2) (e2e/timing-tests)
- last seen: 2026-08-26T18:51:01Z

### L-012 - Name every acceptance criterion in some task's Done-when list; a traceability row mapping a requirement to a task does not by itself create coverage.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: cadastro-ofertante-verba
- evidence: CA-OV-13 - .specs/features/cadastro-ofertante-verba/tasks.md:330 (claimed by T2, absent from every Done-when) (specs)
- last seen: 2026-08-26T20:34:15Z

### L-013 - When a criterion requires a clear or specific error, assert the exact error message, not only the HTTP status code.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: cadastro-ofertante-verba
- evidence: CA-OV-09 - e2e/verbas.spec.ts:102 (tests)
- last seen: 2026-08-26T20:34:16Z

### L-015 - When a requirement names an action with no existing target in the codebase, implement the half that exists, mark the other half SPEC_DEVIATION at the call site, and carry it into traceability instead of reporting the requirement closed.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: cadastro-ofertante-verba
- evidence: SPEC_DEVIATION - src/app/api/usuarios/route.ts:6-11 (routes)
- last seen: 2026-08-26T20:34:16Z

### L-016 - A Zod .superRefine chained directly on a base object schema is skipped whenever the base schema already has validation issues, so completeness/pendency-listing logic built that way under-reports conditional gaps during a partial fill; evaluate conditional rules independently of base-field failures instead of via baseSchema.superRefine(...).
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: formulario-pre-curso
- evidence: src/lib/pre-curso/completude.ts:17 (validation)
- last seen: 2026-08-27T13:30:17Z

### L-017 - A cross-field ordering/relational rule explicitly listed as a spec edge case (e.g., end-date must not precede start-date) needs its own Zod .refine/.superRefine check; grep for evidence of each listed edge case's implementation before marking a task done, since independent per-field validation never catches it.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: formulario-pre-curso
- evidence: spec.md edge case: planejDataTerminoPrevista < planejDataInicioPrevista (validation)
- last seen: 2026-08-27T13:30:18Z

### L-018 - Returning only entrada.error.issues[0]?.message on a 400 does not satisfy an AC requiring field identification in the error response - Zod's default issue message omits the field path, so include issue.path alongside the message when the spec explicitly demands identifying the failing field.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: formulario-pre-curso
- evidence: REQ-PC-05, src/app/api/pre-cursos/[id]/route.ts:86 (routes)
- last seen: 2026-08-27T13:30:18Z

### L-019 - When a spec edge case says a later write must preserve already-saved values after a gate flips, write a dedicated test that fills the gated fields, flips the gate back, and asserts the prior values are still present - a generic shallow-merge PATCH is not evidence that this specific case was verified.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: avaliacao-aluno
- evidence: spec.md edge case: avalParticipConcluiuCurso changed Sim to Nao after conditional fields already saved - no test in e2e/avaliacoes-id.spec.ts or e2e/avaliacoes-formulario.spec.ts (tests)
- last seen: 2026-08-28T17:17:11Z

### L-020 - When a path-prefix match is defined with a separator boundary (href + '/'), test a sibling path that shares the prefix without the separator; exact and sub-route cases alone pass with or without the boundary check.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: identidade-visual
- evidence: M2 - src/lib/ui/navegacao.ts:81 (tests)
- last seen: 2026-08-31T07:41:58Z

### L-021 - A no-horizontal-scroll assertion on documentElement is vacuous while the page sets overflow-x:hidden on html/body; measure scrollWidth against clientWidth on the element that can actually overflow.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: identidade-visual
- evidence: E8 - e2e/identidade-visual.spec.ts:145 (e2e)
- last seen: 2026-08-31T07:41:58Z

### L-022 - Assert a layout container's computed max-width and centering, not just that exactly one of it exists; a count assertion still passes after the container classes are removed.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: identidade-visual
- evidence: E7 - src/components/layout/CascaProtegida.tsx:38 (e2e)
- last seen: 2026-08-31T07:41:59Z

### L-023 - To verify a truncation requirement, use a deliberately oversized fixture and assert the element overflows its clientWidth; a default-sized fixture never exercises truncation.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: identidade-visual
- evidence: E9 - src/components/layout/CascaProtegida.tsx:33 (e2e)
- last seen: 2026-08-31T07:41:59Z

### L-024 - When a listed edge case contradicts an acceptance criterion, amend the criterion text before implementing; leaving both makes the AC unsatisfiable as written and its Verified status unearned.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: identidade-visual
- evidence: UI-05 - .specs/features/identidade-visual/spec.md (UI-05 vs Edge Cases) (specs)
- last seen: 2026-08-31T07:42:08Z

### L-025 - Cover a fetch catch branch by aborting the intercepted route; a test that returns a rejected status code exercises the response path and never enters the catch.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: identidade-visual
- evidence: UI-05 - src/components/layout/BotaoSair.tsx:38 (tests)
- last seen: 2026-08-31T07:42:08Z

### L-026 - When a criterion says a feature must not depend on JavaScript, assert it in a context with JavaScript disabled; a passing test in a JS-enabled browser is not evidence.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: identidade-visual
- evidence: UI-07 - e2e/identidade-visual.spec.ts:132 (e2e)
- last seen: 2026-08-31T07:42:09Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
