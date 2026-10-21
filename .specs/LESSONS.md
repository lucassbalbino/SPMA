# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-014 - Assert every conjunct of a multi-part criterion; proving the action succeeded leaves the resulting-state half unverified.
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `tests` · harmful: 1
- features: cadastro-ofertante-verba, avaliacao-aluno
- evidence: CA-OV-12 - e2e/verbas-id.spec.ts:96-115 (tests) (+1 more)
- last seen: 2026-10-13T13:02:07Z

### L-030 - When a spec AC lists multiple visible facts for one UI element (name, number, balance, etc.), assert each fact's rendered text individually - a testid match or a single field checked is not evidence for the others.
- signal: `ac_gap` · recurrence: 2 feature(s) · scope: `e2e` · harmful: 0
- features: criacao-curso-por-am, alteracoes-mtur-1
- evidence: CURSO-02 (e2e/pre-cursos-novo.spec.ts:73-84) (e2e) (+1 more)
- last seen: 2026-10-20T12:33:39Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-031 - When a spec edge case names multiple actor scenarios (e.g. 'for role A ... ; for role B ...'), write a dedicated test for each named actor - one representative role's test is not evidence for the others when the underlying query branches by role.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: criacao-curso-por-am
- evidence: CURSO-09 (e2e/pre-cursos-novo.spec.ts:125-131) (e2e)
- last seen: 2026-09-09T23:52:24Z

### L-032 - Never let a test fixture re-implement the production rule it is meant to check; assert the observed output instead.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: respostas-normalizadas
- evidence: M5 - src/lib/respostas/repositorio.ts:179 (validation.md, Lacuna 2) (tests)
- last seen: 2026-09-11T08:48:56Z

### L-033 - Seed every value shape a requirement admits, not only the simplest one; a fixture with one shape hides the lossy path.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: respostas-normalizadas
- evidence: RESP-14 - src/lib/respostas/forma.ts:56 (validation.md, Lacuna 1) (tests)
- last seen: 2026-09-11T08:48:56Z

### L-034 - Assert every conjunct of a multi-part criterion; proving the action succeeded leaves the resulting-state half unverified.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: respostas-normalizadas
- evidence: RESP-21 - src/lib/respostas/repositorio.integration.test.ts:240 (validation.md, Lacuna 3) (tests)
- last seen: 2026-09-11T08:49:03Z

### L-035 - An untouched-file argument does not cover behaviour that moved into changed callers; cite a test that exercises the criterion.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `traceability` · harmful: 0
- features: respostas-normalizadas
- evidence: RESP-12 - spec.md:148 (validation.md, RESP-12) (traceability)
- last seen: 2026-09-11T08:49:04Z

### L-036 - Assert an index is a candidate for the query (possible_keys), not that the optimiser picked it (key); small test tables make key flaky.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `database` · harmful: 0
- features: respostas-normalizadas
- evidence: tasks.md T17 SPEC_DEVIATION - agregacao.integration.test.ts:163 (database)
- last seen: 2026-09-11T08:49:04Z

### L-037 - A mandatory-redirect guard that runs in a protected route group's own layout must target a sibling route group, never a page inside that same protected group, or the redirect loops on itself.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `auth-guards` · harmful: 0
- features: dados-pessoais-separados
- evidence: src/app/(protegido)/layout.tsx:9-22 (SPEC_DEVIATION: /dados-pessoais vs /painel) (auth-guards)
- last seen: 2026-09-12T00:33:35Z

### L-038 - When a form's completeness gates navigation access rather than just a UI section, its write route must persist all-or-nothing on the merged resulting state, never a shallow merge that can leave the record partially overwritten.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `respostas-repo` · harmful: 0
- features: dados-pessoais-separados
- evidence: src/app/api/usuarios/me/dados-pessoais/route.ts:63-81 (SPEC_DEVIATION: tudo-ou-nada vs merge raso de AVAL-07) (respostas-repo)
- last seen: 2026-09-12T00:33:38Z

### L-039 - When an entity absorbs the table it used to point at, its own copy of that foreign key must be null on creation, never a value still required from the request payload.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: unificacao-ofertante-go
- evidence: src/app/api/usuarios/route.ts:113 (SPEC_DEVIATION: cdOfertante do proprio GO criado fica sempre null) (routes)
- last seen: 2026-09-12T23:51:04Z

### L-040 - Assert every conjunct of a multi-part criterion; proving the action succeeded leaves the resulting-state half unverified.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: primeiro-acesso-senha-em-branco
- evidence: validation.md M8 (route.ts:78, Assumption CPF e IP) (tests)
- last seen: 2026-10-13T09:45:28Z

### L-041 - When a criterion says a check runs on every path, assert it once per distinct entry state; covering two of three states leaves the third free to skip it.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: primeiro-acesso-senha-em-branco
- evidence: validation.md PASB-05 / M7 (route.ts:57) (auth)
- last seen: 2026-10-13T09:45:29Z

### L-042 - Seed every field a preservation criterion names with a non-default value; a whole-row equality over null columns cannot detect them being cleared.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: gestao-de-usuarios
- evidence: M10 src/lib/usuarios/gestao.ts:103 / GU-35 gestao.integration.test.ts:217 (tests)
- last seen: 2026-10-13T13:02:03Z

### L-043 - Assert a schema-transformed value on the persisted row, not only on the schema output.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: gestao-de-usuarios
- evidence: M9 src/lib/usuarios/gestao.ts:72 / GU-25 gestao-usuario.schema.test.ts:59 (tests)
- last seen: 2026-10-13T13:02:04Z

### L-044 - Prove a no-data-in-URL criterion by asserting the URLs of the requests the UI actually sends, not the URL the test itself built.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: gestao-de-usuarios
- evidence: GU-48 e2e/usuarios-gestao.spec.ts:157 (UI requests unobserved) (e2e)
- last seen: 2026-10-13T13:02:05Z

### L-045 - Give each spec edge case its own row in the Test Coverage Matrix; unmapped edge cases ship untested.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: gestao-de-usuarios
- evidence: spec.md Edge Cases: last row emptied after edit; empty GO list (tests)
- last seen: 2026-10-13T13:02:05Z

### L-046 - When an AC states a layout order, assert the order, not just that both elements render.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: gestao-de-usuarios
- evidence: GU-03 acima da lista (no order assertion) (e2e)
- last seen: 2026-10-13T13:02:06Z

### L-047 - Name the exact error message for every validation branch an AC lists.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: gestao-de-usuarios
- evidence: GU-26 nome > 255 message (spec)
- last seen: 2026-10-13T13:02:06Z

### L-048 - State one final state per record across ACs; never list a record as both moved and deleted.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: gestao-de-usuarios
- evidence: GU-33 x GU-34 sessoes (spec)
- last seen: 2026-10-13T13:02:07Z

### L-049 - In a data-migration test, seed every rewritten old value under an unrelated key too, so dropping any UPDATE's key filter fails a test.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `database` · harmful: 0
- features: alteracoes-mtur-1
- evidence: M9 prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:43 (database)
- last seen: 2026-10-20T12:33:40Z

### L-050 - Write a removed-text grep criterion with the full old phrase, never a fragment that also appears in untouched content.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: alteracoes-mtur-1
- evidence: spec.md Success Criteria grep 'quais ações fundamentais' (PreCursoForm.tsx:350, Q26 untouched) (spec)
- last seen: 2026-10-20T12:33:40Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
