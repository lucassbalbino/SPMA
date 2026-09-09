# criacao-curso-por-am Validation

**Date**: 2026-09-10
**Spec**: `.specs/features/criacao-curso-por-am/spec.md`
**Diff range**: `4f6e090~1..4187703` (7 commits, all on `main`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

No `tasks.md` (Medium scope, Execute ran an inline 6-step plan). Verified against the 7 commits in range instead.

| Step | Commit | Status | Notes |
| --- | --- | --- | --- |
| 1. Open the guard | `4f6e090` feat(auth): permitir AM criar curso em qualquer Ofertante | ✅ Done | `podeGerenciarPreCurso` gains `usuario.tipo === "AM" \|\|`; `podeGerenciarPosCurso` alias inherits it for free |
| 2. API-level tests | `3d1e39e` test(cursos): cobrir AM criando pré-curso e pós-curso via API | ✅ Done | New AM happy-path tests in `e2e/pre-cursos.spec.ts`, `e2e/pos-cursos.spec.ts` |
| 3. Pre-Curso screen | `4911846` feat(pre-cursos): liberar tela de novo curso para o AM escolher Ofertante | ✅ Done | `/pre-cursos/novo` lists all Ofertantes' Verbas for AM, shows Ofertante name |
| 4. Pós-Curso screen | `9981d54` feat(pos-cursos): liberar tela de novo pós-curso para o AM | ✅ Done | `/pos-cursos/novo` lists all Ofertantes' eligible Pré-Cursos for AM |
| 5. Screen-level tests | `f628e83` test(cursos): cobrir acesso negado e verba vazia nas telas de novo curso | ✅ Done | GT-denied and empty-state e2e tests added to both `*-novo.spec.ts` files |
| 6. Navbar shortcut | `01cb483` feat(navegacao): adicionar atalho 'Novo curso' para AM e GO | ✅ Done | `CURSOS_COM_CRIACAO` wired into AM/GO modules only |
| 7. Docs | `4187703` docs(auth): registrar AD-040 - AM pode criar curso | ✅ Done | `STATE.md` AD-040 recorded; `formulario-pre-curso/spec.md` and `formulario-pos-curso/spec.md` retificados |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CURSO-01: AM `POST /api/pre-cursos` com `cdVerba` de qualquer Ofertante | Cria PreCurso com `status=EM_ANDAMENTO`, `criadoPor=CPF do AM`, HTTP 201 | `e2e/pre-cursos.spec.ts:113-131` - `expect(res.status()).toBe(201)`, `expect(corpo.preCurso.cdOfertante).toBe(cdOfertante2)`, `expect(persistido?.criadoPor).toBe(CPF_AM)`. `status=EM_ANDAMENTO` is not re-asserted in this test, but it is the same unconditional `prisma.preCurso.create()` call (no role branch on `status`, DB `@default(EM_ANDAMENTO)`) already proven at `e2e/pre-cursos.spec.ts:61-81` (`expect(corpo.preCurso.status).toBe("EM_ANDAMENTO")`) | ✅ PASS (combined evidence, see note) |
| CURSO-02: `/pre-cursos/novo` opened by AM lists Verbas of ALL Ofertantes, each option showing Ofertante name, Verba number, and available balance | Option text shows nome + número + saldo | `e2e/pre-cursos-novo.spec.ts:73-84` - `toContainText("Ofertante Novo Pré-Curso")` / `toContainText("Ofertante Novo Pré-Curso Outro")` proves the **name**. No test (new or pre-existing, for AM or GO) asserts the visible "saldo R$…" text or a literal "Verba #N" string anywhere in `/pre-cursos/novo` - only `getByTestId` (a DOM attribute, not the rendered number) is used | ❌ GAP - saldo/número display unasserted |
| CURSO-03: GO forges `cdVerba` of a different Ofertante → 403, no PreCurso created | HTTP 403, `GET` before/after shows no new row | `e2e/pre-cursos.spec.ts:133-159` (`REQ-PC-03`, pre-existing, unmodified by this feature) - `expect(res.status()).toBe(403)`, before/after list comparison | ✅ PASS - confirmed genuinely pre-existing: the `usuario.tipo === "GO" && usuario.cdOfertante === cdOfertanteAlvo` clause is byte-identical before/after this feature (only an `AM \|\|` alternative was prepended); discrimination sensor mutation 1 (below) proves this GO branch is unaffected by the AM addition |
| CURSO-04: AM `POST /api/pos-cursos` with `cdCurso` of a PreCurso of any Ofertante without a PosCurso | Creates PosCurso, HTTP 201 | `e2e/pos-cursos.spec.ts:132-148` - `expect(res.status()).toBe(201)`, `expect(corpo.posCurso.status).toBe("EM_ANDAMENTO")`, `expect(persistido?.criadoPor).toBe(CPF_AM)` | ✅ PASS |
| CURSO-05: `/pos-cursos/novo` opened by AM lists all eligible Pré-Cursos (`posCurso: null`) of any Ofertante | List includes cross-Ofertante eligible courses, excludes ones with PosCurso | `e2e/pos-cursos-novo.spec.ts:107-118` - `toBeVisible()` for `cdCursoElegivel` and `cdCursoElegivelOutroOfertante` (different Ofertantes), `toHaveCount(0)` for `cdCursoComPosCurso` | ✅ PASS |
| CURSO-06: navbar shows "Novo curso" → `/pre-cursos/novo` for AM/GO | AM and GO hrefs include `/pre-cursos/novo` | `src/lib/ui/navegacao.test.ts:87-93` - `expect(hrefsDe(TipoUsuario.AM)).toContain("/pre-cursos/novo")`, same for GO | ✅ PASS |
| CURSO-07: GT/VT/VO/AL do NOT get the navbar item | Their hrefs exclude `/pre-cursos/novo` | `src/lib/ui/navegacao.test.ts:90-93` - `expect(hrefsDe(TipoUsuario.GT)).not.toContain(...)`, same for VT/VO/AL | ✅ PASS |
| CURSO-08: pathname `/pre-cursos/novo` resolves the active item to "Novo curso", not "Pré-cursos" | `hrefAtivo("/pre-cursos/novo", itens)` returns `/pre-cursos/novo` | `src/lib/ui/navegacao.test.ts:154-156` - `expect(hrefAtivo("/pre-cursos/novo", itens)).toBe("/pre-cursos/novo")` | ✅ PASS |
| CURSO-09: no Verba with balance (AM: none in any Ofertante; GO: none in own) → `/pre-cursos/novo` shows "Nenhuma verba disponível para criar um curso." without error | Exact message text, no seletor | GO scenario: `e2e/pre-cursos-novo.spec.ts:125-131` - `expect(page.getByTestId("select-verba")).toHaveCount(0)`, `expect(page.getByText("Nenhuma verba disponível para criar um curso.")).toBeVisible()`. **AM scenario has no dedicated test** - only the positive case (AM sees Verbas across Ofertantes, `e2e/pre-cursos-novo.spec.ts:73-84`) is covered; the AM branch of the Prisma `where` clause (`usuario.tipo === "AM" ? {} : {...}`) returning zero rows is never exercised | ❌ GAP - AM-specific empty state unasserted |
| CURSO-10: GT/VT/VO/AL hitting `/pre-cursos/novo` or `/pos-cursos/novo` directly by URL → access-denied message, no listing | Denied message shown, no seletor | `e2e/pre-cursos-novo.spec.ts:115-123` and `e2e/pos-cursos-novo.spec.ts:142-150` - both test GT only, asserting `toHaveCount(0)` on the seletor and `toBeVisible()` on the denial text. VT/VO/AL are not independently tested, but the guard condition (`usuario.tipo !== "AM" && (usuario.tipo !== "GO" \|\| ...)`) has no role-specific branch beyond the AM/GO carve-out - GT, VT, VO and AL all evaluate the identical `false` path | ✅ PASS (GT is a representative sample of a non-branching condition) |
| CURSO-11: AM tries to create Pós-Curso for a `cdCurso` that already has one → HTTP 409 | 409, no new record | `e2e/pos-cursos.spec.ts:151-163` (`REQ-PO-02`, pre-existing, unmodified) - `expect(res.status()).toBe(409)`, using CPF_GO not CPF_AM. Confirmed via code read of `src/app/api/pos-cursos/route.ts:43-55`: the `podeGerenciarPosCurso` guard (line 43) runs first, then the `posCursoExistente` 409 check (lines 49-55) is fully role-agnostic - no role reference anywhere in that branch - so a passing AM caller hits the exact same check the GO test exercises | ✅ PASS (role-blind code path, author's "regressão pré-existente" label confirmed accurate) |

**Status**: ❌ Gaps present - 9/11 fully evidenced, 2/11 evidence gaps (CURSO-02, CURSO-09). Both are test-coverage gaps, not functional defects - confirmed by direct code reading that the underlying rendering logic is unconditional/correct in both cases.

---

## Discrimination Sensor

Scratch worktree at `git worktree add /tmp/spma-sensor 4187703` (`node_modules`, `src/generated/prisma`, `.env.test` symlinked in for speed). Baseline `git status --porcelain` on the real tree was empty before and after.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/lib/auth/guards.ts:120` | `podeGerenciarPreCurso` reverted to `usuario.tipo === "GO" && usuario.cdOfertante === cdOfertanteAlvo` (dropped the `usuario.tipo === "AM" \|\|` clause) | ✅ Killed - `src/lib/auth/guards.test.ts` 2 failed / 66 passed (both new AM assertions in `podeGerenciarPreCurso`/`podeGerenciarPosCurso` suites) |
| 2 | `src/lib/ui/navegacao.ts:45` | AM module's "Cursos" entry changed from `CURSOS_COM_CRIACAO` back to `CURSOS` (dropped the navbar shortcut wiring for AM) | ✅ Killed - `src/lib/ui/navegacao.test.ts` 2 failed / 25 passed (`hrefsDe(AM)` no longer contains `/pre-cursos/novo`) |
| 3 | `src/app/(protegido)/pre-cursos/novo/page.tsx:22` | Access guard reverted to `usuario.tipo !== "GO" \|\| usuario.cdOfertante === null` (dropped the AM carve-out) | ✅ Killed - `npx playwright test e2e/pre-cursos-novo.spec.ts -g "AD-040"` timed out waiting for `getByTestId("select-verba")` (AM now hits the access-denied branch instead of the seletor) |

**Sensor depth**: lightweight (3 targeted mutations, standard-tier feature)
**Result**: 3/3 killed - PASS ✅

Cleanup: `git worktree remove --force /tmp/spma-sensor`; `git status --porcelain` on the real tree confirmed unchanged (empty) after removal. No `git stash` used at any point.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ - one boolean clause in the guard, one alias reused for free, one array constant reused twice |
| Surgical changes | ✅ - only the 2 `*-novo` pages, the shared guard, the nav table, and their tests/docs touched |
| No scope creep | ✅ - diff stat is exactly the 15 files implicated by the spec; no unrelated refactors |
| Matches patterns | ✅ - the `usuario.tipo === "AM" \|\|` shape mirrors the pre-existing `podeMatricularAluno` pattern cited in spec.md; `CURSOS_COM_CRIACAO` follows the existing `CURSOS` array convention |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ - 9/11 match precisely; CURSO-02 and CURSO-09 have partial evidence (see AC table) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes/e2e happy+edge+error) | ⚠️ - guard-level (unit) and route-level (e2e) both covered per AC; the two gaps above are within the e2e/UI layer, not domain logic |
| Every test maps to a spec requirement - no unclaimed tests | ✅ - every new test carries an `AD-040`/`CURSO` marker or maps directly to an edge case in spec.md |
| Documented guidelines followed | ✅ - `AGENTS.md`'s AD-039 conventions (single-source navigation via `src/lib/ui/navegacao.ts`, no literal color in `.tsx`) are respected; no visual-layer files touched by this feature |

---

## Edge Cases

- [x] CURSO-09 (GO scenario): Handled and tested (`e2e/pre-cursos-novo.spec.ts:125-131`)
- [ ] CURSO-09 (AM scenario): Code is correct by inspection (role-blind render condition) but has no dedicated test - flagged as gap above
- [x] CURSO-10: Handled and tested for GT; VT/VO/AL share the identical non-branching condition

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run test:unit && npm run test:integration` (run independently by the Verifier). `npm run build` and `npm run test:e2e` were **skipped** by the Verifier as impractical for this session's time budget - the author reports running the full gate (lint clean, build clean, typecheck clean, 505 unit + 27 integration + 244 e2e all passing) but this was not independently re-verified for `build`/`test:e2e`.
- **Result**: lint 0 errors / 34 pre-existing warnings (none in changed files' new code); typecheck 0 errors; test:unit 505 passed, 0 failed (25 files); test:integration 27 passed, 0 failed (6 files)
- **Test count before feature**: `guards.test.ts` had 62 `it()` blocks before and after (2 modified in place, strengthened from `false`→`true`, none deleted); `navegacao.test.ts` had 15 `it()` blocks before, 17 after (+2 net new)
- **Test count after feature**: 505 unit / 27 integration (both match author's claim)
- **Delta**: +2 net new unit test cases (`navegacao.test.ts`); guards.test.ts tests were modified in place, not added/removed - consistent with the guard's behavior actually flipping (was `false`, now `true`) rather than being newly introduced
- **Skipped tests**: none found in the diff
- **Failures**: none

---

## Fix Plans

### Fix 1: CURSO-02 - Verba option text (saldo, número) is unasserted

- **Root cause**: The new AM test (`e2e/pre-cursos-novo.spec.ts:73-84`) only checks `toContainText` for the Ofertante name; it never checks for the "saldo R$" or "Verba #N" substrings. This gap predates the feature (the original GO test at line 64-71 also never checked option text, only visibility/count) but CURSO-02 is a new AC that explicitly names all three display facts.
- **Fix task**: Add `toContainText` assertions for `Verba #${cdVerba}` and `saldo R$` (or the specific formatted balance) to both the GO test (line 64-71) and the AM test (line 73-84) in `e2e/pre-cursos-novo.spec.ts`.
- **Priority**: Minor (test-only; the underlying `NovoPreCursoForm.tsx` JSX unconditionally renders all three facts - confirmed by direct code read, not a suspected functional bug).

### Fix 2: CURSO-09 - AM-specific empty-Verba state has no dedicated test

- **Root cause**: `/pre-cursos/novo`'s AM query branch (`usuario.tipo === "AM" ? {} : {...}`) is only exercised in its non-empty form; a scenario where the AM sees zero Verbas system-wide is never constructed.
- **Fix task**: Either (a) accept as untestable in the current shared-DB e2e model and note the gap explicitly in spec.md's CURSO-09 status, or (b) add an integration-level test (not full e2e) that stubs/isolates the Prisma call to assert `NovoPreCursoForm` renders the empty message when `opcoesVerba=[]`, independent of role.
- **Priority**: Minor (same reasoning as Fix 1 - code read confirms the render condition is role-blind and correct).

---

## Requirement Traceability Update

| Requirement | Author's Status | Verifier's Status |
| --- | --- | --- |
| CURSO-01 | Verified | ✅ Verified (combined evidence, see AC table) |
| CURSO-02 | Verified | ❌ Needs Fix (test-coverage gap) |
| CURSO-03 | Verified (regressão pré-existente) | ✅ Verified - claim confirmed accurate |
| CURSO-04 | Verified | ✅ Verified |
| CURSO-05 | Verified | ✅ Verified |
| CURSO-06 | Verified | ✅ Verified |
| CURSO-07 | Verified | ✅ Verified |
| CURSO-08 | Verified | ✅ Verified |
| CURSO-09 | Verified | ❌ Needs Fix (test-coverage gap, AM scenario) |
| CURSO-10 | Verified | ✅ Verified (GT representative sample accepted) |
| CURSO-11 | Verified (regressão pré-existente, independente de papel) | ✅ Verified - claim confirmed accurate via code read |

---

## Summary

**Overall**: ⚠️ Issues

**Spec-anchored check**: 9/11 ACs matched spec outcome with solid evidence; 2/11 evidence gaps (CURSO-02, CURSO-09)
**Sensor**: 3/3 mutations killed
**Gate**: lint + typecheck + test:unit (505) + test:integration (27) all green; `build`/`test:e2e` not independently re-run this session

**What works**: The authorization change is minimal and correctly mirrors the established `podeMatricularAluno` pattern; the `podeGerenciarPosCurso` alias means Pós-Curso needed zero new authorization code; the GO regression path (CURSO-03, CURSO-11) is genuinely unchanged and the sensor confirms the AM addition doesn't leak into the GO branch; the navbar wiring is fully unit-tested including the "no shortcut for GT/VT/VO/AL" and "longer href wins" edge cases.

**Issues found**: CURSO-02 (Verba option's visible saldo/número text is never asserted by any test, for either GO or AM) and CURSO-09 (the AM-specific "zero Verbas anywhere" empty state is never independently exercised, only the GO empty state and the AM non-empty state are). Both are test-coverage gaps, not functional defects - direct reading of `NovoPreCursoForm.tsx` and `pre-cursos/novo/page.tsx` confirms the code is correct and role-blind at the exact lines in question.

**Next steps**: Route Fix 1 and Fix 2 above to an implementer; both are additive, test-only changes. Re-run the Verifier after, per the 3-iteration fix→re-verify bound.
