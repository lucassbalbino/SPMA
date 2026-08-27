# formulario-pre-curso Validation

**Date**: 2026-08-27
**Spec**: `.specs/features/formulario-pre-curso/spec.md`
**Diff range**: `9324083^..HEAD` (13 commits, `docs(pre-curso): add spec` .. `feat(pre-curso): add fill-in and closure screen`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `pre-curso.schema.ts` - 56-key schema + option constants, verified by count test |
| T2   | ✅ Done | `podeGerenciarPreCurso` in `guards.ts` |
| T3   | ✅ Done | `validarCompletudePreCurso` in `completude.ts` - see spec-precision gap G1 |
| T4   | ✅ Done | 5 shadcn primitives added, build gate passes |
| T5   | ✅ Done | `POST`/`GET /api/pre-cursos` |
| T6   | ✅ Done | `GET`/`PATCH /api/pre-cursos/[id]` |
| T7   | ✅ Done | `POST /api/pre-cursos/[id]/encerrar` |
| T8   | ✅ Done | `/pre-cursos` listing page |
| T9   | ✅ Done | `/pre-cursos/novo` creation screen |
| T10  | ✅ Done | `/pre-cursos/[id]` fill-in/closure screen (metadata-driven `BLOCOS`/`renderCampo`) |

All 10 tasks marked done in `tasks.md`; none blocked or partial.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| REQ-PC-01: GO creates pré-curso, `validarAlocacao` approves → `EM_ANDAMENTO`, `respostas=null`, `criadoPor` | 201, `status=EM_ANDAMENTO`, `respostas=null`, `criadoPor=CPF` | `e2e/pre-cursos.spec.ts:57-77` - `expect(res.status()).toBe(201)`, `expect(persistido?.criadoPor).toBe(CPF_GO)` | ✅ PASS |
| REQ-PC-02: `vlCursoAlocado` exceeds saldo → 400 + `saldoDisponivel` | 400, `saldoDisponivel` in body, no record created | `e2e/pre-cursos.spec.ts:79-93` - `expect(res.status()).toBe(400)`, `expect(Number(corpo.saldoDisponivel)).toBe(500)` | ✅ PASS |
| REQ-PC-03: `cdVerba` of another Ofertante → 403 (no leak via 404) | 403, no record created, GT listing count unchanged | `e2e/pre-cursos.spec.ts:109-138` - `expect(res.status()).toBe(403)`; count-before/after diff asserted | ✅ PASS |
| AD-016: `vlCursoAlocado` == saldo disponível accepted | 201 | `e2e/pre-cursos.spec.ts:95-107` | ✅ PASS |
| REQ-PC-04: `EM_ANDAMENTO` accepts partial PATCH, shallow merge | 200, only sent keys change, prior keys survive next PATCH | `e2e/pre-cursos-id.spec.ts:73-113` - `expect(corpo.preCurso.respostas).toEqual({...})`, second test confirms merge | ✅ PASS |
| REQ-PC-05: shape validation rejects with 400 + field identification | 400, error body identifies the offending field | `e2e/pre-cursos-id.spec.ts:115-130` only asserts `res.status()`.toBe(400)`; route returns `{ erro: issues[0].message }` with no field name/path (verified: Zod v4 default messages, e.g. `"Too big: expected number to be <=5"`, carry no field identifier; only `issue.path` has it, which the route never forwards) | ⚠️ Spec-precision gap (G3) |
| REQ-PC-06: infra item accepts only int 0-5 | 400 on out-of-range, unit exhaustive over all 17 keys | `src/lib/validation/schemas/pre-curso.schema.test.ts:151-194` (0/5/6/-1/2.5 × 17 keys); `e2e/pre-cursos-id.spec.ts:115-130` (400, nothing persisted) | ✅ PASS |
| REQ-PC-12 (write half): PATCH on `ENCERRADO` → rejected, no data change | 409, data unchanged | `e2e/pre-cursos-id.spec.ts:132-148`, `e2e/pre-cursos-encerrar.spec.ts:180-201` - `expect(res.status()).toBe(409)`, `expect(depois?.respostas).toEqual(antes?.respostas)` | ✅ PASS |
| REQ-PC-07: `publicoInstituicaoExecutora` ∈ {Empresa contratada, Parceria} requires `...Nome` at closure | closure blocked until filled | `src/lib/pre-curso/completude.test.ts:90-96`; `e2e/pre-cursos-formulario.spec.ts:261-289` (55/56 filled, only this key missing → blocked, pendency referenced) | ✅ PASS (see G1 for a related precision gap on the *listing* completeness, not this AC) |
| REQ-PC-08: `infraEspecificaNecessidade="Sim"` requires the 3 conditional fields at closure | closure blocked until filled; "Não" never requires them even empty | `completude.test.ts:98-131` (both directions tested) | ✅ PASS |
| REQ-PC-09: "Outro/Outra" selected in any of the 5 fields requires its free-text field | closure blocked until filled, one test per field (5) | `completude.test.ts:133-171` | ✅ PASS |
| REQ-PC-10: closure with missing required field → 400, lists pending keys, status unchanged | 400, `pendentes` contains the key, `status` stays `EM_ANDAMENTO` | `e2e/pre-cursos-encerrar.spec.ts:107-130` - `expect(corpo.pendentes).toContain("qualifNomeCurso")`, `expect(persistido?.status).toBe("EM_ANDAMENTO")` | ✅ PASS |
| REQ-PC-11: closure with all 56 fields complete → `ENCERRADO`, `dataEncerramento` set | 200, `status=ENCERRADO`, `dataEncerramento` not null | `e2e/pre-cursos-encerrar.spec.ts:132-156` | ✅ PASS |
| REQ-PC-12 (re-closure): second closure attempt on `ENCERRADO` → 409 | 409 | `e2e/pre-cursos-encerrar.spec.ts:158-178` | ✅ PASS |
| AD-018: no route ever transitions `ENCERRADO` → `EM_ANDAMENTO` | no such code path exists | Confirmed by reading `encerrar/route.ts` (only ever sets `ENCERRADO`) and `[id]/route.ts` PATCH (blocks all writes once `ENCERRADO`, including a `status` field, since `respostasPreCursoSchema` has no `status` key) | ✅ PASS |
| REQ-PC-13: read scoped by Ofertante (AM/GT/VT all; GO/VO own only) | 200 in-scope, 403 out-of-scope | `e2e/pre-cursos-id.spec.ts:150-161,177-188` | ✅ PASS |
| REQ-PC-14: listing scoped (AM/GT/VT all with optional filter; GO/VO own only) | GO sees only own Ofertante; GT sees all | `e2e/pre-cursos.spec.ts:167-200`; `e2e/pre-cursos-page.spec.ts:52-76` (UI layer) | ✅ PASS |
| REQ-PC-15: server re-checks authorization on every request, forged cross-Ofertante request → 403 | 403 regardless of UI state | `e2e/pre-cursos-id.spec.ts:163-175`; `e2e/pre-cursos-formulario.spec.ts:356-370` (direct URL access → 404, scoped via `podeAcessarOfertante` in the page) | ✅ PASS |
| Story item: only owning GO writes/closes; VO (read profile) → 403 on any write | 403 for VO write attempts | `e2e/pre-cursos-id.spec.ts:190-202`; `e2e/pre-cursos-formulario.spec.ts:340-354` (UI hides controls) | ✅ PASS |

**Status**: ⚠️ Spec-precision gaps flagged — 1 on REQ-PC-05 (G3). All other 17 criteria/AC rows PASS with direct file:line evidence. (G1 and the edge-case gap G2 below are additional findings tracked in Edge Cases / Fix Plans, not in this AC table, because they don't map to a single REQ row's literal test coverage — they're about precision/completeness of the implementation instead.)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/lib/auth/guards.ts:119` | `podeGerenciarPreCurso`: `&&` → `\|\|` (GO of any Ofertante, or anyone matching the target Ofertante, would pass) | ✅ Killed - `src/lib/auth/guards.test.ts` (2 failures: "GO vinculado a outro ofertante não pode gerenciar", "VO não pode gerenciar, mesmo o próprio ofertante") |
| 2 | `src/lib/pre-curso/completude.ts:33` | REQ-PC-08 gate: `dados.infraEspecificaNecessidade === "Sim"` → `!== "Sim"` (gate inverted) | ✅ Killed - `src/lib/pre-curso/completude.test.ts` (2 failures: necessidade="Sim" case now wrongly complete, necessidade="Não" case now wrongly blocked) |
| 3 | `src/app/api/pre-cursos/[id]/route.ts:74` | PATCH ENCERRADO gate: `status === "ENCERRADO"` → `!== "ENCERRADO"` (blocks all normal writes, allows writes after closure) | ✅ Killed - `e2e/pre-cursos-id.spec.ts` (4 failures, notably REQ-PC-12 test: expected 409, got 200) |

**Sensor depth**: lightweight (3 targeted mutations, proportional to a non-P0 feature)
**Sensor outcome**: 3/3 mutants killed (all discriminating)

**Isolation notes**: Mutations 1-2 ran in a temporary `git worktree` (`git worktree add`); node_modules was junctioned in rather than reinstalled. Mutation 3 required a live Next.js dev server (Playwright `webServer`); Turbopack rejected the worktree's junctioned `node_modules` (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`), so per validate.md's documented fallback the real file was backed up, mutated in place, tested, then restored from the backup immediately after the run. `git status --porcelain` was captured before any sensor work (empty) and re-confirmed empty after mutation 3's restore and after the worktree removal - matches the pre-sensor baseline in both cases. `test-results/` (Playwright output) is gitignored and was not counted against the baseline.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ - only `formulario-pre-curso`-scoped files plus small, justified additions to `guards.ts`, `e2e/helpers/db.ts`, `scripts/e2e-fixture.ts` |
| No scope creep | ✅ |
| Matches patterns | ✅ - RH→CSRF→Sessão→Guard order, `comTratamentoDeErro` wrapping, schema-duplo pattern, Client/Server Component split all mirror `verbas`/`ofertantes` |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ - one gap, REQ-PC-05 (G3) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ - unit tests cover every branch of `pre-curso.schema.ts`/`completude.ts`; e2e covers happy/edge/error/scope for every route |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed | none - strong defaults applied, per `tasks.md` Test Coverage Matrix note |

---

## Edge Cases

- [x] No Verba with saldo available → creation rejected 400 with saldo info, no unhandled exception. `validarAlocacao` always returns `{valido:false, saldoDisponivel}` rather than throwing; covered generically by `e2e/pre-cursos.spec.ts:79-93` (saldo=500, request 999999 → 400 with saldo=500). No dedicated zero-saldo fixture, but the code path is identical regardless of saldo magnitude - not a gap.
- [x] Infra item value `0` treated as filled, not empty, at closure. `completude.test.ts:83-88` (dedicated test), plus `RESPOSTA_COMPLETA` fixture uses `infraBasicaBanheiros: 0` throughout.
- [x] Required multi-select field sent as `[]` rejected as unfilled (not a valid empty list). `respostasPreCursoSchema` uses `.min(1)` on every multi-select array (`publicoPerfil`, `qualifCaracteristicas`, `diagnosticoConsultas`, `docenteCriteriosSelecao`, `docentePoliticasReparacao`, `divulgacaoEstrategias`, `parceriasEstabelecidas`, `suporteEstrategias`); `pre-curso.schema.test.ts:255-262` confirms for `publicoPerfil`.
- [x] `qualifCaracteristicas` includes "Outra" alongside other valid options still requires `qualifCaracteristicasOutra`. `completude.ts:65-68` checks `.includes("Outra")` (not exclusivity); `completude.test.ts` fixture selects `["Sustentabilidade", "Outra"]` and still requires the text field.
- [ ] **`planejDataTerminoPrevista` earlier than `planejDataInicioPrevista` → reject both fields with 400. NOT IMPLEMENTED.** Grep over `pre-curso.schema.ts` and both PATCH-touching routes confirms no date-ordering check exists anywhere; both fields are validated independently as ISO dates only. Real, reproducible gap (G2).
- [x] `cdVerba` belonging to a different Ofertante → 403 even if it exists (no existence leak via 404/400). `pre-cursos/route.ts:44` returns 403 via `podeGerenciarPreCurso(sessao.usuario, verba.cdOfertante)` before any other check on the Verba record; `e2e/pre-cursos.spec.ts:109-138` confirms 403 and that no listing change occurs.

**5/6 edge cases handled; 1 confirmed gap (date-ordering, G2).**

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Build gate**: lint 0 errors (17 pre-existing-style warnings, all intentional destructure-omit unused vars), build succeeded, typecheck clean
- **Result**: 401 passed, 0 failed, 0 skipped (261 unit + 27 integration + 113 e2e)
- **Failures**: none
- **Skipped tests**: none
- **Note**: one benign `[WebServer]` stack trace appeared during `usuarios.spec.ts` (REQ-SEC-11 test deliberately triggers a Prisma unique-constraint violation to prove the generic-500 error handler works) - expected noise, not a failure. Full e2e run took ~12.7 min; no flake observed in this run (all 113 green on the first pass).

---

## Fix Plans (if issues found)

### Fix 1 (G2 - edge case, Major): `planejDataTerminoPrevista` earlier than `planejDataInicioPrevista` is never rejected

- **Root cause**: no cross-field date-ordering check exists in `respostasPreCursoSchema` (`src/lib/validation/schemas/pre-curso.schema.ts`) nor in the PATCH route (`src/app/api/pre-cursos/[id]/route.ts`). Both date fields validate independently via `z.iso.date()`.
- **Fix task**: add a `.refine`/`.superRefine` to `respostasPreCursoSchema` (or a partial-aware variant applied in the PATCH route) that rejects when both dates are present and término < início, returning 400 per the spec's edge case wording ("rejeitar a gravação desses dois campos com HTTP 400"). Needs care: the rule must only fire when BOTH dates are present in a given partial PATCH (a user may legitimately set one date before the other in an earlier save), matching the "gravação desses dois campos" framing.
- **Priority**: Major (a real, spec-listed edge case with zero implementation and zero test coverage - not merely a precision nuance).

### Fix 2 (G3 - spec-precision gap, Minor): REQ-PC-05's "identificação do campo" not literally satisfied in the PATCH error body

- **Root cause**: `[id]/route.ts:86` returns `{ erro: entrada.error.issues[0]?.message ?? "Dados inválidos" }`. Zod v4's default issue `.message` does not include the field name (verified: e.g. `"Too big: expected number to be <=5"` for `infraBasicaBanheiros: 9`); only `issue.path` carries it, and the route never forwards `path`. This is an established, pre-existing convention shared by 9 route files across the codebase (`grep -l "issues[0]?.message" src/app/api` → verbas, ofertantes, usuarios, auth routes too), explicitly reused here per `design.md`'s Error Handling Strategy table ("mesmo padrão das outras rotas").
- **Fix task**: if addressed, either (a) include `issue.path.join(".")` alongside the message in the response body for this route (narrow, feature-scoped fix), or (b) treat as a cross-cutting convention change affecting all 9 routes (broader, likely a separate initiative). Given it's inherited and consistent with an established, deliberate project pattern, low urgency.
- **Priority**: Minor - inherited pattern, not a defect unique to this feature; the UI never actually needs it (client-side field-scoped validation already prevents malformed submissions in practice), so real-world exposure is low.

### Fix 3 (G1 - spec-precision gap, Minor, pre-flagged by author): `validarCompletudePreCurso`'s `pendentes` list is incomplete during a genuinely partial fill state

- **Root cause**: `respostasCompletasSchema` is built as `respostasPreCursoSchema.superRefine(...)`. Zod skips a `superRefine` callback's custom checks when the base object schema already produced validation issues. Confirmed by design/code reading: calling `validarCompletudePreCurso({ publicoInstituicaoExecutora: "Empresa contratada" })` alone (46 other required fields also missing) does NOT surface `publicoInstituicaoExecutoraNome` in `pendentes` - only the base-schema misses are reported until all other fields validate.
- **Assessment (independently reached, not deferred to the author's framing)**: this is a real, reproducible precision defect against REQ-PC-10 ("lista as chaves pendentes"), because a GO who is early in filling the form and checks "what's left" would see an incomplete list that grows a conditional entry only once nearly everything else is done - misleading during normal incremental use, even though it never wrongly *allows* closure (the base-schema failure already blocks it either way, so REQ-PC-07/08/09 themselves are never violated - confirmed above, all three ACs PASS against their literal test evidence). The one e2e test that exercises this path (`e2e/pre-cursos-formulario.spec.ts:261-289`) was deliberately built to leave only the one conditional field missing (per the spec's own Independent Test wording, "mantendo os demais campos obrigatórios completos") - this is a legitimate, spec-faithful test of the closure gate itself, not a device that launders over the `pendentes`-completeness gap; the two are different claims (gate correctness vs. list completeness in a genuinely-partial state), and only the latter is broken.
- **Fix task**: restructure `completude.ts` to run the conditional checks independently of whether the base schema also fails (e.g., call `.safeParse` for the base fields and evaluate the three conditional rules against the raw `respostas` object directly, merging both issue sets), so `pendentes` is complete at any fill state, not just near-total completion.
- **Priority**: Minor - never a correctness/security issue (closure is never wrongly permitted), but a real UX/precision gap in a listed AC's guarantee ("lista as chaves pendentes").

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PC-01 | Implementing | ✅ Verified |
| PC-02 | Implementing | ✅ Verified |
| PC-03 | Implementing | ✅ Verified |
| PC-04 | Implementing | ✅ Verified |
| PC-05 | Implementing | ⚠️ Verified with spec-precision gap (G3) |
| PC-06 | Implementing | ✅ Verified |
| PC-07 | Implementing | ✅ Verified |
| PC-08 | Implementing | ✅ Verified |
| PC-09 | Implementing | ✅ Verified |
| PC-10 | Implementing | ⚠️ Verified with spec-precision gap (G1, pendentes list incomplete mid-fill) |
| PC-11 | Implementing | ✅ Verified |
| PC-12 | Implementing | ✅ Verified |
| PC-13 | Implementing | ✅ Verified |
| PC-14 | Implementing | ✅ Verified |
| PC-15 | Implementing | ✅ Verified |

---

## Summary

**Result**: FAIL ❌ (feature is functionally complete and safe to use - no security/authorization/irreversibility defect found - but has 1 confirmed, unimplemented spec edge case with zero test coverage, plus 2 lower-severity spec-precision gaps; routing the edge case as a fix task before the feature can be marked done)
**Overall**: ⚠️ Issues, not ❌ Not Ready in the risk sense - the gap is scoped and low-blast-radius, but per evidence-or-zero it fails the gate as-is

**Spec-anchored check**: 17/18 criteria rows fully PASS with file:line evidence; 1 flagged ⚠️ spec-precision gap (REQ-PC-05, G3)
**Sensor**: 3/3 mutations killed
**Gate**: 401 passed (261 unit + 27 integration + 113 e2e), 0 failed, 0 skipped; lint/build/typecheck all green

**What works**: Creation with saldo-teto validation and cross-Ofertante rejection (REQ-PC-01/02/03); incremental partial PATCH with shallow merge (REQ-PC-04); shape validation including the 17-key 0-5 infra scale (REQ-PC-05/06); all 3 conditional closure gates (REQ-PC-07/08/09); irreversible closure with pendency reporting (REQ-PC-10/11/12, including the AD-018 no-reopening guarantee); Ofertante-scoped read/write authorization re-checked server-side on every request, including the metadata-driven 56-field UI (REQ-PC-13/14/15). Authorization guard (`podeGerenciarPreCurso`), the closure conditional-gate logic, and the ENCERRADO write-block were all confirmed to be genuinely discriminating via fault injection (3/3 mutants killed).

**Issues found**:
1. (Major) Date-ordering edge case (`planejDataTerminoPrevista` < `planejDataInicioPrevista`) has zero implementation and zero test coverage - genuinely missing, not a false alarm.
2. (Minor) REQ-PC-05's "identificação do campo" isn't literally present in the PATCH error body (message-only, no field name) - inherited from an established, project-wide convention, not novel to this feature.
3. (Minor) `validarCompletudePreCurso`'s `pendentes` list under-reports conditional pendencies while other required fields are still missing (Zod `superRefine` short-circuit) - never lets an incomplete pré-curso close, but misleads the "what's left" view mid-fill.

**Next steps**: Route Fix 1 (date-ordering) as the highest-priority follow-up task given it's a listed edge case with zero coverage. Fixes 2 and 3 are lower urgency (precision/UX, not correctness or security) and can be batched into a small follow-up task at the orchestrator's discretion.
