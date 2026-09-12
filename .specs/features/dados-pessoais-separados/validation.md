# Dados Pessoais Separados Validation

**Date**: 2026-09-12
**Spec**: `.specs/features/dados-pessoais-separados/spec.md`
**Diff range**: `33f3c47..HEAD` (12 commits, main branch)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `dados-pessoais.schema.ts` + `completude.ts`, unit-tested exhaustively |
| T2   | ✅ Done | `DadoPessoalAluno` model + `Usuario.dadosPessoaisCompletos`, migration confirmed |
| T3   | ✅ Done | Repository `dadosPessoais` branch, integration-tested (idempotency, rollback, isolation) |
| T4   | ✅ Done | `CHAVES_PARTE_1` shrunk to 12 explicit keys, `avaliacao.schema.test.ts`/`completude.test.ts` clean of `avalPessoal*` |
| T5   | ✅ Done | Form block removed, PATCH rejects personal keys, 3 e2e specs re-indexed + new PESSOAL-11/13 tests |
| T6   | ✅ Done | Discard migration, dedicated integration test reads real SQL from disk |
| T7   | ✅ Done | `requireDadosPessoaisCompletos` guard, unit-tested, chained in layout |
| T8   | ✅ Done | PATCH route; no dedicated test (declared SPEC_DEVIATION, behavior proven in T9/T10 e2e) — verified sound |
| T9   | ✅ Done | `/dados-pessoais` onboarding screen, e2e covers full flow |
| T10  | ✅ Done | `/meus-dados` edit screen, nav updated, e2e covers edit/isolation/404 |
| T11  | ✅ Done | AD-042 + `avaliacao-aluno/spec.md` rectification |

All 11 tasks verified independently against the real diff — not just the checkmarks in `tasks.md`.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PESSOAL-01 | 7 personal questions shown on first access | `e2e/dados-pessoais.spec.ts:84-93` — `expect(page.getByTestId("form-dados-pessoais")).toBeVisible()` | ✅ PASS |
| PESSOAL-02 | Blocked from any other protected screen until answered | `src/lib/auth/guards.ts:62-69` (`redirect("/dados-pessoais")`); `e2e/dados-pessoais.spec.ts:84-93` (`/painel` → redirected) | ✅ PASS |
| PESSOAL-03 | Navigation unlocks, questionnaire not shown again | `e2e/dados-pessoais.spec.ts:117-143` — revisits `/painel`, `expect(...form-dados-pessoais...).toHaveCount(0)` | ✅ PASS |
| PESSOAL-04 | Non-Aluno unaffected | `src/lib/auth/guards.test.ts:129-131` (parametrized non-AL); `e2e/dados-pessoais.spec.ts:156-161` | ✅ PASS |
| PESSOAL-05 | Incomplete/invalid → 400, nothing persisted | `e2e/dados-pessoais.spec.ts:95-115` — 400 + `getDadosPessoais(...)` toBeNull + flag stays false; route: `route.ts:69-74` | ✅ PASS |
| PESSOAL-06 | Pre-existing Aluno also gated | `prisma/schema.prisma:61` (`@default(false)`); migration `ADD COLUMN ... DEFAULT false` (applies to all existing rows); `guards.test.ts` | ✅ PASS |
| PESSOAL-07 | One row per (Aluno, question, position) in new table | `src/lib/respostas/repositorio.integration.test.ts:410-441` | ✅ PASS |
| PESSOAL-08 | Physical constraint blocks duplicate row | `prisma/schema.prisma:316` `@@unique([cpf, chave, ordem])`; migration `UNIQUE INDEX` | ✅ PASS |
| PESSOAL-09 | Removing Aluno removes personal data, no orphan | `schema.prisma:310` `onDelete: Cascade`; `repositorio.integration.test.ts:506-526` | ✅ PASS |
| PESSOAL-10 | Single declared boundary drives write/read/gate | `dados-pessoais.schema.ts:83-91` (`CHAVES_DADOS_PESSOAIS ... satisfies`) | ✅ PASS |
| PESSOAL-11 | No personal question in course form | `e2e/avaliacoes-formulario.spec.ts` (new "PESSOAL-11" test, asserts 0 count for all 7 testids + no "Dados Pessoais" text) | ✅ PASS |
| PESSOAL-12 | Parte 1 completeness verdict unchanged on 12 keys | `src/lib/avaliacao/completude.test.ts:16-65` (12-key `PARTE_1_COMPLETA` → `completo: true`) | ✅ PASS |
| PESSOAL-13 | PATCH with personal key → 400, nothing persisted | `e2e/avaliacoes-id.spec.ts` (two new "PESSOAL-13" tests: isolated key + mixed with valid key, both 400 + unchanged respostas) | ✅ PASS |
| PESSOAL-14 | Part1→Part2 gate on remaining 12 unaffected | `e2e/avaliacoes-id.spec.ts` AVAL-08/AVAL-10 (adjusted to 12 keys, still pass); full e2e green | ✅ PASS |
| PESSOAL-15 | Rest of Avaliação HTTP contract unchanged | Route diff shows only the added rejection block; `avaliacoes-id.spec.ts`/`avaliacoes-encerrar.spec.ts` full contract assertions all pass | ✅ PASS |
| PESSOAL-16 | Perfil shows 7 current answers, editable | `e2e/meus-dados.spec.ts:76-88` | ✅ PASS |
| PESSOAL-17 | Valid edit replaces only changed field | `e2e/meus-dados.spec.ts:90-103` — `getDadosPessoais` equals `{...RESPOSTAS_A, avalPessoalMunicipio: "Campinas, SP"}` | ✅ PASS |
| PESSOAL-18 | Empty/invalid → 400, nothing changes | `e2e/meus-dados.spec.ts:105-119` — error shown, flag stays true, data unchanged | ✅ PASS |
| PESSOAL-19 | 403 on any attempt over another CPF | By construction: route has no CPF param (`route.ts:58`, only `sessao.usuario.cpf`); real evidence in `e2e/meus-dados.spec.ts:123-131` (edit A leaves B's row untouched) | ✅ PASS (see sensor/judgment note below) |
| PESSOAL-20 | Non-Aluno gets no profile area | `route.ts:44-46` (backend 403); `e2e/meus-dados.spec.ts:133-140` (404 via `notFound()`); `navegacao.test.ts` (only AL gets `/meus-dados`) | ✅ PASS |
| PESSOAL-21 | Migration removes all personal-key rows | `dados-pessoais-migracao.integration.test.ts:174-188` | ✅ PASS |
| PESSOAL-22 | Non-personal rows untouched | `dados-pessoais-migracao.integration.test.ts:191-209, 242-258` (incl. multi-select order preserved) | ✅ PASS |
| PESSOAL-23 | Accounts/avaliação/status columns untouched | `dados-pessoais-migracao.integration.test.ts:213-226` | ✅ PASS |
| PESSOAL-24 | Runs clean with no personal rows present | `dados-pessoais-migracao.integration.test.ts:231-239` (re-run, no error, no diff) | ✅ PASS |
| PESSOAL-25 (edge) | Shrinking multi-select drops removed rows | Satisfied by code reuse: `apagarLinhas`/`inserirLinhas` (`repositorio.ts:104-171`) are the SAME functions for every `formulario`, and the mechanism is proven at `repositorio.integration.test.ts:168-188` (preCurso). No personal field is list-typed, so no dedicated dadosPessoais-specific case exists. | ✅ PASS (by reuse — judged sound, see below) |
| PESSOAL-26 (edge) | Mid-write failure leaves nothing persisted | `repositorio.integration.test.ts:486-502` (throws inside `$transaction`, 0 rows after) | ✅ PASS |
| PESSOAL-27 (edge) | Already-answered Aluno sees normal main screen | `e2e/dados-pessoais.spec.ts:145-154` | ✅ PASS |

**Status**: ✅ All 27 ACs covered with real, non-tautological evidence. No spec-precision gaps found — the spec's outcomes are concrete enough (status codes, exact row sets, exact objects) that every test asserts the literal spec-defined value, not just "an assertion exists."

### Judgment on PESSOAL-19 ("by construction")

The claim holds. `PATCH /api/usuarios/me/dados-pessoais` (`route.ts`) never reads a CPF from the URL or body — the only CPF used is `sessao.usuario.cpf`, and `respostasDadosPessoaisSchema` doesn't even declare a `cpf` field (Zod strips it silently if sent). There is structurally no code path by which a request can name a foreign CPF for this endpoint, unlike `podeGerenciarAvaliacao`, which exists specifically because the avaliação route's URL carries `[cpf]`. The e2e test is not tautological: it performs a real edit as Aluno A through the full HTTP+session stack and asserts Aluno B's row in the database is byte-for-byte unchanged, which would catch a real regression class (e.g., an accidental global update, a copy-paste bug using `corpo.cpf`, or a broken repository filter). The one gap is that no test sends a malicious payload containing an extra `cpf` field to confirm it's silently ignored — minor, not scored as a failure, since the schema and route code make that path unreachable by construction, confirmed by reading both.

### Judgment on PESSOAL-25 (edge case, "by reuse")

Sound. `gravarRespostas` calls the same private `apagarLinhas`/`inserirLinhas` for all four `AlvoRespostas` variants — there is no per-formulário duplication of the delete-then-insert logic. That exact mechanism is already proven to drop removed multi-select options in `repositorio.integration.test.ts:168-188` (a different formulário, `preCurso`). Since the design honestly documents that none of the 7 personal fields are list-typed (confirmed by reading `dados-pessoais.schema.ts` — all 7 are `z.enum`/`z.string`, no `z.array`), there is no real behavior to exercise here; a dedicated test would just re-run the same shared code against different table names, adding no discriminating power. This reads as an accurate risk disclosure, not a rationalized gap.

---

## Discrimination Sensor

Isolated scratch worktree (`git worktree add ../SPMA-verifier-scratch HEAD`, `node_modules`/`src/generated/prisma` symlinked read-only). Baseline real-tree porcelain: `?? Normalizacao-Respostas.docx` (pre-existing, unrelated). Confirmed identical after cleanup.

| # | File:line | Mutation | Test run | Result |
| - | --------- | -------- | -------- | ------ |
| 1 | `src/lib/auth/guards.ts:66` | Flipped `!usuario.dadosPessoaisCompletos` → `usuario.dadosPessoaisCompletos` (inverted the navigation gate) | `npx vitest run ... src/lib/auth/guards.test.ts` | ❌ Survived → ✅ **Killed** (2 tests failed) |
| 2 | `src/app/api/usuarios/me/dados-pessoais/route.ts:69-81` | Removed the `if (!completo) return 400` gate; always persisted `entrada.data` and set `dadosPessoaisCompletos: completo` (allows partial persistence) | `npx playwright test e2e/dados-pessoais.spec.ts e2e/meus-dados.spec.ts` | ✅ **Killed** (PESSOAL-05 test failed: expected 400, got 200) |
| 3 | `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts:126-128` | Removed the `chavesPessoaisEnviadas` 400 rejection (personal keys silently dropped by Zod instead of rejected) | `npx playwright test e2e/avaliacoes-id.spec.ts -g "PESSOAL-13"` | ✅ **Killed** (both PESSOAL-13 tests failed: expected 400, got 200) |
| 4 | `prisma/migrations/..._descartar.../migration.sql:23-24` | Dropped `avalPessoalCondicaoPcd` from the `DELETE ... WHERE Chave IN (...)` list | `npx vitest run -c vitest.integration.config.ts src/lib/respostas/dados-pessoais-migracao.integration.test.ts` | ✅ **Killed** (2 tests failed: orphaned key survived) |
| 5 | `src/app/api/usuarios/me/dados-pessoais/route.ts:78-81` | Removed the `tx.usuario.update({ dadosPessoaisCompletos: true })` side effect after a successful write | `npx playwright test e2e/dados-pessoais.spec.ts` | ✅ **Killed** (1 test failed: flag stayed false after full valid submission) |

**Sensor depth**: expanded (5 mutations) — this feature touches an authorization gate and a destructive data migration, both flagged as elevated-risk categories.
**Result**: 5/5 killed — ✅ PASS

Each mutation was reverted individually and `git status --porcelain` inside the scratch worktree was confirmed empty before removing it (`git worktree remove --force`). Real tree porcelain after removal: identical to the pre-sensor baseline (`?? Normalizacao-Respostas.docx` only). No `git stash` was used at any point.

---

## Interactive UAT

Not performed — this is a backend-authored, out-of-session Verifier run with no live user available to walk through the UI. Coverage is instead carried by the 258-test e2e suite exercising the real UI (Playwright + real Chromium + real DB), which is treated as equivalent automated evidence for this feature's user-facing flows.

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code (e.g., `ResultadoCompletudeDadosPessoais` deliberately redeclared, not imported) | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ (migration is additive; avaliação/nav/e2e touches are the direct consequence of the 7-key move) |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ (guard pattern, repository branch pattern, RH→CSRF→Sessão→Guard→Zod→Transação order all match precedent) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes e2e happy+edge+error) | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | AD-039 (single-file visual layer, navigation single source), AD-041 (row-shaped answers), AD-004 (Zod as shape authority) — all respected |

---

## Edge Cases

- [x] PESSOAL-25 (shrinking multi-select): satisfied by shared-code reuse, judged sound above
- [x] PESSOAL-26 (mid-write failure): integration-tested with real transaction rollback
- [x] PESSOAL-27 (already-answered Aluno): e2e-tested

---

## SPEC_DEVIATION Judgments

1. **`/dados-pessoais` instead of literally `/painel`.** Judged correct. The technical constraint is real and pre-existing: Server Components in this Next.js version cannot read the request pathname in a layout (confirmed by the same argument already accepted for `/primeiro-acesso` and `/cadastro-ofertante`, with an empirical curl 307-loop citation in `layout.tsx`'s own comment). Redirecting to `/painel` from a guard that runs on `/painel`'s own layout is a self-loop by construction, not a hypothetical. The functional outcome the spec actually cares about — first thing the Aluno sees, blocking, before anything else — is preserved. This is the same class of deviation the codebase already has precedent for and the user never reopened.
2. **All-or-nothing PATCH semantics vs. Avaliação's shallow merge.** Judged correct and deliberately different for a good reason: PESSOAL-05/18 literally require "não persistir nenhuma linha" / "não persistir nada" on an invalid submission, which a shallow merge (persist-what-came, even if incomplete) would violate for the first-collection case. Verified directly by reading `route.ts` (merge is used only to *evaluate* completeness against the resultant state, never as what gets written — `gravarRespostas(tx, alvo, entrada.data)` writes only the request body, and only after the completeness gate passes) and killed by mutation #2 above.

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` (run on the real tree, port 3000 confirmed free beforehand)
- **Result**: lint 0 errors (34 pre-existing warnings, unrelated to this feature, no new ones introduced by it); build passed (new routes `/dados-pessoais`, `/meus-dados`, `/api/usuarios/me/dados-pessoais` present in output); typecheck clean; **611 unit passed**; **70 integration passed**; **258 e2e passed** (confirmed authoritative via `test-results/.last-run.json`: `{"status":"passed","failedTests":[]}`, not the summary line)
- **Test count**: matches `tasks.md`'s own last recorded count (611/70/258) — no regression, no deleted tests
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None. No gaps found.

---

## Requirement Traceability Update

All 27 PESSOAL-* requirements move from "Implementing"/"Done (task ref)" to **Verified** — see per-AC table above for evidence per requirement.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 27/27 ACs matched spec-defined outcome, 0 spec-precision gaps
**Sensor**: 5/5 mutations killed
**Gate**: 611 unit + 70 integration + 258 e2e passed, lint/build/typecheck clean

**What works**: Full separation of the 7 personal fields into `TB_Dado_Pessoal_Aluno` (CPF-keyed, cascade-deleted, unique-constrained); mandatory first-access gate scoped to `AL` only; Avaliação questionnaire shrunk to 12 Parte 1 keys with an explicit 400 rejection for any personal key sent to its PATCH; profile-based edit with genuine all-or-nothing semantics; discard migration proven against real SQL read from disk; all pre-existing e2e specs updated as a direct, legitimate consequence of the scope change (testid reindexing, key-count changes), not weakened assertions.

**Issues found**: none.

**Next steps**: none — feature is done. Run `validate_state.py dados-pessoais-separados` to close the loop formally.
