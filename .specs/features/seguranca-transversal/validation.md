# seguranca-transversal Validation

**Date**: 2026-08-26
**Spec**: `.specs/features/seguranca-transversal/spec.md`
**Diff range**: `442ffd8..2790253` (first feature commit `f541284` through HEAD; `442ffd8` is the pre-feature boundary)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero

**Verdict**: ❌ **FAIL** — 1 surviving mutant. All 22 tasks are implemented and all 187 tests pass, but the CA-SEC-04 timing assertion is non-discriminating: it does not detect removal of the timing normalization it exists to protect. One fix task below.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 `TentativaLoginIp` + migration | ✅ Done | `prisma/schema.prisma:94-104`, `prisma/migrations/20260825214241_add_tentativa_login_ip/migration.sql:1-9`; only the new model added |
| T2 `mascararCPF` | ✅ Done | `src/lib/log/mask.ts:6-21` |
| T3 `DUMMY_HASH` | ✅ Done | `src/lib/auth/password.ts:16-17`; no existing function altered |
| T4 `rate-limit-ip.ts` | ✅ Done | `src/lib/auth/rate-limit-ip.ts:9-58` |
| T5 `csrf.ts` | ✅ Done | `src/lib/security/csrf.ts:12-55` |
| T6 `csrf-client.ts` | ✅ Done | `src/lib/security/csrf-client.ts:8-25` |
| T7 `podeAcessarOfertante` | ✅ Done | `src/lib/auth/guards.ts:60-75` |
| T8 `comTratamentoDeErro` | ✅ Done | `src/lib/errors/api-error.ts:26-49` |
| T9 static security headers | ✅ Done | `next.config.ts:9-28` |
| T10 nonce + CSP via proxy | ✅ Done | `src/proxy.ts:41-99`; no Prisma import (verified by reading imports at `src/proxy.ts:13-16`) |
| T11 error boundaries | ✅ Done | `src/app/error.tsx:7-21`, `src/app/global-error.tsx:7-22`; neither references `error.message`/`error.stack` |
| T12 login hardening | ⚠️ Partial | Implemented at `src/app/api/auth/login/route.ts:38-100`; the CA-SEC-04 half is not protected by a discriminating test (see Gap 1) |
| T13 primeiro-acesso CSRF | ✅ Done | `src/app/api/auth/primeiro-acesso/route.ts:22-24,65` |
| T14 logout CSRF | ✅ Done | `src/app/api/auth/logout/route.ts:16-18,28,33` |
| T15 usuarios CSRF | ✅ Done | `src/app/api/usuarios/route.ts:20-22,85` |
| T16 ofertantes CSRF | ✅ Done | `src/app/api/ofertantes/route.ts:21-23,85` |
| T17 sliding session | ✅ Done | `src/lib/auth/session.ts:65-76` (extension), `:96-107` (no `expires` on cookie) |
| T18 client CSRF header | ✅ Done | 3 fetches updated: `primeiro-acesso/page.tsx:39`, `cadastro-ofertante/page.tsx:50`, `NovoUsuarioForm.tsx:49` |
| T19 e2e http helper | ✅ Done | `e2e/helpers/http.ts:40-60` |
| T20 update existing e2e specs | ✅ Done (scope note) | 4 specs actually needed changes (`primeiro-acesso`, `usuarios`, `ofertantes`, `logout`); `cadastro-ofertante-page.spec.ts` and `usuarios-novo-page.spec.ts` drive the UI (`cadastro-ofertante-page.spec.ts:36-45`) so T18's client header covers them — the task text's "6 arquivos" over-counts, outcome is correct |
| T21 `e2e/csrf.spec.ts` | ✅ Done | `e2e/csrf.spec.ts:53-108` |
| T22 `e2e/security-headers.spec.ts` | ✅ Done | `e2e/security-headers.spec.ts:35-126` |

---

## Spec-Anchored Acceptance Criteria

### Implemented by this feature

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| **CA-SEC-03** — IP acima do limite recebe cooldown | novas tentativas daquele IP recebem cooldown | `e2e/login.spec.ts:353-378` — 20 failures from one IP w/ distinct CPFs, then `expect(resFinal.status()).toBe(401)` + `expect(await resFinal.json()).toEqual(ERRO_GENERICO)` + `expect(idSessaoDaResposta(resFinal)).toBeNull()` with **correct credentials**; unit/integration at `src/lib/auth/rate-limit-ip.integration.test.ts:56-78` asserts `tentativas === 20` and `bloqueadoAte` within `[antes+BLOQUEIO_MS, depois+BLOQUEIO_MS]` | ✅ PASS |
| **CA-SEC-04** — respostas indistinguíveis (corpo, código e **tempo aproximado**) | corpo/código idênticos **e** tempo aproximado indistinguível | Body/status: `e2e/login.spec.ts:164-185` (CA-AU-04) ✅. Timing: `e2e/login.spec.ts:301-351` — `expect(razao).toBeGreaterThan(0.2)` / `toBeLessThan(5)` | ❌ **GAP** — assertion does not discriminate (see Gap 1) |
| **CA-SEC-09** — expiração por inatividade | sessão inativa além do tempo expira; janela desliza na atividade | `src/lib/auth/session.integration.test.ts:82-112` — real time-based: `expect(segundaLeitura!.sessao.expiraEm.getTime()).toBeGreaterThanOrEqual(antesSegundaLeitura + SESSAO_TTL_MS)` and DB re-read `expect(persistida.expiraEm.getTime()).toBe(...)`; expiry preserved at `:114-125` (`expiraEm` in past → `null`); cookie has no fixed prazo, `e2e/login.spec.ts:117-118` (`not.toMatch(/Expires=/i)`, `not.toMatch(/Max-Age=/i)`) | ✅ PASS |
| **CA-SEC-10** — console e rede limpos | nenhum dado sensível (senha, hash, token, CPF de terceiros, stack trace) | `e2e/security-headers.spec.ts:116-125` — over console text **and** response bodies: `not.toMatch(/senhaHash/i)`, `not.toMatch(/\$argon2/i)`, `not.toContain(NOVA_SENHA)`, `not.toContain(CPF_OUTRO_USUARIO)`, `not.toContain(idSessao)`, `not.toContain(idCsrf)`, `not.toMatch(/\bat\s+\S+\s*\([^)]*:\d+:\d+\)/)` | ✅ PASS |
| **CA-SEC-11** — erro genérico + id de correlação | resposta genérica + id de correlação; detalhe só no log de servidor | `e2e/usuarios.spec.ts:220-253` — real Prisma unique-constraint path: `expect(segundo.status()).toBe(500)`, `expect(corpo.erro).toBe("Erro interno. Contate o suporte informando o código.")`, `expect(corpo.idCorrelacao).toMatch(uuid)`, plus `not.toMatch(/prisma|constraint|unique/i)`. Unit: `src/lib/errors/api-error.test.ts:14-32` | ✅ PASS |
| **CA-SEC-12** — CPF mascarado em log | CPF aparece mascarado, nunca completo | `src/lib/errors/api-error.test.ts:34-50` — `expect(mensagemLogada).toContain("529******25")` **and** `expect(mensagemLogada).not.toContain("52998224725")`; unit of the primitive at `src/lib/log/mask.test.ts:6-22` | ✅ PASS |
| **CA-SEC-13** — sem dados em URL | nenhuma URL contém CPF, senha ou token | `e2e/security-headers.spec.ts:102-107` — every observed request URL: `not.toContain(CPF_FLUXO)`, `not.toContain(NOVA_SENHA)`, `not.toContain(idSessao)`, `not.toContain(idCsrf)` | ✅ PASS |
| **CA-SEC-14** — 403 reavaliado no servidor | requisição forjada a recurso de outro ofertante → 403 | Unit only: `src/lib/auth/guards.test.ts:99-157` — GO/VO cross-ofertante `false` (`:128-132`, `:140-144`), same-ofertante `true`, AM/GT/VT `true`, AL `false` | ⚠️ **Deliberate scope limit** (design.md Riscos) — no scoped GET resource exists yet; e2e closure deferred to `ofertante-e-verba`. Not counted as a gap |
| **CA-SEC-15** — CSRF exigido | requisição de escrita sem token válido é rejeitada | `e2e/csrf.spec.ts:53-108` — 403 sem token, 403 com token divergente, 200 com token correto, each with DB state assertions (`senhaHash` still null / not null). Per-route: `primeiro-acesso.spec.ts:180-206`, `usuarios.spec.ts:205-218`, `ofertantes.spec.ts:191-205`, `logout.spec.ts:109-128`. Unit branches: `src/lib/security/csrf.test.ts:56-92` | ✅ PASS |
| **CA-SEC-16** — headers presentes | CSP, X-Content-Type-Options e Referrer-Policy presentes | `e2e/security-headers.spec.ts:74-76` — all three asserted explicitly: `expect(headersLogin["content-security-policy"]).toBeTruthy()`, `expect(headersLogin["x-content-type-options"]).toBe("nosniff")`, `expect(headersLogin["referrer-policy"]).toBeTruthy()`. Spec demands presence only, so `toBeTruthy` matches the spec-defined outcome; discrimination confirmed by mutation M6 | ✅ PASS |
| **CA-SEC-17** — servidor valida mesmo com cliente burlado | payload violando regra condicional enviado direto à API é rejeitado | `e2e/primeiro-acesso.spec.ts:208-229` — direct API POST with `senha !== confirmacaoSenha` and valid CSRF: `expect(res.status()).toBe(400)` + `senhaHash` still null, `primeiraVez` still true | ⚠️ **Deliberate substitution** (design.md Riscos) — literal P9/P9.Qual belongs to the unbuilt `formularios` feature; `primeiroAcessoSchema` cross-field rule used as the concrete proof. Not counted as a gap |

### Inherited from `auth-e-usuarios` — non-regression spot-check only

| Criterion | Evidence it was not regressed | Result |
| --- | --- | --- |
| CA-SEC-01 / CA-SEC-02 | `src/lib/auth/rate-limit.ts` untouched by the diff; `e2e/login.spec.ts:187-211` (block after 5) and `:213-231` (counter reset) still green | ✅ Not regressed |
| CA-SEC-05 | `e2e/login.spec.ts:259-278` (CA-AU-10, no senha/hash in body) still green | ✅ Not regressed |
| CA-SEC-06 | `primeiro-acesso.schema.ts` untouched; `e2e/primeiro-acesso.spec.ts:160-178` (<8 chars → 400) still green | ✅ Not regressed |
| CA-SEC-07 | `src/lib/auth/session.ts:101-106` keeps `httpOnly/secure/sameSite`; asserted `e2e/login.spec.ts:109-111` | ✅ Not regressed |
| CA-SEC-08 | Rotation preserved `src/app/api/auth/login/route.ts:92-95`; asserted `e2e/login.spec.ts:233-257` and `session.integration.test.ts:50-62` | ✅ Not regressed |

**Status**: ❌ 1 gap (CA-SEC-04 timing), 2 deliberate spec-anchored scope limits (CA-SEC-14, CA-SEC-17) documented in design.md and not counted as gaps.

---

## Discrimination Sensor

**Depth**: P0-full (auth / security-critical path) — 6 mutations. Scratch: temporary `git worktree` at a temp path, never `git stash`.

| # | File:line | Mutation | Tests run | Killed? |
| - | --------- | -------- | --------- | ------- |
| M1 | `src/lib/security/csrf.ts:49` | `return timingSafeEqual(bufCookie, bufHeader)` → `return true` (CSRF always valid) | `csrf.test.ts` | ✅ Killed — 1 failed / 6 passed (`:75` expected false) |
| M2 | `src/lib/errors/api-error.ts:38` | Removed `console.error(...)` — swallow error without logging | `api-error.test.ts` | ✅ Killed — 1 failed / 2 passed (`:45` spy not called) |
| M3 | `src/lib/auth/session.ts:70-73` | Removed the `expiraEm` sliding-window extension | `session.integration.test.ts` | ✅ Killed — `:99` `expected 1787767996593 to be >= 1787771595743` |
| M4 | `src/app/api/auth/login/route.ts:42-44` | Removed the IP-block early return | `e2e/login.spec.ts` | ✅ Killed — CA-SEC-03 `:374` expected 401, received 200 (10 passed / 1 failed) |
| M5 | `src/app/api/auth/login/route.ts:66-69` | Removed `DUMMY_HASH` fallback — `verifyPassword` only runs when a real hash exists (reintroduces the timing oracle) | `e2e/login.spec.ts` | ❌ **SURVIVED** — 11/11 passed |
| M6 | `next.config.ts:15` | Removed the `Referrer-Policy` header | `e2e/security-headers.spec.ts` | ✅ Killed — `:76` `toBeTruthy()` received undefined |

**Result**: 5/6 killed, 1 survived — ❌ FAIL

**M5 quantification** (medians of 8 interleaved samples, measured in the scratch):

| Build | senha errada | CPF inexistente | ratio | assertion `0.2 < r < 5` |
| ----- | ------------ | --------------- | ----- | ----------------------- |
| Unmutated (real code) | 411 ms | 253 ms | **0.616** | passes |
| Mutated (M5, oracle present) | 403 ms | 180 ms | **0.447** | **passes anyway** |

The tolerance band admits both states, so the assertion cannot separate "normalized" from "not normalized". The measured argon2 contribution (~73 ms) is real but sits far inside the band.

**Isolation verified**: scratch worktree removed and pruned; `git worktree list` shows only the main tree; `git status --porcelain` is empty — byte-identical to the pre-sensor baseline; HEAD unchanged at `2790253`.

---

## Gate Check

- **Full gate**: `npm run test:unit && npm run test:integration && npm run test:e2e`
  - Unit: **118 passed**, 0 failed (13 files)
  - Integration: **19 passed**, 0 failed (4 files)
  - e2e: **50 passed**, 0 failed
  - **Total: 187 passed, 0 failed, 0 skipped** — matches the expected baseline exactly
- **Build gate** (exact order `npm run lint && npm run build && npm run typecheck`):
  - `lint` → exit 0 (3 warnings, 0 errors — `_request` unused args in `api-error.test.ts:18,38,53`)
  - `build` → exit 0
  - `typecheck` → exit 0
- **Environment**: `spma-mysql` Up 21 hours (healthy); port 3000 free before the e2e run
- **Test count before feature**: 137 → **after**: 187 (**+50**). No test deleted or weakened; the CSRF-driven updates to pre-existing specs *strengthened* two assertions (`usuarios.spec.ts` CA-AU-06 and `ofertantes.spec.ts` "perfil diferente de GO" had been passing on a CSRF interception rather than the permission check they were written to exercise — now they reach the original branch again)

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ — `podeAcessarOfertante` is the only unconsumed addition, explicitly authorized by T7/design.md as a foundation for `ofertante-e-verba` |
| Matches patterns | ✅ — `rate-limit-ip.ts` mirrors `rate-limit.ts`; guards stay pure functions like `cascata.ts` |
| Spec-anchored outcome check | ⚠️ — 1 of 11 ACs (CA-SEC-04) has a non-discriminating assertion |
| Per-layer Coverage Expectation met | ✅ — every state-changing route (5 of 5 `route.ts`, all POST, no Server Actions) is wrapped in `comTratamentoDeErro`; 4 of 5 require CSRF, login exempt by design (pre-session, spec REQ-SEC-15 scopes to cookie-authenticated requests) |
| Every test maps to a spec requirement | ✅ — no unclaimed tests |
| Documented guidelines followed | ✅ — `AGENTS.md` Next.js guide consulted for the CSP/nonce recipe, cited at `src/proxy.ts:37-38` |

---

## Edge Cases

- [x] `mascararCPF` never throws on short/empty input (`mask.test.ts:14-22`)
- [x] `verificarCSRF` handles absent cookie, absent header, equal-length mismatch, different-length mismatch without a `timingSafeEqual` throw (`csrf.test.ts:64-92`)
- [x] `obterIpCliente` degrades to `"desconhecido"` without `x-forwarded-for` (`rate-limit-ip.integration.test.ts:42-46`)
- [x] Chained-proxy `x-forwarded-for` takes the first IP (`rate-limit-ip.integration.test.ts:34-40`)
- [x] Expired session still returns `null` after the sliding-window change (`session.integration.test.ts:114-125`)
- [x] Test-suite IP isolation: dedicated `x-forwarded-for` buckets so rate-limit tests do not poison the shared `"desconhecido"` bucket (`e2e/login.spec.ts:29-31`), and `TB_Tentativa_Login_Ip` added to the reset list (`scripts/db-test-reset.ts:20`)

---

## Fix Plans

### Fix 1: CA-SEC-04 timing assertion does not discriminate (Blocker for PASS)

- **Root cause**: `e2e/login.spec.ts:349-350` asserts only `0.2 < ratio < 5`. Under `next dev`, framework + DB overhead (~180-400 ms/request) dwarfs the argon2 cost (~73 ms), so removing the normalization moves the ratio from 0.616 to 0.447 — still inside the band. The test therefore passes whether or not `DUMMY_HASH` is used, which is the exact behavior it exists to protect.
- **Contributing factor worth fixing with it**: even unmutated, the two paths are not equal-time (0.616 ratio). The senha-errada path performs **two** DB writes (`registrarFalha` + `registrarFalhaIp`, `login/route.ts:83-84`) while the CPF-inexistente path performs **one** (`:72`). That asymmetry is now the dominant timing signal and is itself within CA-SEC-04's "tempo aproximado" scope.
- **Fix task**:
  - **What**: (a) equalize the failure paths so both perform the same DB work before returning `erroCredenciais()`; (b) tighten the assertion to a band that a missing normalization actually violates — e.g. measure the argon2 cost in-test as the yardstick and assert the median delta stays well under it, or assert `ratio > 0.75` once (a) removes the write asymmetry.
  - **Where**: `src/app/api/auth/login/route.ts:71-89`, `e2e/login.spec.ts:301-351`
  - **Verify**: re-run the M5 mutation (remove the `DUMMY_HASH` fallback) and confirm `e2e/login.spec.ts` now FAILS; confirm the unmutated suite is stable across ≥3 consecutive runs (no flakiness).
  - **Done when**: M5 is killed and 187/187 still pass.
- **Priority**: Blocker (it is the sole reason this report is FAIL)

### Fix 2 (Minor, documentation only)

- `tasks.md` T20 says 6 e2e specs were updated; only 4 required changes. `cadastro-ofertante-page.spec.ts` and `usuarios-novo-page.spec.ts` exercise the UI, so T18's client-side header covers them. Correct the task note; no code change.
- Also worth a one-line correction: `design.md` Riscos predicted `/login` would lose static optimization from the nonce CSP, but the build output still lists `/login` as `○ (Static)` — the CSP arrives from the proxy at request time, so behavior is correct and the predicted cost did not materialize.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| REQ-SEC-03 | Implementing | ✅ Verified |
| REQ-SEC-04 | Implementing | ❌ Needs Fix (behavior implemented; test not discriminating) |
| REQ-SEC-09 | Implementing | ✅ Verified |
| REQ-SEC-10 | Implementing | ✅ Verified |
| REQ-SEC-11 | Implementing | ✅ Verified |
| REQ-SEC-12 | Implementing | ✅ Verified |
| REQ-SEC-13 | Implementing | ✅ Verified |
| REQ-SEC-14 | Implementing | ⚠️ Verified at unit level (e2e deferred to `ofertante-e-verba` per design.md) |
| REQ-SEC-15 | Implementing | ✅ Verified |
| REQ-SEC-16 | Implementing | ✅ Verified |
| REQ-SEC-17 | Implementing | ✅ Verified (via `primeiroAcessoSchema` substitution per design.md) |
| REQ-SEC-01/02/05/06/07/08 | ✅ Verified (`auth-e-usuarios`) | ✅ Not regressed |

---

## Summary

**Overall**: ⚠️ Issues — one blocker

**Spec-anchored check**: 10/11 implemented ACs matched the spec-defined outcome; 1 gap (CA-SEC-04); 2 deliberate scope limits (CA-SEC-14, CA-SEC-17) accepted per design.md
**Sensor**: 5/6 mutations killed, 1 survived
**Gate**: 187 passed, 0 failed; build gate clean

**What works**: CSRF is enforced on every state-changing route (4 of 4 cookie-authenticated POSTs; login exempt by design) with real double-submit semantics and DB-state assertions, not just status codes. The sliding session window is proven by a genuine time-based assertion that a mutation kills. The generic error handler is proven against a real Prisma unique-constraint exception, and CPF masking is asserted both positively and negatively. All three security headers are individually asserted and discriminating. IP rate-limiting is proven end-to-end with correct credentials at the 21st attempt.

**Issues found**: CA-SEC-04's timing assertion (`0.2 < ratio < 5`) passes both with and without the timing normalization — see Fix 1.

**Next steps**: Apply Fix 1 (equalize failure-path DB work + tighten the assertion), then re-run the sensor's M5 mutation to confirm it is killed. Re-verify; this is iteration 1 of the bounded 3.
