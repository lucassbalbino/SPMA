# formulario-pos-curso Validation

**Date**: 2026-08-28
**Spec**: `.specs/features/formulario-pos-curso/spec.md`
**Diff range**: `10694c7^..HEAD` (12 commits, `docs(pos-curso): add spec` through `feat(pos-curso): add fill-in and closure screen`, HEAD `3f697d0`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/lib/validation/schemas/pos-curso.schema.ts` — 26-key schema + `datasReaisEmOrdem` + option constants |
| T2   | ✅ Done | `src/lib/auth/guards.ts:129` — `podeGerenciarPosCurso = podeGerenciarPreCurso` (literal alias, confirmed via `toBe` identity test) |
| T3   | ✅ Done | `src/lib/pos-curso/completude.ts` — independent-checks pattern (not `.superRefine`-chained), confirmed from source |
| T4   | ✅ Done | `src/app/api/pos-cursos/route.ts` — POST/GET |
| T5   | ✅ Done | `src/app/api/pos-cursos/[cdCurso]/route.ts` — GET/PATCH |
| T6   | ✅ Done | `src/app/api/pos-cursos/[cdCurso]/encerrar/route.ts` — POST |
| T7   | ✅ Done | `src/app/(protegido)/pos-cursos/page.tsx` |
| T8   | ✅ Done | `src/app/(protegido)/pos-cursos/novo/page.tsx` + `NovoPosCursoForm.tsx` |
| T9   | ✅ Done | `src/app/(protegido)/pos-cursos/[cdCurso]/page.tsx` + `PosCursoForm.tsx` |

All 9 tasks marked done in `tasks.md`, all "Done when" checkboxes checked, all confirmed against source.

---

## Spec-Anchored Acceptance Criteria

| Requirement | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| REQ-PO-01 | 201, `status=EM_ANDAMENTO`, `respostas=null`, `criadoPor=CPF do GO` | `src/app/api/pos-cursos/route.ts:57-64` (create) — `e2e/pos-cursos.spec.ts:109-117` `expect(res.status()).toBe(201); expect(corpo.posCurso.status).toBe("EM_ANDAMENTO"); expect(corpo.posCurso.respostas).toBeNull(); expect(persistido?.criadoPor).toBe(CPF_GO)` | ✅ PASS |
| REQ-PO-02 | 409 on duplicate `cdCurso`, no new record | `src/app/api/pos-cursos/route.ts:49-55` (`findUnique` before `create`) — `e2e/pos-cursos.spec.ts:131` `expect(res.status()).toBe(409)` | ✅ PASS |
| REQ-PO-03 | 403 (out-of-scope, existing) distinct from 404 (nonexistent); no existence leak | `src/app/api/pos-cursos/route.ts:38-45` — `e2e/pos-cursos.spec.ts:145` (nonexistent→404) and `:159` (other Ofertante's existing `cdCurso`→403, plus `:162` confirms no record created) | ✅ PASS |
| REQ-PO-04 | Partial PATCH merges only sent keys, others stay absent | `src/app/api/pos-cursos/[cdCurso]/route.ts:102-105` (shallow merge) — `e2e/pos-cursos-id.spec.ts:99-105` and `:119-130` (second PATCH preserves first) | ✅ PASS |
| REQ-PO-05 | 400 on shape violation | `src/app/api/pos-cursos/[cdCurso]/route.ts:92-100` — `e2e/pos-cursos-id.spec.ts:145` (negative monetary → 400) + unit `pos-curso.schema.test.ts:121-127,150-155` | ✅ PASS |
| REQ-PO-06 | 400 when `posExecDataTerminoReal < posExecDataInicioReal` on merged state | `src/app/api/pos-cursos/[cdCurso]/route.ts:107-115`, `datasReaisEmOrdem` in `pos-curso.schema.ts:155-164` — `e2e/pos-cursos-id.spec.ts:165` (same PATCH) and `:191` (dates split across two PATCHes, validated against merged state) | ✅ PASS |
| REQ-PO-07 | `posExecAlteracaoDetalhe` required at closure only when `posExecHouveAlteracaoPlanejamento="Sim"` | `src/lib/pos-curso/completude.ts:15-25` — unit `completude.test.ts:53-58` (Sim, no detalhe → pending) and `:61-70` (Não → not pending even if empty); e2e `pos-cursos-formulario.spec.ts:238-240` (UI shows single pendency) | ✅ PASS |
| REQ-PO-08 | ENCERRADO is read-only: PATCH and re-`encerrar` both rejected, data untouched | `src/app/api/pos-cursos/[cdCurso]/route.ts:85-90` (409 on PATCH) and `encerrar/route.ts:49-51` (409 on re-close) — `e2e/pos-cursos-id.spec.ts:208-210`, `e2e/pos-cursos-encerrar.spec.ts:162` (re-close) and `:185` (PATCH after close) | ✅ PASS |
| REQ-PO-09 | 400 listing every pending key, `status` unchanged | `encerrar/route.ts:53-60` — `e2e/pos-cursos-encerrar.spec.ts:109-114` `expect(corpo.pendentes).toContain(...); expect(persistido?.status).toBe("EM_ANDAMENTO")` | ✅ PASS |
| REQ-PO-10 | 200, `status=ENCERRADO`, `dataEncerramento` set, irreversible | `encerrar/route.ts:62-67` — `e2e/pos-cursos-encerrar.spec.ts:133-140` | ✅ PASS |
| REQ-PO-11 | Scoped GET: GO/VO own Ofertante only (via parent PreCurso), AM/GT/VT any | `[cdCurso]/route.ts:35-46` (`include: { preCurso }` + `podeAcessarOfertante`) — `e2e/pos-cursos-id.spec.ts:223` (other-Ofertante GO→403) and `:250` (VO own→200) | ✅ PASS |
| REQ-PO-12 | Scoped listing, optional `?cdOfertante=` only for AM/GT/VT | `route.ts:81-104` — `e2e/pos-cursos.spec.ts:203-205` (GO sees only own) and `:220-222` (GT with filter) | ✅ PASS |
| REQ-PO-13 | Forged direct request re-authorized server-side every time → 403 | Every route re-derives `cdOfertante` via `include: { preCurso }` per request (no cached/trusted client value) — `e2e/pos-cursos-id.spec.ts:223,237`, `e2e/pos-cursos.spec.ts:159`, `e2e/pos-cursos-formulario.spec.ts:293-301` (direct URL from other GO → 404 via `notFound()`, page-layer equivalent of 403/no-leak) | ✅ PASS |
| REQ-PO-14 | Only owning GO writes; VO always 403 on write | `guards.ts:129`, enforced in `route.ts`/`[cdCurso]/route.ts`/`encerrar/route.ts` — `e2e/pos-cursos-id.spec.ts:264` (VO PATCH→403), `e2e/pos-cursos.spec.ts:174` (AL create→403) | ✅ PASS |

**Status**: ✅ All 14 ACs covered, no spec-precision gaps.

---

## Architectural Regression Check (author-stated risk areas)

- **`completude.ts` independent-checks pattern, not `.superRefine`-chained**: confirmed by source read (`src/lib/pos-curso/completude.ts:32-40` — `pendenciasCondicionais` is evaluated unconditionally and unioned with the base-schema pendencies, never gated behind `resultadoBase.success`). Unit test `completude.test.ts:80-91` directly exercises the scenario that broke the old pattern (condicional pendency must surface even when most of the other 25 keys are also absent) and passes. This is the fix applied *from the start*, not a post-hoc patch — confirmed, not just asserted by the author.
- **`podeGerenciarPosCurso` is a real alias, not diverged**: `guards.ts:129` is a literal `export const podeGerenciarPosCurso = podeGerenciarPreCurso;` (not a wrapper function). Unit test `guards.test.ts:258-260` asserts reference identity (`toBe`). Sensor mutation 1 (below) independently confirms both test suites break together when the underlying rule changes.
- **No route forgot `include: { preCurso: ... }`**: verified in all three route files — `route.ts` (POST via `preCurso.cdOfertante` from `findUnique`, GET via `preCurso: { cdOfertante }` relation filter), `[cdCurso]/route.ts` (GET/PATCH both `include: { preCurso: { select: { cdOfertante: true } } }`), `encerrar/route.ts` (same include). No route computes authorization from an absent/undefined `cdOfertante`.

---

## Bug Fix Verification (Select popup, e2e test authoring)

Confirmed real and correctly scoped to test authoring, not product code:

- Base UI's `Select` content does not unmount on close (unlike `Accordion`, which does — `data-slot="accordion-item"` pattern used elsewhere in the same spec file for scoping). `PosCursoForm.tsx` renders each `SelectItem` with a per-field-prefixed `data-testid` (`campo-${campo.chave}-opcao-${indice}`, `PosCursoForm.tsx:361-369`), so the DOM itself already disambiguates fields — the fix in `e2e/pos-cursos-formulario.spec.ts:107-114` (`selecionar` scopes by `[data-testid^="${prefixoOpcao}"]`) is a test-locator fix, consuming a distinction the app already provides via `data-testid`, not a change to app markup or behavior.
- A real end user never hits this: only one popup is visually open/interactable at a time (Base UI still applies its own focus/visibility state), and a human clicks the visible "Não" they see, not a hidden stale node from a previously closed popup. The ambiguity is purely an artifact of Playwright's `getByRole` querying the full DOM including non-visible-but-mounted content — `PosCursoForm.tsx` itself was not modified to fix this (confirmed via the diff stat: only `e2e/pos-cursos-formulario.spec.ts` changed for this reason, `PosCursoForm.tsx` has no visibility/unmount logic tied to this bug).

---

## Discrimination Sensor

Ran in an isolated `git worktree` (`../SPMA-sensor`, `node_modules` junctioned in) — never the real tree. Baseline `git status --porcelain` was empty before and after.

| # | File:line | Mutation | Killed? |
| - | --- | --- | --- |
| 1 | `src/lib/auth/guards.ts:119` | `podeGerenciarPreCurso`: `&&` → `\|\|` (`usuario.tipo === "GO" \|\| usuario.cdOfertante === cdOfertanteAlvo`) | ✅ Killed — 4 tests failed: 2 in `podeGerenciarPreCurso` suite AND 2 in `podeGerenciarPosCurso` suite (`guards.test.ts`), proving the alias is real (both consumers break together, not just one) |
| 2 | `src/lib/pos-curso/completude.ts:20` | `pendenciasCondicionais` trigger flipped: `"Sim"` → `"Não"` | ✅ Killed — 3/6 tests failed in `completude.test.ts` (the "Não → not pending" case and the "pendency surfaces even when mostly empty" case, which is exactly the regression class this pattern exists to prevent) |

A third mutation (PATCH route's ENCERRADO guard, requiring e2e) was attempted in a second worktree but blocked by an environmental limitation: Turbopack refuses to resolve a `node_modules` junction that points outside the worktree's filesystem root (`TurbopackInternalError: Symlink [project]/node_modules is invalid, it points out of the filesystem root`). This is a tooling constraint of Next.js 16's Turbopack dev server under a git-worktree + junction setup, not a code defect. Given 2/2 mutations already killed at the lightweight-tier requirement (1-3 mutations) with high-risk-area coverage (the alias divergence risk and the completude-pattern regression risk called out explicitly in `design.md` Risks & Concerns), the sensor was not forced through a real-tree edit to reach a third. Worktree discarded (`git worktree remove --force`); real tree confirmed clean (`git status --porcelain` empty, matching pre-sensor baseline).

**Sensor depth**: lightweight (default tier)
**Result**: 2/2 killed — ✅ PASS

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code (`datasReaisEmOrdem` kept separate from `ordemDatasValida`, per design.md) | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style (mirrors `formulario-pre-curso` route/schema/completude/page shapes) | ✅ |
| Would senior engineer approve? | ✅ |
| Tests map to ACs, non-shallow (spot-checked P1 stories above) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer coverage (domain 1:1 with ACs; routes cover happy+edge+error) | ✅ |
| Every test maps to a spec AC/edge case/Done-when — no unclaimed tests | ✅ |
| Documented guidelines followed | ✅ — none beyond `AGENTS.md` (Next.js version-drift notice, not testing-specific); strong defaults applied, consistent with `formulario-pre-curso` |

---

## Edge Cases

- [x] No PreCurso exists for the given `cdCurso` at creation → 404 (`route.ts:38-40`; `e2e/pos-cursos.spec.ts:145`)
- [x] Required multi-select field sent as `[]` → rejected as unfilled, not a valid empty list (`.min(1)` on all 4 multi-select fields in `pos-curso.schema.ts`; unit `pos-curso.schema.test.ts:104-110`)
- [x] `posFinValorDevolvido=0` treated as filled, not a pendency (`completude.test.ts:46-51`; e2e closure fixture uses `0` and closes successfully, `pos-cursos-encerrar.spec.ts:63`)
- [x] Any of the 5 monetary fields negative → 400 (`valorMonetario = z.number().min(0)`, `pos-curso.schema.ts:90`; unit `pos-curso.schema.test.ts:112-127` all 5 fields parametrized; e2e `pos-cursos-id.spec.ts:145`)
- [x] `posExecDataTerminoReal` before `posExecDataInicioReal` → 400, covering both same-PATCH and split-PATCH-against-merged-state cases (`datasReaisEmOrdem`; e2e `pos-cursos-id.spec.ts:165,191`)
- [x] `cdCurso` belongs to another Ofertante at creation → 403, not leaked as 404 (`route.ts:43-45`; e2e `pos-cursos.spec.ts:159`)

All 6 edge cases handled and evidenced.

---

## Gate Check

- **Build gate**: `npm run lint && npm run build && npm run typecheck` — lint: 0 errors, 21 pre-existing-pattern warnings (unused `_omitido`/`_request` destructure placeholders, same convention already used by `formulario-pre-curso`'s own test files); build: compiled successfully, all pos-curso routes/pages listed in route manifest; typecheck: clean.
- **Full gate**: `npm run test:unit && npm run test:integration && npm run test:e2e`
  - Unit: **309 passed** (18 files)
  - Integration: **27 passed** (6 files)
  - E2e: **149 passed** (0 failed), exit code 0, single run — no flakes observed, no rerun needed
- **Test count before feature**: not independently re-derived (would require checking out the pre-feature commit); the diff adds 5 new test files (`pos-curso.schema.test.ts`, `completude.test.ts`, extensions to `guards.test.ts`) plus 6 new e2e spec files. No test deletions or weakenings observed in the diff.
- **Skipped tests**: none.
- **Failures**: none. Two benign `[WebServer] Error: The destination stream closed early` dev-server log lines appeared mid-run (unrelated commit's `pre-cursos-formulario.spec.ts`/`pos-cursos-formulario.spec.ts` transitions) and one expected `PrismaClientKnownRequestError` (unique-constraint) log from an unrelated pre-existing test (`usuarios.spec.ts:243`, REQ-SEC-11, which deliberately triggers and catches this) — none caused a test failure or required investigation per the known-flake guidance.

---

## Fix Plans

None — no gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PO-01 through PO-14 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 14/14 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 2/2 mutations killed (lightweight tier; 3rd blocked by an unrelated Turbopack/worktree-junction tooling limitation, not attempted against the real tree)
**Gate**: 309 unit + 27 integration + 149 e2e passed, 0 failed

**What works**: Full 26-key questionnaire schema with exact-count test; independent-checks completude pattern (proactively applying the `formulario-pre-curso` lesson, confirmed not to have regressed to `.superRefine`-chaining); `podeGerenciarPosCurso` alias confirmed as a real, non-diverged alias by both source and mutation testing; every route correctly resolves authorization through the parent PreCurso's `cdOfertante` (no route silently always-denies or always-allows); REQ-PO-02/03's 409-vs-404-vs-403 distinctions all hold; irreversible closure gate (REQ-PO-07 conditional + REQ-PO-09/10 full completeness) verified at both unit and e2e/UI layers; the Select-popup e2e flake fix is a sound test-only fix, confirmed not to reflect or paper over a product bug.

**Issues found**: none.

**Next steps**: none — feature ready to mark Verified in spec.md traceability (already reflected above).
