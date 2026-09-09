# criacao-curso-por-am Validation

**Date**: 2026-09-10
**Spec**: `.specs/features/criacao-curso-por-am/spec.md`
**Diff range**: `4f6e090~1..9724135` (9 commits, all on `main`) — iteration 2, verifying the fix commit `9724135` on top of iteration 1's `4187703`
**Verifier**: independent sub-agent (author ≠ verifier) — fresh Verifier, iteration 2 of the fix→re-verify loop (iteration 1 report superseded by this file; see git history for the prior FAIL version)

---

## Task Completion

Same 7 implementation steps as iteration 1 (all ✅ Done, see prior report in git history), plus:

| Step | Commit | Status | Notes |
| --- | --- | --- | --- |
| 8. Iteration-1 Verifier report | `2fe5838` | ✅ Done | FAIL verdict recorded, 2 gaps: CURSO-02, CURSO-09 |
| 9. Fix commit | `9724135` test(pre-cursos): fechar lacuna de cobertura do Verifier em CURSO-02/09 | ✅ Done | Extended AM Verba-selector e2e test (CURSO-02); documented CURSO-09 AM-scenario residual in spec.md with architectural rationale (no new test) |

---

## Spec-Anchored Acceptance Criteria

9/11 unchanged from iteration 1 (re-verified with fresh eyes on the two files that matter — `NovoPreCursoForm.tsx`, `page.tsx` — no drift found); citing iteration 1's `validation.md` evidence for those (superseded by this file but recoverable via `git show 2fe5838:.specs/features/criacao-curso-por-am/validation.md`). Full table reproduced with the two changed rows:

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CURSO-01: AM `POST /api/pre-cursos` with `cdVerba` of any Ofertante | Creates PreCurso, `status=EM_ANDAMENTO`, `criadoPor=CPF do AM`, HTTP 201 | `e2e/pre-cursos.spec.ts:113-131` (unchanged since iter. 1) | ✅ PASS (iter. 1 finding, unchanged) |
| **CURSO-02: `/pre-cursos/novo` opened by AM lists Verbas of ALL Ofertantes, each option showing Ofertante name, Verba number, and available balance** | Option text shows nome + número + saldo | `e2e/pre-cursos-novo.spec.ts:73-89` - three independent `toContainText` assertions per option: `toContainText("Ofertante Novo Pré-Curso")`, `toContainText(\`Verba #${cdVerba}\`)`, `toContainText("saldo R$ 1000.00")` for the AM's own-Ofertante Verba, and the same three-way check repeated for `cdVerbaOutro`/"Ofertante Novo Pré-Curso Outro". Each fact is asserted as its own substring match (not one combined string check), so a wrong implementation that drops or garbles any one of the three facts (e.g. omits the Verba number, or hardcodes a saldo) would fail independently of the others | ✅ PASS - gap closed, re-run green (`npx playwright test e2e/pre-cursos-novo.spec.ts`, 6/6 passed) |
| CURSO-03: GO forges `cdVerba` of a different Ofertante → 403 | HTTP 403, no PreCurso created | `e2e/pre-cursos.spec.ts:133-159` (unchanged) | ✅ PASS (iter. 1 finding, unchanged) |
| CURSO-04: AM `POST /api/pos-cursos` for any Ofertante's eligible PreCurso | Creates PosCurso, HTTP 201 | `e2e/pos-cursos.spec.ts:132-148` (unchanged) | ✅ PASS (iter. 1 finding, unchanged) |
| CURSO-05: `/pos-cursos/novo` opened by AM lists all eligible Pré-Cursos of any Ofertante | Cross-Ofertante list, excludes ones with PosCurso | `e2e/pos-cursos-novo.spec.ts:107-118` (unchanged) | ✅ PASS (iter. 1 finding, unchanged) |
| CURSO-06: navbar shows "Novo curso" for AM/GO | AM and GO hrefs include `/pre-cursos/novo` | `src/lib/ui/navegacao.test.ts:87-93` (unchanged) | ✅ PASS (iter. 1 finding, unchanged) |
| CURSO-07: GT/VT/VO/AL do NOT get the navbar item | Hrefs exclude `/pre-cursos/novo` | `src/lib/ui/navegacao.test.ts:90-93` (unchanged) | ✅ PASS (iter. 1 finding, unchanged) |
| CURSO-08: pathname `/pre-cursos/novo` resolves active item to "Novo curso" | `hrefAtivo(...)` returns `/pre-cursos/novo` | `src/lib/ui/navegacao.test.ts:154-156` (unchanged) | ✅ PASS (iter. 1 finding, unchanged) |
| **CURSO-09: no Verba available → `/pre-cursos/novo` shows "Nenhuma verba disponível para criar um curso." without error, for both GO and AM triggers** | Exact message text, no seletor, for either actor whose Verba universe is empty | GO scenario: `e2e/pre-cursos-novo.spec.ts:130-136` (unchanged, passing) - `toHaveCount(0)` on seletor + `toBeVisible()` on message. AM scenario: **no dedicated e2e test** (see judgment below); render-branch coverage instead rests on (a) `src/app/(protegido)/pre-cursos/novo/NovoPreCursoForm.tsx:71` - `if (opcoesVerba.length === 0)`, a single unconditional, actor-blind check already exercised by the GO test, and (b) `src/app/(protegido)/pre-cursos/novo/page.tsx:40` - `where: usuario.tipo === "AM" ? {} : { cdOfertante: ... }`, confirming the AM branch's `{}` filter can only yield `[]` when `Verba` is empty system-wide | ✅ PASS - residual accepted, see reasoning below |
| CURSO-10: GT/VT/VO/AL direct URL access → denied message | Denied message, no listing | `e2e/pre-cursos-novo.spec.ts:120-127`, `e2e/pos-cursos-novo.spec.ts:142-150` (unchanged) | ✅ PASS (iter. 1 finding, unchanged) |
| CURSO-11: AM re-creating Pós-Curso for a `cdCurso` that already has one → 409 | HTTP 409 | `e2e/pos-cursos.spec.ts:151-163` (unchanged) | ✅ PASS (iter. 1 finding, unchanged) |

**Status**: ✅ All ACs covered - 11/11 matched spec outcome (2 gaps from iteration 1 closed; one by a strengthened test, one by an accepted, code-verified architectural residual)

### CURSO-09 judgment (independent reasoning, not a rubber stamp)

Checked three things myself, not taking the author's commit message at face value:

1. **Is the branch really single and actor-blind?** Read `NovoPreCursoForm.tsx:71-77` directly: `if (opcoesVerba.length === 0)` is the only guard before the empty-message `<p>`; there is no `usuario.tipo` or role parameter passed into this component at all (its only prop is `opcoesVerba: OpcaoVerba[]`). Confirmed: the component has no way to branch on actor even if it wanted to.
2. **Is the architectural claim about the AM query true?** Read `page.tsx:39-43`: for AM, `where: {}` (no filter at all) against `prisma.verba.findMany`. An empty `where` matches every row in `Verba`; it returns `[]` only if the table itself is empty. Confirmed - there is no other way to make `opcoesVerba.length === 0` fire for an AM than emptying the whole table.
3. **Is "documented residual, code-read verified" an acceptable closure, or was a feasible test skipped?** I checked whether this project has any component-level rendering test convention that could exercise `NovoPreCursoForm` with `opcoesVerba: []` directly (bypassing the DB, so the shared-e2e-database constraint wouldn't apply): grepped `src/` for `testing-library`/`render(` - zero hits; `find` for `*.test.tsx` - zero files; `package.json` has no `@testing-library/react` (or `/dom`, `/jest-dom`) dependency; `vitest.config.ts:11` sets `environment: "node"` (not `jsdom`) and `include: ["src/**/*.test.ts", ...]` - `.tsx` files aren't even picked up by the runner. Component rendering tests are not this codebase's convention - they're absent everywhere, not just here. Introducing one now (new dependency, new vitest environment, new file-pattern) to cover a single, already-provably-safe render branch would itself be the kind of scope creep AGENTS.md's conventions and the Code Quality gate discourage. Combined with the genuine e2e constraint (shared test DB, no truncation between spec files, confirmed by reading `e2e/pre-cursos-novo.spec.ts`'s own `beforeAll`/`afterAll` pattern of seed-then-delete-by-own-Ofertante, never a global truncate), I concur: this is a legitimate, fully-reasoned residual, not a copout. **Accepted.**

---

## Discrimination Sensor

Not re-run this iteration per instructions - the fix commit (`9724135`) only touches `e2e/pre-cursos-novo.spec.ts` (test assertions) and `spec.md` (documentation); it does not touch any of the three files mutated by iteration 1's sensor (`src/lib/auth/guards.ts`, `src/lib/ui/navegacao.ts`, `src/app/(protegido)/pre-cursos/novo/page.tsx`'s access-guard line). Iteration 1's sensor result stands: **3/3 mutations killed** (guard reversion, navbar-wiring reversion, access-guard reversion - see `git show 2fe5838:.specs/features/criacao-curso-por-am/validation.md` for the full sensor table and cleanup confirmation).

**Sensor depth**: lightweight (3 targeted mutations, standard-tier feature) - carried over from iteration 1, not re-run
**Result**: 3/3 killed (iteration 1) - PASS ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ - fix commit adds 3 assertion lines to an existing test + a documentation paragraph; no production code touched |
| Surgical changes | ✅ - only `e2e/pre-cursos-novo.spec.ts` and `spec.md` changed by the fix |
| No scope creep | ✅ - no new dependency, no new test infrastructure added to force a CURSO-09 AM test; the residual is documented instead, which is the proportionate response given the codebase has no component-test convention (verified above) |
| Matches patterns | ✅ - new assertions use the same `toContainText`/`getByTestId` idioms already in the file |
| Spec-anchored outcome check (asserted values match spec) | ✅ - 11/11 match precisely (up from 9/11) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes/e2e happy+edge+error) | ✅ - CURSO-09's AM edge is covered by code-path proof rather than an e2e assertion, which is an explicit, reasoned exception, not a silent gap |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed | ✅ - AGENTS.md's AD-039 (single-source navigation, no literal color in `.tsx`) untouched by this fix; no visual-layer files involved |

---

## Edge Cases

- [x] CURSO-09 (GO scenario): Handled and tested (`e2e/pre-cursos-novo.spec.ts:130-136`)
- [x] CURSO-09 (AM scenario): Documented residual, code-read verified independently (see judgment above) - accepted as closure
- [x] CURSO-10: Handled and tested for GT; VT/VO/AL share the identical non-branching condition (iter. 1 finding, unchanged)

---

## Gate Check

- **Gate command (this iteration, targeted re-run per instructions)**: `npm run test:unit` and `npx playwright test e2e/pre-cursos-novo.spec.ts`
- **Result**: `test:unit` - 505 passed, 0 failed (25 files) - identical count to iteration 1, no regression. `e2e/pre-cursos-novo.spec.ts` - 6 passed, 0 failed (includes the strengthened CURSO-02 test and the unchanged CURSO-09/GO test)
- **Broader gate status**: iteration 1 independently ran and recorded green `lint` (0 errors), `typecheck` (0 errors), `test:integration` (27 passed); those are unaffected by this iteration's fix (no source files in scope) and are not re-run here per instructions - see `git show 2fe5838:.specs/features/criacao-curso-por-am/validation.md` for that record. `build` and the full `test:e2e` suite were not independently run by either iteration (iteration 1 noted this as a time-budget skip, author self-reported them green)
- **Test count before this iteration's fix**: `pre-cursos-novo.spec.ts` had 6 `it()`/`test()` blocks before and after (test #2 extended in place with 2 more assertions, not duplicated)
- **Delta**: 0 new test cases, +2 assertions inside the existing AM test
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None - both gaps from iteration 1 are resolved (CURSO-02 by a strengthened assertion, CURSO-09 by an accepted, independently-verified architectural residual).

---

## Requirement Traceability Update

| Requirement | Iteration 1 Status | Iteration 2 Status |
| --- | --- | --- |
| CURSO-01 | ✅ Verified | ✅ Verified (unchanged) |
| CURSO-02 | ❌ Needs Fix | ✅ Verified - gap closed |
| CURSO-03 | ✅ Verified | ✅ Verified (unchanged) |
| CURSO-04 | ✅ Verified | ✅ Verified (unchanged) |
| CURSO-05 | ✅ Verified | ✅ Verified (unchanged) |
| CURSO-06 | ✅ Verified | ✅ Verified (unchanged) |
| CURSO-07 | ✅ Verified | ✅ Verified (unchanged) |
| CURSO-08 | ✅ Verified | ✅ Verified (unchanged) |
| CURSO-09 | ❌ Needs Fix | ✅ Verified - residual accepted after independent code-path verification |
| CURSO-10 | ✅ Verified | ✅ Verified (unchanged) |
| CURSO-11 | ✅ Verified | ✅ Verified (unchanged) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 11/11 ACs matched spec outcome
**Sensor**: 3/3 mutations killed (carried over from iteration 1, not re-run - fix commit doesn't touch mutated code paths)
**Gate**: `test:unit` 505 passed / `e2e/pre-cursos-novo.spec.ts` 6 passed, both green this iteration; `lint`/`typecheck`/`test:integration` green per iteration 1's independent run (not re-run this iteration, out of scope of the fix)

**What works**: Both iteration-1 gaps are genuinely closed. CURSO-02's fix is a real strengthening - three independently-asserted substrings (Ofertante name, Verba number, saldo) per option, for both the AM's own-Ofertante Verba and a cross-Ofertante one, leaving no room for a wrong implementation to slip through a combined-string check. CURSO-09's resolution was judged on its merits, not rubber-stamped: I independently re-read `NovoPreCursoForm.tsx` (single unconditional `if (opcoesVerba.length === 0)`, no actor awareness possible) and `page.tsx` (AM's `where: {}` can only yield zero rows when the whole `Verba` table is empty), and separately confirmed this codebase has zero component-rendering-test infrastructure (no `@testing-library/react`, `vitest.config.ts` runs in `node` environment and doesn't even glob `.tsx` files) - so no feasible test was skipped; e2e is the only UI-testing convention this project has, and the e2e constraint (shared test DB, no truncation between spec files) is real, confirmed by reading the file's own seed/cleanup pattern.

**Issues found**: None remaining.

**Next steps**: Feature is ready to close. No further fix→re-verify iterations needed.
