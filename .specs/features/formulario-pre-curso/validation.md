# formulario-pre-curso Validation

**Date**: 2026-08-27 (iteration 2)
**Spec**: `.specs/features/formulario-pre-curso/spec.md`
**Diff range**: `9324083^..HEAD` (15 commits, `docs(pre-curso): add spec` .. `fix(pre-curso): reject inverted planning dates on write`)
**Verifier**: independent sub-agent (author ≠ verifier), fresh eyes for iteration 2

---

## Iteration history

- **Iteration 1** (commits `9324083^..50026fd`): FAIL. 3 gaps found — (1, Major) inverted planning dates never rejected, zero coverage; (2, Minor) REQ-PC-05's PATCH 400 body doesn't literally name the field (inherited Zod v4 convention, shared by 9 route files, correctly out of scope); (3, Minor) `validarCompletudePreCurso`'s `pendentes` list under-reported the 3 conditional gates while other required fields were also missing (Zod `.superRefine`-on-base-schema skip).
- **Orchestrator fix** (`e8fb8ed`, `3626817`): added `ordemDatasValida` (checked against the PATCH route's merged state) for gap #1; rewrote `completude.ts` to run conditional checks (`pendenciasCondicionais`) independently of the base schema's success for gap #3; deliberately left gap #2 untouched as out of scope.
- **Iteration 2** (this report): independently re-verified both fixes hold, gap #2 is still correctly present and still correctly scoped, re-ran the full spec-anchored AC table, re-ran Build+Full gates, ran a fresh discrimination sensor targeted at the two fixes. **Result: PASS.**

---

## Task Completion

All 10 original tasks (T1–T10) were already done per iteration 1. The two fix commits are unplanned, correctly-scoped remediation of Verifier-found gaps (standard fix→re-verify loop), not new tasks requiring their own task-list entries.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T10 | ✅ Done | Unchanged since iteration 1 |
| Fix #1 (date ordering) | ✅ Done | `ordemDatasValida` in `src/lib/validation/schemas/pre-curso.schema.ts:276-285`, wired in `src/app/api/pre-cursos/[id]/route.ts:99-108` |
| Fix #3 (pendentes completeness) | ✅ Done | `pendenciasCondicionais` in `src/lib/pre-curso/completude.ts:24-81`, merged in `validarCompletudePreCurso` (`completude.ts:88-97`) |

---

## Independent re-check of the two fixes

**Fix #1 — `ordemDatasValida`** (re-derived spec outcome: edge case says "QUANDO `planejDataTerminoPrevista` é anterior a `planejDataInicioPrevista`, o sistema SHALL rejeitar a gravação desses dois campos com HTTP 400"):

- Logic (`pre-curso.schema.ts:276-285`): returns `true` (valid) whenever either date is absent — correct, since the rule only applies once both are known, and legitimate partial saves may set one date at a time. Returns `dados.planejDataTerminoPrevista >= dados.planejDataInicioPrevista` when both are present — `>=` (not `>`) correctly accepts a same-day course, only rejecting strictly-earlier término, matching "anterior" (earlier than) in the spec wording, not "anterior ou igual."
- Call site (`route.ts:97-108`): the check runs against `respostasMescladas` (existing DB respostas + incoming PATCH), not the raw request body — confirmed by reading the surrounding code, this is what makes the split-PATCH scenario work.
- Test coverage, both scenarios required by this task: same-PATCH (`e2e/pre-cursos-id.spec.ts:132-150`, sends both dates inverted in one PATCH, asserts 400 + no persisted change) and split-PATCH (`e2e/pre-cursos-id.spec.ts:152-176`, sets início in PATCH 1 (200), término-before-início in PATCH 2 (400), asserts respostas unchanged after the rejected PATCH). Both assert the literal spec-defined outcome (400, no data mutation), not just "some 400."
- Legitimate partial saves: `pre-curso.schema.test.ts:309-335` proves equal dates valid, término-after-início valid, only-one-date-present valid (both directions), neither-present valid — a lone date save is never wrongly rejected. Confirmed by independent re-run (see Discrimination Sensor).
- **Verdict: fix holds, no gaps.**

**Fix #3 — `pendenciasCondicionais`** (re-derived spec outcome: REQ-PC-10 — closure rejection "listing the pending required keys," which by extension is what a live "what's left" computation must also do faithfully):

- Empirically re-ran the exact repro from iteration 1's finding: `validarCompletudePreCurso({ publicoInstituicaoExecutora: "Empresa contratada" })` — confirmed via the checked-in regression test (`completude.test.ts:181-194`) which asserts exactly this call includes `publicoInstituicaoExecutoraNome` in `pendentes` even with 55 other fields also missing. Read the implementation: `pendenciasCondicionais` (`completude.ts:24-81`) evaluates the 9 conditional keys against the raw `respostas` object directly (no dependency on `respostasPreCursoSchema.safeParse` succeeding first), and `validarCompletudePreCurso` (`completude.ts:88-97`) unions this with the base schema's own issue list via `[...new Set(...)]` — this removes the Zod `.superRefine`-skip dependency entirely, not just patches around it.
- Already-passing tests unaffected: the fully-complete fixture still yields `completo=true, pendentes=[]` (`completude.test.ts:77-82`); REQ-PC-07 (`:90-96`), REQ-PC-08 both directions (`:98-131`), REQ-PC-09 all 5 fields (`:133-171`) all still pass with the new implementation.
- **Verdict: fix holds, no gaps.**

**Gap #2 — REQ-PC-05 field-identification (left alone, as intended)**:

- Re-confirmed still present: `route.ts:89` still returns `entrada.error.issues[0]?.message ?? "Dados inválidos"` with no `path`. `grep -rl "issues\[0\]?.message" src/app/api` → 9 files, unchanged count from iteration 1's finding — this route was not singled out for a fix that 8 sibling routes didn't also get, so scope discipline holds (no inconsistent partial fix within this one feature).
- **Verdict: correctly left alone. Not a regression, not scope creep.**

---

## Spec-Anchored Acceptance Criteria (full re-derivation, REQ-PC-01..15)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| REQ-PC-01: GO creates pré-curso, `validarAlocacao` approves | 201, `status=EM_ANDAMENTO`, `respostas=null`, `criadoPor=CPF` | `e2e/pre-cursos.spec.ts:57-77` | ✅ PASS |
| REQ-PC-02: `vlCursoAlocado` exceeds saldo → 400 + `saldoDisponivel` | 400, `saldoDisponivel` in body, no record created | `e2e/pre-cursos.spec.ts:79-93` | ✅ PASS |
| REQ-PC-03: `cdVerba` of another Ofertante → 403 (no 404 leak) | 403, no record created | `e2e/pre-cursos.spec.ts:109-138` | ✅ PASS |
| AD-016: `vlCursoAlocado` == saldo → accepted | 201 | `e2e/pre-cursos.spec.ts:95-107` | ✅ PASS |
| REQ-PC-04: partial PATCH, shallow merge | 200, only sent keys change, prior keys survive next PATCH | `e2e/pre-cursos-id.spec.ts:73-113` | ✅ PASS |
| REQ-PC-05: shape validation 400 + field identification | 400; field name literally in body | `route.ts:87-92` returns message only, no `path` | ⚠️ Spec-precision gap (unchanged, inherited, out of scope — see above) |
| REQ-PC-06: infra item accepts only int 0-5 | 400 on out-of-range | `pre-curso.schema.test.ts:151-194`; `e2e/pre-cursos-id.spec.ts:115-130` | ✅ PASS |
| REQ-PC-12 (write half): PATCH on `ENCERRADO` → rejected | 409, data unchanged | `e2e/pre-cursos-id.spec.ts` (post date-order tests), `e2e/pre-cursos-encerrar.spec.ts:180-201` | ✅ PASS |
| REQ-PC-07: instituição executora requires nome at closure | closure blocked until filled | `completude.test.ts:90-96`; `e2e/pre-cursos-formulario.spec.ts:261-289` | ✅ PASS |
| REQ-PC-08: `infraEspecificaNecessidade="Sim"` requires 3 fields | closure blocked until filled | `completude.test.ts:98-131` | ✅ PASS |
| REQ-PC-09: 5 "Outro/Outra" fields require free text | closure blocked until filled | `completude.test.ts:133-171` | ✅ PASS |
| REQ-PC-10: closure with missing field → 400, lists pending keys | 400, `pendentes` contains key, status unchanged | `e2e/pre-cursos-encerrar.spec.ts:107-130`; correctness of the live list now also proven mid-fill by `completude.test.ts:181-194` | ✅ PASS (precision gap from iteration 1 resolved) |
| REQ-PC-11: closure with all 56 fields → `ENCERRADO` + `dataEncerramento` | 200, status + timestamp set | `e2e/pre-cursos-encerrar.spec.ts:132-156` | ✅ PASS |
| REQ-PC-12 (re-closure): second closure on `ENCERRADO` → 409 | 409 | `e2e/pre-cursos-encerrar.spec.ts:158-178` | ✅ PASS |
| AD-018: no route ever transitions `ENCERRADO` → `EM_ANDAMENTO` | no such code path | Confirmed by reading `encerrar/route.ts` + `[id]/route.ts` PATCH | ✅ PASS |
| REQ-PC-13: read scoped by Ofertante | 200 in-scope, 403 out-of-scope | `e2e/pre-cursos-id.spec.ts:196-222` (line range shifted vs. iteration 1 by new tests above them; re-confirmed present) | ✅ PASS |
| REQ-PC-14: listing scoped | GO sees own only; GT sees all | `e2e/pre-cursos.spec.ts:167-200`; `e2e/pre-cursos-page.spec.ts:52-76` | ✅ PASS |
| REQ-PC-15: forged cross-Ofertante request → 403 | 403 regardless of UI state | `e2e/pre-cursos-id.spec.ts` (GO-outro-ofertante tests, post date-order tests); `e2e/pre-cursos-formulario.spec.ts:356-370` | ✅ PASS |
| Story item: VO (read-only) → 403 on write | 403 | `e2e/pre-cursos-id.spec.ts` (VO write test); `e2e/pre-cursos-formulario.spec.ts:340-354` | ✅ PASS |

**Status**: ⚠️ 1 spec-precision gap remains (REQ-PC-05, G3 — unchanged, inherited, correctly out of scope). All other 18 criteria/AC rows PASS with direct file:line evidence, including the two iteration-1 gaps now fully resolved.

---

## Discrimination Sensor (iteration 2 — targeted at the two fixes)

Ran in an isolated `git worktree` (`git worktree add ../SPMA-sensor-scratch HEAD`, `node_modules` junctioned in, never `git stash`). Baseline `git status --porcelain` on the real tree was empty before sensor work and confirmed empty again after worktree removal.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/lib/validation/schemas/pre-curso.schema.ts:284` | `ordemDatasValida`: `>=` → `>` (rejects a same-day término/início pair that should be valid) | ✅ Killed — `pre-curso.schema.test.ts` "término igual ao início -> válido" fails (expected `true`, got `false`) |
| 2 | `src/lib/pre-curso/completude.ts:24` | `pendenciasCondicionais`: made to `return []` unconditionally (all 3 conditional gates disabled) | ✅ Killed — `completude.test.ts`: 8/12 tests fail, including the exact iteration-1 regression test ("pendência condicional aparece mesmo com a maioria dos outros campos... ausentes") |

**Sensor depth**: lightweight (2 targeted mutations, proportional to a non-P0 fix-verification pass — the 3 mutations from iteration 1 covering the rest of the feature's surface, all previously killed, were not re-run since that code was untouched by the fix commits)
**Sensor outcome**: 2/2 mutants killed (all discriminating)
**Isolation verified**: `git status --porcelain` on the real tree matched the empty pre-sensor baseline after cleanup.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — `ordemDatasValida` and `pendenciasCondicionais` are the smallest changes that close each gap |
| Surgical changes | ✅ — only the 6 files touched by the fix commit; gap #2 deliberately not touched |
| No scope creep | ✅ |
| Matches patterns | ✅ — merged-state validation follows the existing shallow-merge PATCH pattern; standalone-function-plus-union follows the existing plain-object style already used elsewhere in the codebase |
| Spec-anchored outcome check | ✅ — both new checks assert the literal spec-defined outcome (400 status + no data mutation; `pendentes` contains the exact key) |
| Every test maps to a spec requirement | ✅ — no unclaimed tests found in the diff |
| Documented guidelines followed | none — strong defaults applied |

---

## Edge Cases (all 6, re-derived from spec.md)

- [x] No Verba with saldo available → creation rejected 400 with saldo info. `e2e/pre-cursos.spec.ts:79-93`.
- [x] Infra item value `0` treated as filled. `completude.test.ts:83-88`.
- [x] Required multi-select sent as `[]` rejected as unfilled. `.min(1)` on every multi-select in `pre-curso.schema.ts`; `pre-curso.schema.test.ts:255-262`.
- [x] `qualifCaracteristicas` includes "Outra" alongside other options still requires the text field. `completude.ts:56-61`; fixture in `completude.test.ts`.
- [x] **`planejDataTerminoPrevista` earlier than `planejDataInicioPrevista` → 400. NOW HANDLED** (flips from iteration 1's confirmed gap). `pre-curso.schema.ts:276-285` + `route.ts:99-108`; `e2e/pre-cursos-id.spec.ts:132-176`; `pre-curso.schema.test.ts:300-338`.
- [x] `cdVerba` of a different Ofertante → 403, no existence leak. `pre-cursos/route.ts:44`; `e2e/pre-cursos.spec.ts:109-138`.

**6/6 edge cases handled.**

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Build gate**: lint 0 errors (17 pre-existing intentional destructure-omit warnings, unchanged from iteration 1), build succeeded, typecheck clean.
- **Unit**: 267 passed, 0 failed (261 → 267, +6: 5 `ordemDatasValida` tests + 1 `completude` regression test — matches the fix commit's diff exactly).
- **Integration**: 27 passed, 0 failed (unchanged from iteration 1 — no integration tests touched).
- **E2E**: 114/115 passed on the full run; 1 failure (`pre-cursos-formulario.spec.ts:291`, the UI-driven "56 fields + encerrar" test). Re-ran this test in isolation 3 times: 2 passed clean, 1 failed on a *different* assertion (`marcarCheckbox` — a checkbox `.click()` not yet reflected as checked before the immediate `toBeChecked()` check, at `pre-cursos-formulario.spec.ts:94`). This is a UI-timing race in a helper untouched by either fix commit, not a regression from `ordemDatasValida`/`pendenciasCondicionais` — the test's own date values (`2026-01-10` / `2026-03-10`) are always in valid order, so the new date-ordering check cannot be the cause. Classified as a second, distinct pre-existing e2e flake (separate from iteration 1's noted `csrf.spec.ts` flake), non-blocking per the same precedent.
- **Result**: 408 passed, 0 failed after accounting for the confirmed flake (267 unit + 27 integration + 114 e2e clean pass), 1 flaky (non-reproducible majority, unrelated to this iteration's fix), 0 skipped.

---

## Fix Plans

None required — both routed gaps from iteration 1 are confirmed fixed; gap #2 remains correctly out of scope. The `marcarCheckbox` UI-click flake surfaced during this iteration's gate run is a pre-existing issue in `e2e/pre-cursos-formulario.spec.ts` unrelated to either fix commit; flagged for awareness, not routed as a fix task for this feature (recommend a follow-up `await expect(item).toBeChecked({ timeout: ... })` or an explicit wait-for-network-idle after `.click()` if it recurs, but this is UI-test infra hardening, not a `formulario-pre-curso` spec gap).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PC-01 | Verified | ✅ Verified |
| PC-02 | Verified | ✅ Verified |
| PC-03 | Verified | ✅ Verified |
| PC-04 | Verified | ✅ Verified |
| PC-05 | Verified w/ gap (G3) | ⚠️ Verified w/ gap (G3, unchanged, out of scope) |
| PC-06 | Verified | ✅ Verified |
| PC-07 | Verified | ✅ Verified |
| PC-08 | Verified | ✅ Verified |
| PC-09 | Verified | ✅ Verified |
| PC-10 | Verified w/ gap (G1) | ✅ Verified (G1 resolved) |
| PC-11 | Verified | ✅ Verified |
| PC-12 | Verified | ✅ Verified |
| PC-13 | Verified | ✅ Verified |
| PC-14 | Verified | ✅ Verified |
| PC-15 | Verified | ✅ Verified |
| Edge case: date ordering | ❌ Needs Fix (G2) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 18/19 criteria rows fully PASS with file:line evidence; 1 unchanged, inherited, out-of-scope spec-precision gap (REQ-PC-05)
**Sensor**: 2/2 new targeted mutations killed (iteration 1's 3 mutations on unrelated, untouched code are still valid and were not re-run)
**Gate**: 408 passed, 0 failed, 0 skipped; 1 flaky e2e test confirmed non-reproducible on the majority of isolated re-runs and unrelated to this iteration's changes; lint/build/typecheck all green

**What works**: All 15 REQ-PC requirements plus all 6 spec-listed edge cases are now implemented and covered, including the previously-missing date-ordering rejection (same-PATCH and split-PATCH) and the previously-incomplete `pendentes` list during genuine incremental fill. Both fixes were independently re-derived against the spec's literal wording (not just checked against the author's test), confirmed not to reject legitimate partial saves, and confirmed via a fresh discrimination sensor to be genuinely load-bearing (not vacuously passing).

**Issues found**: None new. 1 pre-existing, explicitly out-of-scope, minor spec-precision gap remains by design (REQ-PC-05). 1 pre-existing UI-timing flake newly observed in this iteration's gate run (`marcarCheckbox` in `pre-cursos-formulario.spec.ts`), non-blocking, noted for future test-infra hardening.

**Next steps**: None required to close this feature. Optional, non-blocking follow-up: harden the `marcarCheckbox` helper's post-click assertion against timing flake if it recurs in future runs.
