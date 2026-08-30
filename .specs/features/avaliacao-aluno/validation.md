# avaliacao-aluno Validation

**Date**: 2026-08-28 (re-verified after fix commit `83edf75`)
**Spec**: `.specs/features/avaliacao-aluno/spec.md`
**Diff range**: `6b338c7..HEAD` (10 commits, `a4e0c52`..`83edf75`)
**Verifier**: independent sub-agent (author ≠ verifier)


> ⚠️ **Este relatório precede a substituição dos Dicionários de Campos (AD-035, 2026-08-29).** O PASS registrado abaixo verificou a implementação contra o dicionário **derivado**, não contra o questionário fonte do cliente. A arquitetura verificada (JSON + Zod na borda + `completude.ts` como autoridade condicional), os requisitos REQ-*/AVAL-* e os gates de encerramento continuam valendo — o que mudou foi o **conteúdo** do questionário: a Avaliação do Aluno passou de 44 para 45 chaves (`avalOportunSituacaoTrabalhoOutra`), mudou 12 listas de opções e 3 tipos de campo, e o gate de Q22 recuou (Q23 passou a ser exigida de todo aluno). Testes unitários e de forma foram atualizados e passam; **a suíte e2e desta feature ainda não foi reexecutada após a troca**. Vale um novo ciclo do Verifier antes de considerar a feature verificada contra o documento do cliente.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/lib/validation/schemas/avaliacao.schema.ts` - 44-key schema, all optional, `CHAVES_PARTE_1` |
| T2   | ✅ Done | `src/lib/auth/guards.ts` - `podeMatricularAluno`, `podeGerenciarAvaliacao`, `podeAcessarAvaliacao` |
| T3   | ✅ Done | `src/lib/avaliacao/completude.ts` - two-tier completeness, no chained `.superRefine` |
| T4   | ✅ Done | `src/app/api/avaliacoes/route.ts` - POST matrícula + GET listing |
| T5   | ✅ Done | `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts` - GET + PATCH with both gates |
| T6   | ✅ Done | `src/app/api/avaliacoes/[cpf]/[cdCurso]/encerrar/route.ts` - closure |
| T7   | ✅ Done | `src/app/(protegido)/avaliacoes/page.tsx` - scoped listing screen |
| T8   | ✅ Done | `src/app/(protegido)/avaliacoes/novo/{page.tsx,MatricularAlunoForm.tsx}` |
| T9   | ✅ Done | `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/{page.tsx,AvaliacaoForm.tsx}` |

All 9 tasks have a matching commit; all Done-when checkboxes are marked `[x]` in `tasks.md`.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AVAL-01: GO creates matrícula for valid AL CPF | `status=EM_ANDAMENTO`, `parte1Completa=false`, `respostas=null` | `e2e/avaliacoes.spec.ts:115-136` - `expect(res.status()).toBe(201)`, asserts all three fields on both the HTTP response body and `getAvaliacao()` (persisted state) | ✅ PASS |
| AVAL-02: CPF exists but not `tipo=AL` | HTTP 400 | `e2e/avaliacoes.spec.ts:151-162` - `expect(res.status()).toBe(400)` | ✅ PASS |
| AVAL-03: duplicate (CPF, cdCurso) pair | HTTP 409, **existing record unaltered** | `e2e/avaliacoes.spec.ts:164-186` (fix commit `83edf75`) - captures `antes = getAvaliacao(CPF_AL_JA_MATRICULADO, cdCursoJaComAvaliacao)` before the POST, asserts `res.status()===409`, then `expect(depois).toEqual(antes)` after - both halves of the criterion now asserted | ✅ PASS |
| AVAL-04/RN-12: Aluno already has another `EM_ANDAMENTO` eval | HTTP 409, **existing `EM_ANDAMENTO` evaluation unaltered** | `e2e/avaliacoes.spec.ts:189-201` (fix commit `83edf75`) - captures `antes = getAvaliacao(CPF_AL_RN12, cdCursoDoGo2)` (the pre-existing evaluation's course, distinct from the attempted new `cdCursoRN12Alvo`) before the POST; after, asserts the *new* pair was never created (`getAvaliacao(...)===null`), then `expect(depois).toEqual(antes)` and `depois?.status==="EM_ANDAMENTO"` against the pre-existing record - closes exactly the gap flagged in the prior run | ✅ PASS |
| AVAL-05: nonexistent/out-of-scope cdCurso | 404 (nonexistent) / 403 (other Ofertante), no existence leak | `e2e/avaliacoes.spec.ts:192-203` (404) and `:205-218` (403, plus `getAvaliacao(...)===null`) | ✅ PASS |
| AVAL-06: non-GO / wrong-Ofertante GO matriculates | HTTP 403 | `e2e/avaliacoes.spec.ts:205-218` (GO of Ofertante B) and `:220-231` (AL) | ✅ PASS |
| AVAL-07: partial Parte 1 write, shape validated | HTTP 200, merge raso | `e2e/avaliacoes-id.spec.ts:138-153` - `expect(corpo.avaliacao.respostas).toEqual(PARTE_1_INICIO)`, `parte1Completa` false | ✅ PASS |
| AVAL-08: `parte1Completa` recomputed on write that completes the 19 keys | `parte1Completa=true` in the same response | `e2e/avaliacoes-id.spec.ts:155-172` - response and `getAvaliacao()` both assert `true` | ✅ PASS |
| AVAL-09: non-owner (incl. matriculating GO) writes | HTTP 403 | `e2e/avaliacoes-id.spec.ts:259-271` (GO) and `:273-285` (other AL) | ✅ PASS |
| AVAL-10: Parte 2 key + `parte1Completa` resultante=false | HTTP 400, **nothing persisted, including Parte 1 keys in the same request** | `e2e/avaliacoes-id.spec.ts:207-223` (Parte-2-only) and `:225-240` (mixed Parte1+Parte2 in one PATCH) - both compare `getAvaliacao()` before/after and assert `depois.respostas` equals `antes.respostas` | ✅ PASS |
| AVAL-11: Parte 2 write while `parte1Completa=true` | HTTP 200 | `e2e/avaliacoes-id.spec.ts:174-188` | ✅ PASS |
| AVAL-12: `Concluiu="Não"` gate | only `avalParticipMotivoNaoConclusao` required; other 22 keys never in `pendentes` | `src/lib/avaliacao/completude.test.ts:126-133` (`completo:true` with the 22 absent) + `e2e/avaliacoes-encerrar.spec.ts:116-141` (fim-a-fim closure) | ✅ PASS |
| AVAL-13: `Concluiu="Sim"` gate | 22 keys required; `avalGeralComentariosFinais` never required | `src/lib/avaliacao/completude.test.ts:144-163` + `e2e/avaliacoes-encerrar.spec.ts:143-168` (fim-a-fim closure) | ✅ PASS |
| AVAL-14: partial Parte 2 writes always accepted while `EM_ANDAMENTO` | HTTP 200 regardless of completeness | `e2e/avaliacoes-id.spec.ts:190-205` | ✅ PASS |
| AVAL-15: closure when complete | `status=ENCERRADO`, `dataEncerramento` set, irreversible | `e2e/avaliacoes-encerrar.spec.ts:116-141` and `:143-168` - both response and persisted-state assertions | ✅ PASS |
| AVAL-16: closure with pending fields | HTTP 400, `pendentes` lists the missing keys, `status` unchanged | `e2e/avaliacoes-encerrar.spec.ts:170-194` (Parte 2 pending) and `:196-221` (Parte 1 pending) - both assert `pendentes` contains the field and `getAvaliacao().status==="EM_ANDAMENTO"` | ✅ PASS |
| AVAL-17: write/close on `ENCERRADO` | HTTP 409, data preserved | `e2e/avaliacoes-id.spec.ts:242-257` (PATCH, `depois.respostas` unchanged) + `e2e/avaliacoes-encerrar.spec.ts:270-293` (PATCH after encerrar) | ✅ PASS |
| AVAL-18: non-owner closes | HTTP 403 | `e2e/avaliacoes-encerrar.spec.ts:247-268` - asserts 403 **and** `getAvaliacao().status==="EM_ANDAMENTO"` | ✅ PASS |
| AVAL-19: `ENCERRADO → EM_ANDAMENTO` never possible | no route ever reopens | `e2e/avaliacoes-encerrar.spec.ts:223-245` (second `encerrar` → 409) + code path: `respostasAvaliacaoSchema` (`src/lib/validation/schemas/avaliacao.schema.ts:189-266`) has no `status` key, so Zod silently strips a smuggled `status` field from the PATCH body, and `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts:139-142` only ever writes `respostas`/`parte1Completa` - no code path in the diff writes `status` back to `EM_ANDAMENTO` | ✅ PASS (code-path evidence for the "no route" half, not independently e2e-tested) |
| AVAL-20: Aluno reads own/other eval | 200 own, 403 other | `e2e/avaliacoes-id.spec.ts:287-298` and `:300-311` | ✅ PASS |
| AVAL-21: GO/VO scoped, AM/GT/VT unrestricted | 200 in-scope, 403 out-of-scope, 200 for AM/GT/VT | `e2e/avaliacoes-id.spec.ts:313-329`, `:331-342`, `:344-354` | ✅ PASS |
| AVAL-22: scoped listing | GO/VO own Ofertante only, AM/GT/VT all, AL own only | `e2e/avaliacoes.spec.ts:233-249, 251-266, 268-284` (API) + `e2e/avaliacoes-page.spec.ts:60-96` (UI) | ✅ PASS |
| AVAL-23: forged out-of-scope request re-checked server-side | HTTP 403 every request, regardless of UI | `e2e/avaliacoes-id.spec.ts:331-342` (API, GO of other Ofertante → 403); UI layer `e2e/avaliacoes-formulario.spec.ts:371-378` uses `notFound()` (404) instead of a literal 403 - same established pattern as `formulario-pos-curso`'s `src/app/(protegido)/pos-cursos/[cdCurso]/page.tsx:20-29` (`podeAcessarOfertante` → `notFound()`), not a new deviation | ✅ PASS |

**Tally**: 23/23 fully matched to spec-defined outcome. (Prior run: 21/23, with AVAL-03/AVAL-04 flagged as spec-precision gaps; both closed by fix commit `83edf75` - see re-verification note below.)

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

**Carried over from the prior run (HEAD `376bc5d`) - not re-run.** The fix commit `83edf75` touched only `e2e/avaliacoes.spec.ts` and `e2e/avaliacoes-id.spec.ts` (confirmed via `git diff 376bc5d..HEAD --stat`); none of the three mutated source files (`src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts`, `src/lib/avaliacao/completude.ts`, `src/app/api/avaliacoes/route.ts`) changed, so the kill results below still hold unchanged for the current HEAD.

Isolated `git worktree` at `../SPMA-sensor-avaliacao` (HEAD `376bc5d`), `node_modules` and `src/generated` linked via NTFS junctions (Turbopack rejected the junction as "outside filesystem root" during dev-server boot; worked around by adding `--webpack` to the worktree's local `dev:test` script - a worktree-only, throwaway change, never touched the real tree's `package.json`).

| # | File:line | Mutation | Command | Killed? |
| - | --------- | -------- | ------- | ------- |
| a | `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts:132` | `if (temChaveDeParte2 && !parte1CompletaResultante)` → `if (temChaveDeParte2 && parte1CompletaResultante)` (AVAL-10 gate fails open for the vulnerable case) | `npx playwright test e2e/avaliacoes-id.spec.ts` | ✅ Killed - both AVAL-10 tests failed (expected 400, received 200); AVAL-11 failed as a side effect. 3 failed / 11 passed. |
| b | `src/lib/avaliacao/completude.ts:122` | `if (concluiuCurso === "Não")` → `if (concluiuCurso === "Sim")` inside `validarCompletudeParte2` | `npx vitest run src/lib/avaliacao/completude.test.ts` | ✅ Killed - 7 failed / 8 passed |
| c | `src/app/api/avaliacoes/route.ts:73-83` | Removed the RN-12 `findFirst({ where: { cpf, status: "EM_ANDAMENTO" } })` check + its 409 branch entirely | `npx playwright test e2e/avaliacoes.spec.ts` | ✅ Killed - AVAL-04/RN-12 test failed (expected 409, received 201); one unrelated pre-existing test (`AVAL-22: Aluno lista só a própria avaliação`) also failed as a downstream side effect of the extra record the mutant let through. 2 failed / 9 passed. |

**Sensor depth**: lightweight (3 targeted mutations, as requested)
**Result**: 3/3 killed - ✅ PASS

**Isolation verification**: `git status --porcelain` on the real tree was empty before the sensor run and empty after (`git worktree remove --force` + manual cleanup of the leftover junction directories, confirmed via `git worktree list` showing only the main tree and `Test-Path` on the sensor path returning `False`).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ - every new file maps 1:1 to a task in `tasks.md`; no speculative abstraction |
| Surgical changes | ✅ - `guards.ts` extension is additive only; `scripts/e2e-fixture.ts` additions are scoped to `AvaliacaoAluno` fixtures |
| No scope creep | ✅ |
| Matches patterns | ✅ - route ordering (RH→CSRF→Sessão→Guard), merge-raso PATCH, `completude.ts` avoiding chained `.superRefine` (explicitly tested against L-016), metadata-driven form rendering all mirror `formulario-pos-curso` |
| Spec-anchored outcome check (asserted values match spec) | ✅ - 23/23 match precisely (AVAL-03/AVAL-04 closed by fix commit `83edf75`) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ for domain layer (`avaliacao.schema.test.ts`, `completude.test.ts`, `guards.test.ts` cover every branch, including the two Parte-1 conditionals and the L-016 counter-case at `completude.test.ts:102-113`); routes now cover happy+edge+error with no open gaps |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed | `.specs/LESSONS.md` L-016 (no chained `.superRefine`) - followed and unit-tested directly; no project-wide test-style guideline beyond established per-feature convention |

---

## Edge Cases

- [x] Empty array `[]` on a required multi-select rejected as not-filled - `src/lib/validation/schemas/avaliacao.schema.test.ts:165-171` (schema-level `.min(1)` on all 3 multi-select fields; only `avalMotivMotivosParticipacao` has a dedicated test, but the guarantee is structural/shared across the other two)
- [x] `avalMotivMotivosParticipacao` > 3 items rejected - `avaliacao.schema.test.ts:185-196`
- [x] `avalGeralNota` outside 0-10 rejected - `avaliacao.schema.test.ts:236-253`
- [x] `avalParticipPercentualFrequencia` outside 0-100 rejected - `avaliacao.schema.test.ts:255-280`
- [x] CPF not corresponding to any user → 404, distinct from 400 for non-AL - `e2e/avaliacoes.spec.ts:138-149` (404) vs `:151-162` (400)
- [x] `avalParticipConcluiuCurso` changed from "Sim" to "Não" in a later write, preserving already-saved values of the 22 conditional keys - `e2e/avaliacoes-id.spec.ts:216-241` (fix commit `83edf75`, new fixture `CPF_AL_PRESERVA` seeded with `parte1Completa: true` **and** real Parte 1 answers in `respostas` - PATCHes `avalParticipConcluiuCurso="Sim"` + `avalCursoDinamicasInclusao=5`, then PATCHes `avalParticipConcluiuCurso="Não"` alone, asserts `avalCursoDinamicasInclusao` is still `5` in both the response body and `getAvaliacao()`)
- [x] `cdCurso` of another Ofertante returns 403 even though it exists in the DB (no 404/400 leak) - `e2e/avaliacoes.spec.ts:205-218`

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Result (re-run independently at HEAD `83edf75`)**: lint clean, build clean, typecheck clean; unit 382/382 passed; integration 27/27 passed; e2e 199/199 passed (17.0 min) - 0 failed, 0 skipped. Matches the coordinator's own gate run (382/27/199, 0 failures) exactly.
- **Prior run (HEAD `376bc5d`)**: e2e 198/198 - the delta of +1 is exactly the new edge-case test added in the fix commit.
- **Test count before feature**: not independently re-measured (out of scope per instructions - review confined to this feature's diff surface); the 6 new test files (3 unit, `avaliacao.schema.test.ts`/`completude.test.ts`/the `guards.test.ts` additions; 6 e2e files) account for the new tests in this run
- **Delta**: +6 new spec files in this diff (`avaliacao.schema.test.ts`, `completude.test.ts`, guards additions, `avaliacoes.spec.ts`, `avaliacoes-id.spec.ts`, `avaliacoes-encerrar.spec.ts`, `avaliacoes-page.spec.ts`, `avaliacoes-novo.spec.ts`, `avaliacoes-formulario.spec.ts`); +1 test within `avaliacoes-id.spec.ts` from the fix commit
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1: AVAL-03/AVAL-04 - existing-record-unaltered conjunct unverified — ✅ RESOLVED (commit `83edf75`)

- **Root cause**: `e2e/avaliacoes.spec.ts:164-175` (AVAL-03) asserted only `res.status()===409`; `e2e/avaliacoes.spec.ts:177-190` (AVAL-04/RN-12) asserted `res.status()===409` and that the *attempted new* pair was never created, but never re-read the *pre-existing* `EM_ANDAMENTO` record to confirm RN-12 rejection left it untouched.
- **Fix applied**: `e2e/avaliacoes.spec.ts:164-186` and `:189-201` now capture `getAvaliacao(...)` before each POST and assert `expect(depois).toEqual(antes)` after, for both the duplicate-pair case (against `cdCursoJaComAvaliacao`) and the RN-12 case (against the pre-existing evaluation's own course, `cdCursoDoGo2`, plus an explicit `status==="EM_ANDAMENTO"` check). Verified by re-reading the diff (`git diff 376bc5d..HEAD`) - both assertions land exactly where claimed.
- **Priority**: Minor (was always a test-coverage gap, not a proven behavior gap - confirmed, no code change was needed).

### Fix 2: edge case - `Concluiu` Sim→Não preservation untested — ✅ RESOLVED (commit `83edf75`)

- **Root cause**: no e2e test exercised setting `avalParticipConcluiuCurso="Sim"`, filling a Parte 2 conditional key, then patching `avalParticipConcluiuCurso="Não"` and asserting the previously-saved key remains in `respostas`.
- **Fix applied**: `e2e/avaliacoes-id.spec.ts:216-241` adds a new test with fixture `CPF_AL_PRESERVA` (seeded with `parte1Completa: true` **and** the real 19-key Parte 1 answers - the coordinator noted their first fixture attempt seeded only the boolean flag, which the route's fresh `validarCompletudeParte1` recomputation correctly rejected, so the fixture itself needed the fix, not the route). The test PATCHes `Sim` + `avalCursoDinamicasInclusao=5`, then PATCHes `Não` alone, and asserts `avalCursoDinamicasInclusao` is still `5` in both the response and the persisted record.
- **Priority**: Minor (was always a test-coverage gap - confirmed, no code change was needed).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ---------- |
| AVAL-01 | Implementing | ✅ Verified |
| AVAL-02 | Implementing | ✅ Verified |
| AVAL-03 | Implementing | ✅ Verified |
| AVAL-04 | Implementing | ✅ Verified |
| AVAL-05 | Implementing | ✅ Verified |
| AVAL-06 | Implementing | ✅ Verified |
| AVAL-07 | Implementing | ✅ Verified |
| AVAL-08 | Implementing | ✅ Verified |
| AVAL-09 | Implementing | ✅ Verified |
| AVAL-10 | Implementing | ✅ Verified |
| AVAL-11 | Implementing | ✅ Verified |
| AVAL-12 | Implementing | ✅ Verified |
| AVAL-13 | Implementing | ✅ Verified |
| AVAL-14 | Implementing | ✅ Verified |
| AVAL-15 | Implementing | ✅ Verified |
| AVAL-16 | Implementing | ✅ Verified |
| AVAL-17 | Implementing | ✅ Verified |
| AVAL-18 | Implementing | ✅ Verified |
| AVAL-19 | Implementing | ✅ Verified |
| AVAL-20 | Implementing | ✅ Verified |
| AVAL-21 | Implementing | ✅ Verified |
| AVAL-22 | Implementing | ✅ Verified |
| AVAL-23 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 23/23 ACs matched spec outcome precisely
**Sensor**: 3/3 mutations killed (carried over from HEAD `376bc5d`; fix commit did not touch mutated source paths)
**Gate**: lint+build+typecheck clean; unit 382/382, integration 27/27, e2e 199/199 - all passed (independently re-run at HEAD `83edf75`)

**What works**: The two-tier gate (Parte 1 → Parte 2, and the `Concluiu` gate inside Parte 2) is implemented and tested exactly as designed, including the highest-risk paths called out for this review - AVAL-10's "reject the whole request, persist nothing" behavior is proven with real before/after DB reads for both a pure-Parte-2 payload and a mixed Parte1+Parte2 payload; `validarCompletudeParte2` is exercised with real values for both `Sim` and `Não`, and `avalGeralComentariosFinais` is proven to never be required; RN-12 is enforced via `findFirst` before `create` and is proven to reject a genuinely separate second course; `podeGerenciarAvaliacao` (the identity-only guard) is called on both PATCH and encerrar, and the matriculating GO is proven rejected on both; the composite key (`cpf_cdCurso`) is used correctly everywhere, with `cpf`/`cdCurso` always taken from URL params and authorization checked separately against the session; the Parte 2 UI gate uses real `disabled` state (`toBeDisabled()`), not just visibility.

**Issues found**: None open. Both prior gaps (AVAL-03/AVAL-04's unasserted "existing record unaltered" conjunct, and the untested Concluiu Sim→Não preservation edge case) are resolved by fix commit `83edf75` - see Fix 1/Fix 2 above for the verified evidence.

**Next steps**: None required. The feature is ready to close: all 23 ACs are spec-anchored and passing, the Build gate is fully green (independently re-run), and the discrimination sensor's 3/3 kills still hold since the fix touched only test files.

---

## Lessons Recorded

Recorded during the initial run (HEAD `376bc5d`) and left unchanged - both gaps that grounded them are now fixed, but the lessons themselves remain valid general guidance for future features:

- `L-014` (promoted to **confirmed** on the initial run, recurrence=2): "Assert every conjunct of a multi-part criterion; proving the action succeeded leaves the resulting-state half unverified." - source `AVAL-04 - e2e/avaliacoes.spec.ts:177-190` (pre-fix line numbers).
- `L-019` (candidate): "When a spec edge case says a later write must preserve already-saved values after a gate flips, write a dedicated test that fills the gated fields, flips the gate back, and asserts the prior values are still present - a generic shallow-merge PATCH is not evidence that this specific case was verified." - source `spec.md edge case: avalParticipConcluiuCurso Sim→Não preservation`.

No new lesson recorded on this re-verification pass: the fix commit resolved the gaps as predicted with a test-only change, which is a clean re-verify, not a new grounded failure signal.
