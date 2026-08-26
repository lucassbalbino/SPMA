# seguranca-transversal Validation

**Date**: 2026-08-26
**Spec**: `.specs/features/seguranca-transversal/spec.md`
**Diff range**: `442ffd8..462d658` (first feature commit `f541284` through HEAD; `442ffd8` is the pre-feature boundary). Fix-only delta re-verified this round: `2790253..462d658`.
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Iteration**: 2 of the bounded 3 (supersedes the iteration-1 report committed at `305bb96`)

**Verdict**: ✅ **PASS** — the single iteration-1 blocker is closed. M5 is now killed, the other five mutations are still killed, one new adversarial mutation (M7) was added and also killed, and the full gate is 189/189 green. No new gaps.

---

## What changed since iteration 1

Re-derived from `git diff 2790253..HEAD --name-only`, not from the fix author's account:

| File | Change |
| ---- | ------ |
| `src/app/api/auth/login/route.integration.test.ts` | **New** — the only non-`.specs` file in the delta (104 lines) |
| `.specs/features/seguranca-transversal/tasks.md` | +1 line documenting the fix under T12 |
| `.specs/features/seguranca-transversal/validation.md` | iteration-1 report (superseded by this file) |
| `.specs/LESSONS.md`, `.specs/lessons.json` | iteration-1 distillation (L-010) |

**Zero production source changed.** `src/app/api/auth/login/route.ts` is byte-identical to iteration 1, so the timing normalization itself was neither altered nor loosened to fit a test. `e2e/login.spec.ts` was not touched (`git log -1 -- e2e/login.spec.ts` → `f7ea199`, a pre-iteration-1 commit): the wall-clock timing test at `:301-351` survives intact as supplementary evidence, exactly as the new file's header comment claims. Nothing was weakened, skipped, or deleted to reach PASS.

All 22 tasks remain complete (55 checked `Done when` boxes, 0 unchecked). Because no production code and no pre-existing test moved, the per-task evidence in the iteration-1 report carries forward unchanged for T1-T11 and T13-T22; T12 is now closed (below).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T11, T13-T22 | ✅ Done | Evidence unchanged from iteration 1 — no file in scope moved in `2790253..HEAD`. Spot-checked `src/lib/auth/password.ts:16-17` (T3, `DUMMY_HASH` intact), `next.config.ts:9-28` (T9, all headers present), `src/app/api/auth/login/route.ts:37-116` (T12 implementation intact) |
| T12 login hardening | ✅ **Done** (was ⚠️ Partial) | Implementation unchanged at `src/app/api/auth/login/route.ts:38-100`; the CA-SEC-04 half is now protected by a discriminating test at `src/app/api/auth/login/route.integration.test.ts:70-103` |

---

## Gap 1 from iteration 1 — closed

**Was**: `e2e/login.spec.ts:349-350` asserted only `0.2 < ratio < 5`. Under `next dev`, framework + DB overhead (180-400 ms) dwarfs the argon2 cost (~73 ms), so mutation M5 moved the ratio from 0.616 to 0.447 — still inside the band. The assertion passed with and without the normalization it exists to protect.

**Now**: closed by `src/app/api/auth/login/route.integration.test.ts`, which proves REQ-SEC-04's mechanism by **which hash was compared** rather than by elapsed time. It mocks `@/lib/auth/password` via `vi.hoisted` + `vi.mock` while keeping the real `verifyPassword` as the spy's implementation (`:12-23`), then calls the route's exported `POST` handler directly with a constructed `Request` (`:35-41`, `:73`) — no HTTP, no dev server, therefore no framework noise in the measurement path at all. This is not a weaker proxy for the timing claim; it is a strictly stronger one, because it is deterministic where wall-clock measurement in this environment is not.

**Non-shallowness confirmed by reading, then by mutation.** The assertions satisfy the payload/conjunction rule — they check the argument **value**, not merely that the call happened:

- `:78-79` — `expect(verifyPasswordSpy).toHaveBeenCalledTimes(1)` **and** `expect(verifyPasswordSpy).toHaveBeenCalledWith(DUMMY_HASH, "qualquerSenha1")`. The count assertion alone would be the shallow version; the `toHaveBeenCalledWith` pins the exact 97-char argon2id constant imported from the real module (`:26`).
- `:94-102` — the mirror case: called once, `toHaveBeenCalledWith(usuario.senhaHash, "senhaErrada999")` against the hash read back from the DB (`:85-87`), **plus** the negative conjunct `expect(verifyPasswordSpy).not.toHaveBeenCalledWith(DUMMY_HASH, expect.anything())`. That negative closes the inverse fault (always dummy-hashing, which would break real logins' cost profile).
- Both cases also assert the spec's non-enumerable outcome itself — `expect(res.status).toBe(401)` at `:77` and `:93` — so the mechanism proof is anchored to the observable response CA-SEC-04 specifies.

I verified the value assertion is load-bearing rather than decorative by injecting **M7** (below), a mutation that keeps the call count at exactly 1 and is invisible to a count-only assertion. It was killed by `toHaveBeenCalledWith`, on the argument diff.

---

## Spec-Anchored Acceptance Criteria

### Implemented by this feature

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| **CA-SEC-03** — IP acima do limite recebe cooldown | novas tentativas daquele IP recebem cooldown | `e2e/login.spec.ts:353-378` — 20 failures from one IP w/ distinct CPFs, then `expect(resFinal.status()).toBe(401)` + `expect(await resFinal.json()).toEqual(ERRO_GENERICO)` + `expect(idSessaoDaResposta(resFinal)).toBeNull()` with **correct credentials**; integration at `src/lib/auth/rate-limit-ip.integration.test.ts:56-78` asserts `tentativas === 20` and `bloqueadoAte` within `[antes+BLOQUEIO_MS, depois+BLOQUEIO_MS]` | ✅ PASS |
| **CA-SEC-04** — respostas indistinguíveis (corpo, código e **tempo aproximado**) | corpo/código idênticos **e** tempo aproximado indistinguível | Corpo/código: `e2e/login.spec.ts:164-185` (CA-AU-04). Tempo — mecanismo: `src/app/api/auth/login/route.integration.test.ts:78-79` — `expect(verifyPasswordSpy).toHaveBeenCalledWith(DUMMY_HASH, "qualquerSenha1")` e `:95-102` — `toHaveBeenCalledWith(usuario.senhaHash, "senhaErrada999")` + `not.toHaveBeenCalledWith(DUMMY_HASH, expect.anything())`, provando que o custo do argon2 é pago em ambos os caminhos de falha. Wall-clock complementar: `e2e/login.spec.ts:301-351` | ✅ **PASS** (was ❌ GAP) |
| **CA-SEC-09** — expiração por inatividade | sessão inativa além do tempo expira; janela desliza na atividade | `src/lib/auth/session.integration.test.ts:82-112` — `expect(segundaLeitura!.sessao.expiraEm.getTime()).toBeGreaterThanOrEqual(antesSegundaLeitura + SESSAO_TTL_MS)` + DB re-read; expiry preserved `:114-125`; cookie sem prazo fixo `e2e/login.spec.ts:117-118` | ✅ PASS |
| **CA-SEC-10** — console e rede limpos | nenhum dado sensível (senha, hash, token, CPF de terceiros, stack trace) | `e2e/security-headers.spec.ts:116-125` — `not.toMatch(/senhaHash/i)`, `not.toMatch(/\$argon2/i)`, `not.toContain(NOVA_SENHA)`, `not.toContain(CPF_OUTRO_USUARIO)`, `not.toContain(idSessao)`, `not.toContain(idCsrf)`, `not.toMatch(/\bat\s+\S+\s*\([^)]*:\d+:\d+\)/)` | ✅ PASS |
| **CA-SEC-11** — erro genérico + id de correlação | resposta genérica + id de correlação; detalhe só no log de servidor | `e2e/usuarios.spec.ts:220-253` — real Prisma unique-constraint path: `expect(segundo.status()).toBe(500)`, `expect(corpo.erro).toBe("Erro interno. Contate o suporte informando o código.")`, `expect(corpo.idCorrelacao).toMatch(uuid)`, `not.toMatch(/prisma|constraint|unique/i)`. Unit: `src/lib/errors/api-error.test.ts:14-32` | ✅ PASS |
| **CA-SEC-12** — CPF mascarado em log | CPF aparece mascarado, nunca completo | `src/lib/errors/api-error.test.ts:34-50` — `toContain("529******25")` **e** `not.toContain("52998224725")`; primitivo em `src/lib/log/mask.test.ts:6-22` | ✅ PASS |
| **CA-SEC-13** — sem dados em URL | nenhuma URL contém CPF, senha ou token | `e2e/security-headers.spec.ts:102-107` — `not.toContain(CPF_FLUXO)`, `not.toContain(NOVA_SENHA)`, `not.toContain(idSessao)`, `not.toContain(idCsrf)` | ✅ PASS |
| **CA-SEC-14** — 403 reavaliado no servidor | requisição forjada a recurso de outro ofertante → 403 | Unit only: `src/lib/auth/guards.test.ts:99-157` — GO/VO cross-ofertante `false` (`:128-132`, `:140-144`), same-ofertante `true`, AM/GT/VT `true`, AL `false` | ⚠️ **Deliberate scope limit** (design.md Riscos) — no scoped GET resource exists yet; e2e closure deferred to `ofertante-e-verba`. Not counted as a gap |
| **CA-SEC-15** — CSRF exigido | requisição de escrita sem token válido é rejeitada | `e2e/csrf.spec.ts:53-108` — 403 sem token, 403 com token divergente, 200 com token correto, cada um com asserção de estado no banco. Per-route: `primeiro-acesso.spec.ts:180-206`, `usuarios.spec.ts:205-218`, `ofertantes.spec.ts:191-205`, `logout.spec.ts:109-128`. Unit: `src/lib/security/csrf.test.ts:56-92` | ✅ PASS |
| **CA-SEC-16** — headers presentes | CSP, X-Content-Type-Options e Referrer-Policy presentes | `e2e/security-headers.spec.ts:74-76` — os três asseridos individualmente; spec exige presença, `toBeTruthy` casa com o outcome; discriminação confirmada por M6 | ✅ PASS |
| **CA-SEC-17** — servidor valida mesmo com cliente burlado | payload violando regra condicional enviado direto à API é rejeitado | `e2e/primeiro-acesso.spec.ts:208-229` — POST direto com `senha !== confirmacaoSenha` e CSRF válido: `expect(res.status()).toBe(400)` + `senhaHash` ainda null, `primeiraVez` ainda true | ⚠️ **Deliberate substitution** (design.md Riscos) — P9/P9.Qual pertence à feature `formularios` não construída. Not counted as a gap |

### Inherited from `auth-e-usuarios` — non-regression spot-check only

| Criterion | Evidence it was not regressed | Result |
| --- | --- | --- |
| CA-SEC-01 / CA-SEC-02 | `src/lib/auth/rate-limit.ts` untouched; `e2e/login.spec.ts:187-211` and `:213-231` still green | ✅ Not regressed |
| CA-SEC-05 | `e2e/login.spec.ts:259-278` (CA-AU-10) still green | ✅ Not regressed |
| CA-SEC-06 | `primeiro-acesso.schema.ts` untouched; `e2e/primeiro-acesso.spec.ts:160-178` still green | ✅ Not regressed |
| CA-SEC-07 | `src/lib/auth/session.ts:101-106` keeps `httpOnly/secure/sameSite`; asserted `e2e/login.spec.ts:109-111` | ✅ Not regressed |
| CA-SEC-08 | Rotation preserved `src/app/api/auth/login/route.ts:92-95`; asserted `e2e/login.spec.ts:233-257` and `session.integration.test.ts:50-62` | ✅ Not regressed |

**Status**: ✅ All 11 implemented ACs match the spec-defined outcome. 2 deliberate scope limits (CA-SEC-14, CA-SEC-17) documented in design.md, unchanged from iteration 1, not counted as gaps.

---

## Discrimination Sensor

**Depth**: P0-full (auth / security-critical path) — 7 mutations (the 6 from iteration 1, re-run from scratch as a regression check, plus M7 added this round to probe the new test's non-shallowness).

**Scratch**: temporary `git worktree --detach` at a temp path outside the repo, never `git stash`. `node_modules` had to be a **real copy** rather than a junction — Turbopack aborts with `Symlink [project]/node_modules is invalid, it points out of the filesystem root`, which is why the first e2e attempt in the scratch failed to boot. The gitignored `src/generated/prisma` client and the `.env`/`.env.test` files were also copied in; a control run (118 unit + 21 integration, all passing) confirmed the scratch harness was valid before any mutation was injected.

| # | File:line | Mutation | Tests run | Killed? |
| - | --------- | -------- | --------- | ------- |
| M1 | `src/lib/security/csrf.ts:49` | `return timingSafeEqual(bufCookie, bufHeader)` → `return true` | `csrf.test.ts` | ✅ Killed — 1 failed / 6 passed, `AssertionError: expected true to be false` |
| M2 | `src/lib/errors/api-error.ts:38` | Removed `console.error(...)` — swallow error without logging | `api-error.test.ts` | ✅ Killed — 1 failed / 2 passed, `expected "error" to be called 1 times, but got 0 times` |
| M3 | `src/lib/auth/session.ts:69-73` | Removed the `expiraEm` sliding-window extension | `session.integration.test.ts` | ✅ Killed — 1 failed / 6 passed, `expected 1787769800272 to be >= 1787773399431` |
| M4 | `src/app/api/auth/login/route.ts:42-44` | Removed the IP-block early return | `e2e/login.spec.ts` | ✅ Killed — 10 passed / 1 failed, CA-SEC-03 `:374` expected 401 |
| **M5** | `src/app/api/auth/login/route.ts:66-69` | Removed `DUMMY_HASH` fallback — `verifyPassword` só roda quando existe hash real (reintroduz o oráculo de tempo) | **full suite**: unit + integration + e2e | ✅ **Killed** — `route.integration.test.ts:78` `expected "vi.fn()" to be called 1 times, but got 0 times` (integration 1 failed / 20 passed). Unit 118/118 and e2e **50/50 still passed**, independently reconfirming iteration 1's finding that the wall-clock test cannot see this fault — the new test is the sole killer, and nothing masks it |
| M6 | `next.config.ts:15` | Removed the `Referrer-Policy` header | `e2e/security-headers.spec.ts` | ✅ Killed — `:76` `toBeTruthy()` received undefined |
| **M7** | `src/app/api/auth/login/route.ts:66-69` | **New this round.** Fallback swapped for a cheap non-argon2 string (`?? "nao-e-um-hash-argon2"`, with `.catch(() => false)`) — `verifyPassword` is still called **exactly once**, so a count-only assertion cannot see it, but the argon2 cost is no longer paid: the timing oracle returns | `route.integration.test.ts` | ✅ **Killed** — 1 failed / 1 passed, on the argument diff: `- "$argon2id$v=19$...L31+8"` / `+ "nao-e-um-hash-argon2"`. Proves the value assertion at `:79` is load-bearing, not decorative |

**Result**: 7/7 killed — ✅ PASS

**Isolation verified**: scratch worktree removed (`git worktree remove --force`, then `git worktree prune`; the directory itself needed a `robocopy /MIR` from an empty dir to clear the deep `node_modules` paths, then `Remove-Item`). `git worktree list` shows only the main tree. `git status --porcelain` on the real tree is **empty** — byte-identical to the pre-sensor baseline captured before any sensor work. HEAD unchanged at `462d658`. Every mutation was reverted in-scratch with `git checkout --` and re-confirmed before the next was applied.

---

## Gate Check

- **Full gate**: `npm run test:unit && npm run test:integration && npm run test:e2e`
  - Unit: **118 passed**, 0 failed (13 files)
  - Integration: **21 passed**, 0 failed (5 files — was 4; `route.integration.test.ts` is the new file, +2 tests)
  - e2e: **50 passed**, 0 failed
  - **Total: 189 passed, 0 failed, 0 skipped** — matches the expected new baseline exactly (187 + 2)
- **Build gate** (exact order `npm run lint && npm run build && npm run typecheck`):
  - `lint` → exit 0 (3 warnings, 0 errors — the pre-existing `_request` unused args in `api-error.test.ts:18,38,53`; unchanged from iteration 1, the new file adds none)
  - `build` → exit 0 (`/login` still listed `○ (Static)`)
  - `typecheck` → exit 0
- **Environment**: `spma-mysql` Up 22 hours (healthy) confirmed via `docker compose ps` before the run; port 3000 confirmed free before the e2e leg
- **Test count**: 137 pre-feature → 187 at iteration 1 → **189 now** (**+52 total**, **+2 this iteration**). No test deleted, skipped, or weakened. `e2e/login.spec.ts` is untouched since `f7ea199`, so the iteration-1 timing assertion still runs — the fix **added** coverage rather than trading one test for another.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — one new test file, zero production changes |
| Surgical changes | ✅ — the fix touches nothing outside its own new file plus a `tasks.md` note |
| No scope creep | ✅ — `podeAcessarOfertante` remains the only unconsumed addition, authorized by T7/design.md |
| Matches patterns | ✅ — `*.integration.test.ts` naming, `beforeAll`/`afterAll` fixture cleanup, dedicated `x-forwarded-for` buckets (`:32-33`) and `prisma.$disconnect()` (`:67`) match `session.integration.test.ts` and `rate-limit-ip.integration.test.ts` |
| Spec-anchored outcome check | ✅ — 11/11 implemented ACs now match the spec-defined outcome |
| Per-layer Coverage Expectation met | ✅ — unchanged; every state-changing route wrapped in `comTratamentoDeErro`, 4 of 5 require CSRF, login exempt by design |
| Every test maps to a spec requirement | ✅ — the 2 new tests are claimed by T12's `Done when` list in `tasks.md` and cite REQ-SEC-04 in the file header (`:1-9`) and describe block (`:52`) |
| Documented guidelines followed | ✅ — `AGENTS.md` Next.js guide; the new file uses the current `vi.hoisted` + `vi.mock` + `importActual` idiom for Vitest 4 |

**Test-isolation note (verified, not a finding)**: the fixture CPFs (`30040050009`, `60070080020`) and IPs (`198.51.100.60/.61`) are unique to this file and cleaned in both `beforeAll` and `afterAll` (`:43-50`), and the integration suite runs against `spma_test`. Running the file twice in a row and running the full integration leg twice both stayed green, so the new tests do not poison the shared rate-limit buckets.

---

## Edge Cases

- [x] `mascararCPF` never throws on short/empty input (`mask.test.ts:14-22`)
- [x] `verificarCSRF` handles absent cookie, absent header, equal-length mismatch, different-length mismatch without a `timingSafeEqual` throw (`csrf.test.ts:64-92`)
- [x] `obterIpCliente` degrades to `"desconhecido"` without `x-forwarded-for` (`rate-limit-ip.integration.test.ts:42-46`)
- [x] Chained-proxy `x-forwarded-for` takes the first IP (`rate-limit-ip.integration.test.ts:34-40`)
- [x] Expired session still returns `null` after the sliding-window change (`session.integration.test.ts:114-125`)
- [x] Test-suite IP isolation (`e2e/login.spec.ts:29-31`, `scripts/db-test-reset.ts:20`)
- [x] **New** — CPF inexistente still pays the argon2 cost (`route.integration.test.ts:70-80`); conta existente com senha errada nunca cai no `DUMMY_HASH` (`:99-102`)

---

## Fix Plans

**None.** Both iteration-1 items are resolved or reclassified:

- **Fix 1 (Blocker) — closed.** M5 is killed; see the sensor table and "Gap 1 — closed" above.
- **Fix 2 (Minor, docs) — partially applied, remainder not blocking.** `tasks.md` T20 still reads "6 arquivos" where 4 e2e specs actually needed changes; the outcome remains correct (T18's client header covers the two UI-driven specs). The `design.md` Riscos note predicting `/login` would lose static optimization is still contradicted by the build output (`○ (Static)`). Both are documentation-accuracy nits with no behavioral consequence — recorded here, not raised as gaps.

### Observation carried forward (not a gap, downgraded from iteration 1)

Iteration 1 flagged, as a "contributing factor", that the senha-errada path performs two DB writes (`registrarFalha` + `registrarFalhaIp`, `login/route.ts:83-84`) while the CPF-inexistente path performs one (`:72`), and attributed the unmutated 411 ms vs 253 ms median gap to that asymmetry. **That attribution does not hold up**: the same report measured the dev-server noise floor at 180-400 ms per request, and a single indexed MySQL write over a local connection is single-digit milliseconds — it cannot account for a 158 ms delta. The asymmetry is real but is roughly 1-5% of the argon2 cost (~73 ms) that is now provably paid on both paths, which is comfortably inside CA-SEC-04's "tempo **aproximado**". REQ-SEC-04 itself is worded entirely about the message being non-enumerable and does not mention time at all. Equalizing the writes would be a defensible hardening, but it is not required by the spec and is not a gap. Noted so a future reader does not treat the iteration-1 framing as settled.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| REQ-SEC-03 | ✅ Verified | ✅ Verified |
| REQ-SEC-04 | ❌ Needs Fix | ✅ **Verified** (mechanism proven by call inspection; wall-clock test retained as supplementary) |
| REQ-SEC-09 | ✅ Verified | ✅ Verified |
| REQ-SEC-10 | ✅ Verified | ✅ Verified |
| REQ-SEC-11 | ✅ Verified | ✅ Verified |
| REQ-SEC-12 | ✅ Verified | ✅ Verified |
| REQ-SEC-13 | ✅ Verified | ✅ Verified |
| REQ-SEC-14 | ⚠️ Unit-level | ⚠️ Verified at unit level (e2e deferred to `ofertante-e-verba` per design.md) |
| REQ-SEC-15 | ✅ Verified | ✅ Verified |
| REQ-SEC-16 | ✅ Verified | ✅ Verified |
| REQ-SEC-17 | ✅ Verified | ✅ Verified (via `primeiroAcessoSchema` substitution per design.md) |
| REQ-SEC-01/02/05/06/07/08 | ✅ Not regressed | ✅ Not regressed |

---

## Lessons

Clean PASS with no surviving mutant, no spec-precision gap, and no `SPEC_DEVIATION` → **no new lesson recorded**, per the lessons layer's no-signal rule. L-010 (recorded at iteration 1 from mutant M5) stands.

**Maintainer note, not auto-applied**: L-010's current phrasing prescribes calibrating a timing test's tolerance against the operation it protects. What actually resolved this was a different and more robust move — abandoning wall-clock measurement for a call-level mechanism assertion. A future recurrence would be better served by guidance along the lines of *"prove a timing-normalization requirement by asserting which operation ran, not by measuring elapsed time"*. Left for the maintainer rather than rewritten here, since refining an existing lesson is not a Verifier action.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 11/11 implemented ACs match the spec-defined outcome; 0 gaps; 2 deliberate scope limits (CA-SEC-14, CA-SEC-17) accepted per design.md
**Sensor**: 7/7 mutations killed (6 regression + 1 new adversarial probe)
**Gate**: 189 passed, 0 failed, 0 skipped; build gate clean (`lint` → `build` → `typecheck`, all exit 0)

**What works**: REQ-SEC-04's timing normalization is now proven deterministically — `verifyPassword` is asserted to run exactly once against `DUMMY_HASH` for an unknown CPF and against the real `senhaHash` for a wrong password, with a negative conjunct ruling out the inverse fault. The proof is on argument **values**, verified load-bearing by a mutation (M7) that a count-only assertion would have missed. CSRF is enforced on every cookie-authenticated state-changing route with real double-submit semantics and DB-state assertions. The sliding session window is proven by a genuine time-based assertion. The generic error handler is proven against a real Prisma unique-constraint exception, and CPF masking is asserted both positively and negatively. All three security headers are individually asserted and discriminating. IP rate-limiting is proven end-to-end with correct credentials at the 21st attempt.

**Issues found**: None blocking. Two documentation-accuracy nits (`tasks.md` T20 file count, `design.md` Riscos static-optimization prediction) and one downgraded iteration-1 observation about failure-path DB-write asymmetry, all recorded above.

**Next steps**: Feature is done. Iteration 2 of the bounded 3 closes the loop — no third iteration needed.
