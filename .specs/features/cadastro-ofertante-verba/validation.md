# cadastro-ofertante-verba Validation

**Date**: 2026-08-26
**Spec**: `.specs/features/cadastro-ofertante-verba/spec.md`
**Diff range**: `9f3d33d..6bad62a` (first feature commit `a61658d` through HEAD; `9f3d33d` is the pre-feature boundary — a STATE.md handoff commit that predates the feature)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Iteration**: 1 of the bounded 3

**Verdict**: ❌ **FAIL** — one AC (CA-OV-13) has no implementation and no test anywhere in the diff. 14 of 15 ACs are covered and match the spec-defined outcome, the sensor is 7/7, and the gate is 245/245 green, so the gap is narrow and surgical — but it is a real uncovered criterion, not a documented deferral. See **Ranked Gaps**.

---

## Scope Re-derivation

Surface re-derived from `git diff 9f3d33d..HEAD --stat`, not from commit messages: 21 files, +2071/−14. Eleven commits, `a61658d` (spec) through `6bad62a` (T8). Production source touched: 2 new lib files, 1 modified lib file, 3 new route files, 2 modified route files. Everything else is tests, fixtures, and `.specs` docs.

All 8 tasks in `tasks.md` are marked complete (41 checked `Done when` boxes, 0 unchecked). I confirmed each against the actual code rather than the checkbox.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 `verba.schema.ts` | ✅ Done | `verbaSchema` + `edicaoVerbaSchema` at `src/lib/validation/schemas/verba.schema.ts:3-18`; 9 unit tests |
| T2 `verba/saldo.ts` | ⚠️ **Partial** | `calcularSaldoVerba` (`:27-40`) and `validarNovoValorTotal` (`:47-54`) delivered and tested. The **allocation**-teto validation that CA-OV-13 requires was never written — see Gap 1 |
| T3 write-authorization guards | ✅ Done | `podeEditarOfertante` `src/lib/auth/guards.ts:83-98`, `podeGerenciarVerba` `:105-107`; 13 unit tests |
| T4 `ofertantes/route.ts` | ✅ Done | `GET` scoping `:109-143`, `POST` extended for AM/GT `:34-80`; GO auto-cadastro path preserved byte-for-byte at `:85-104` |
| T5 `ofertantes/[id]/route.ts` | ✅ Done | `GET` `:18-44`, `PATCH` `:46-99` |
| T6 `verbas/route.ts` | ✅ Done | `POST` `:12-61`, `GET` `:63-100` |
| T7 `verbas/[id]/route.ts` | ✅ Done | `GET` `:19-45`, `PATCH` `:47-108` |
| T8 `usuarios/route.ts` | ✅ Done | Existence pre-check added at `:60-69`; `SPEC_DEVIATION` documented in the file header `:6-11` |

**Non-regression on the reopened surface**: `usuarios/route.ts` was already verified and closed by `auth-e-usuarios`. The change is strictly additive — one `findUnique` guard inserted after `resolverOfertante`, no existing line removed. Confirmed by reading the diff hunk, and by the full gate staying green on that route's pre-existing tests.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| **CA-OV-01** — pré-cadastro por AM/GT | Ofertante criado, consultável em seguida | `e2e/ofertantes.spec.ts:230-245` — `expect(res.status()).toBe(201)` + `expect(listarOfertantesPorNome(NOME_OFERTANTE_POR_AM)).toHaveLength(1)` + `expect(getUsuario(CPF_AM)?.cdOfertante).toBeNull()` (prova o "sem se vincular"). GT idem `:247-261` | ✅ PASS |
| **CA-OV-02** — campo obrigatório ausente | HTTP 400 indicando o campo faltante | Rota: `e2e/ofertantes.spec.ts:263-275` — `expect(res.status()).toBe(400)` (sem nome). Campo-a-campo no schema: `src/lib/validation/schemas/ofertante.schema.test.ts:13` (uf ausente), `:21` (uf ≠ 2 chars) | ⚠️ **Spec-precision gap** — o "indicando o campo faltante" nunca é asserido; só o status. Ver Observação 2 |
| **CA-OV-03** — edição por GO vinculado | alteração persistida | `e2e/ofertantes-id.spec.ts:101-114` — `expect(res.status()).toBe(200)` **e** `expect(getOfertante(cdOfertanteA)?.nome).toBe("Ofertante A Editado")` (leitura direta do banco, não do corpo da resposta) | ✅ PASS |
| **CA-OV-04** — edição fora de escopo negada | HTTP 403 **e** Ofertante B inalterado | `e2e/ofertantes-id.spec.ts:116-130` — `expect(res.status()).toBe(403)` **e** `expect(getOfertante(cdOfertanteB)?.nome).toBe(nomeOriginal)`. Conjunção completa | ✅ PASS |
| **CA-OV-05** — vínculo a Ofertante inexistente | erro **claro** identificando o problema, não erro genérico de banco | `e2e/usuarios.spec.ts:299-318` — `expect(res.status()).toBe(400)` **e** `expect(corpo.erro).toBe("Ofertante informado não existe")` **e** `expect(getUsuario(...)).toBeNull()`. A mensagem exata é asserida, fechando o "claro". Caminho feliz preservado `:279-297` | ✅ PASS |
| **CA-OV-06** — consulta escopada | próprio → dados; outro → 403 | `e2e/ofertantes-id.spec.ts:47-60` — 200 + `expect(corpo.ofertante.cdOfertante).toBe(cdOfertanteA)`; `:62-73` — `expect(res.status()).toBe(403)` no Ofertante B. Unit exaustivo por perfil `src/lib/auth/guards.test.ts:101-158` | ✅ PASS |
| **CA-OV-07** — listagem escopada | GT → todos; GO → apenas o próprio | `e2e/ofertantes.spec.ts:277-292` — GT: `some(o => o.cdOfertante === cdOfertanteListagem)` é `true`; `:294-308` — GO: `expect(corpo.ofertantes).toHaveLength(1)` **e** `expect(corpo.ofertantes[0].cdOfertante).toBe(cdOfertanteListagem)`. O `toHaveLength(1)` é o que torna a asserção discriminante | ✅ PASS |
| **CA-OV-08** — criação de Verba | Verba criada vinculada ao Ofertante | `e2e/verbas.spec.ts:47-63` — 201 **e** `expect(corpo.verba.cdOfertante).toBe(cdOfertante)` **e** `expect(Number(corpo.verba.vlVerba)).toBe(12000)` **e** `expect(getVerba(corpo.verba.cdVerba)).not.toBeNull()`. AM idem `:65-77` (assunção AM+GT de spec.md:65 exercitada) | ✅ PASS |
| **CA-OV-09** — Verba com Ofertante inexistente | rejeitada com erro **claro** | `e2e/verbas.spec.ts:93-105` — `expect(res.status()).toBe(400)` apenas. Implementação em `src/app/api/verbas/route.ts:44-50`. Sensor M2 provou que o 400 discrimina contra o caminho FK cru (que devolve 500) | ⚠️ **Spec-precision gap** — o "claro" (mensagem) não é asserido, ao contrário do CA-OV-05 irmão. Ver Observação 1 |
| **CA-OV-10** — saldo inicial = total | `saldoDisponivel === valorTotal` | Serviço: `src/lib/verba/saldo.integration.test.ts:61-66` — `expect(saldo.totalAlocado.toNumber()).toBe(0)` **e** `expect(saldo.saldoDisponivel.toNumber()).toBe(10000)`. Rota (`GET` por id): `e2e/verbas-id.spec.ts:71-72` — `toBe(8000)`. Rota (listagem): `e2e/verbas.spec.ts:166` — `toBe(5000)`. Valor numérico, não presença de campo | ✅ PASS |
| **CA-OV-11** — saldo reduzido pela alocação | `saldoDisponivel === valorTotal − X` | `src/lib/verba/saldo.integration.test.ts:68-73` — `totalAlocado` `toBe(4000)` **e** `saldoDisponivel` `toBe(6000)` sobre `vlVerba` 10000. e2e: `e2e/verbas-id.spec.ts:77-78` — `toBe(5000)` sobre 8000 com 3000 alocados | ✅ PASS |
| **CA-OV-12** — teto com igualdade permitida | alocação de exatamente Y **aceita** **e** saldo resultante **zero** (AD-016) | Regra AD-016 (igualdade permitida) exercitada na direção **edição**: `src/lib/verba/saldo.integration.test.ts:75-79` — `validarNovoValorTotal(cdVerbaComCurso, 4000)` → `expect(valido).toBe(true)`; e2e `e2e/verbas-id.spec.ts:96-115` — `expect(res.status()).toBe(200)` **e** `expect(Number(getVerba(cdVerbaComCurso)?.vlVerba)).toBe(3000)` | ⚠️ **Partial** — a regra de igualdade está genuinamente provada, mas (a) na direção *edição de valor total*, não na *alocação a curso* que o critério descreve, e (b) o conjunto "saldo resultante é zero" nunca é asserido (nenhum `GET` de saldo após a edição). Ver Observação 3 |
| **CA-OV-13** — teto violado rejeitado | alocação maior que Y **rejeitada** **e** saldo disponível **informado no retorno** | **nenhuma evidência** — nenhuma função valida uma alocação proposta contra o saldo, e nenhum teste em todo o diff cita CA-OV-13 (`grep -rn "CA-OV-13"` → só `spec.md:110` e `tasks.md:330`) | ❌ **GAP** — ver Gap 1 |
| **CA-OV-14** — redução abaixo do já alocado | rejeitada **e** valor total **inalterado** | `e2e/verbas-id.spec.ts:117-131` — `expect(res.status()).toBe(409)` **e** `expect(getVerba(cdVerbaComCurso)?.vlVerba).toBe(valorOriginal)`, com `valorOriginal` lido do banco *antes* da tentativa (`:119`). Conjunção completa, valor persistido verificado — não só o status. Serviço: `saldo.integration.test.ts:81-85` — `validarNovoValorTotal(..., 3999.99)` → `toBe(false)` (fronteira de 1 centavo) | ✅ PASS |
| **CA-OV-15** — escopo reforçado no servidor (fecha CA-SEC-14) | requisição forjada a recurso de outro Ofertante → 403, provando independência do cliente | **Ofertante, leitura**: `e2e/ofertantes-id.spec.ts:62-73` → 403. **Ofertante, escrita**: `:116-130` → 403 + estado inalterado. **Verba, leitura**: `e2e/verbas-id.spec.ts:83-94` → 403. **Verba, escrita**: `:133-147` → 403 + `expect(getVerba(...)?.vlVerba).toBe(valorOriginal)`. **Filtro forjado ignorado**: `e2e/verbas.spec.ts:138-154` — GO pede `?cdOfertante=<alheio>` e `expect(corpo.verbas.every(v => v.cdOfertante === cdOfertante2)).toBe(true)`. Todas as requisições são construídas direto contra a API com cookie+CSRF, sem UI | ✅ PASS |

**Status**: ❌ 14/15 ACs cobertos e casando com o outcome da spec; **1 gap** (CA-OV-13); 3 observações de precisão/parcialidade registradas abaixo.

### `podeEditarOfertante` vs `podeAcessarOfertante` — a assimetria pedida, verificada

Esta é a decisão de design não-óbvia da feature (design.md:138), e está testada **como assimetria**, não só implementada:

- VT **lê** qualquer Ofertante: `src/lib/auth/guards.test.ts:124-128` — `podeAcessarOfertante({ tipo: "VT", ... }, 1)` → `toBe(true)`
- VT **não edita** nada: `src/lib/auth/guards.test.ts:181-183` — `podeEditarOfertante({ tipo: "VT", ... }, 1)` → `toBe(false)`
- E o mesmo contraste no nível de rota: `e2e/ofertantes-id.spec.ts:132-146` — VT autenticado faz `PATCH`, recebe `403` **e** `expect(getOfertante(cdOfertanteA)?.nome).toBe(nomeOriginal)`
- VO idem (lê o próprio, não edita): `guards.test.ts:148-152` vs `:185-187`, e e2e `ofertantes-id.spec.ts:148-162`

A mutação M1 confirma que essa assimetria é load-bearing e não decorativa.

---

## Payload / Conjunction Check

Regra aplicada: campos de payload precisam ser asseridos por **valor**, não por presença ou por status 200.

| Campo | Verificação |
| --- | --- |
| `saldoDisponivel` (GET por id) | ✅ Valor numérico: `e2e/verbas-id.spec.ts:72` `toBe(8000)`, `:78` `toBe(5000)`. Nunca `toBeDefined()`/`toBeTruthy()` |
| `saldoDisponivel` (listagem) | ✅ Valor numérico: `e2e/verbas.spec.ts:166` `toBe(5000)`, sobre o item localizado por `cdVerba` |
| `saldoDisponivel` / `totalAlocado` (serviço) | ✅ Ambos os campos asseridos por valor em cada caso: `saldo.integration.test.ts:64-65` e `:71-72` |
| `vlVerba` persistido (CA-OV-12/14) | ✅ Lido do banco via `getVerba`, não do corpo da resposta — `verbas-id.spec.ts:106`, `:128`, `:144` |
| `totalAlocado` no corpo do 409 | ❌ A rota devolve `totalAlocado` no 409 (`src/app/api/verbas/[id]/route.ts:92-99`), mas **nenhum teste lê esse campo**. Não é um AC (CA-OV-14 exige só rejeição + valor preservado, ambos asseridos), mas é payload não coberto |
| `corpo.erro` (CA-OV-05) | ✅ Igualdade exata de string: `e2e/usuarios.spec.ts:315` |
| `corpo.erro` (CA-OV-09) | ❌ Não asserido — só o status. Ver Observação 1 |

---

## Discrimination Sensor

**Depth**: P0-full — 7 mutações. A feature é caminho de autorização e integridade financeira (escopo por Ofertante + teto de verba), então aplica-se o tier crítico (≥5 mutações cobrindo todos os ramos), não o lightweight.

**Scratch**: `git worktree add` desanexado, **nunca** `git stash`. Primeira tentativa num path sob `AppData/Local/Temp` falhou a subir o dev server: Turbopack aborta com `Symlink [project]/node_modules is invalid, it points out of the filesystem root`. Resolvido conforme a documentação do próprio Next (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopack.md:122` — "configure `turbopack.root` to the parent directory of both the project and the linked dependencies"): worktree recriado em `Projetos/spma-sensor-wt` (irmão do repo, fora dele) com `turbopack.root` apontando para `Projetos/`, e `node_modules` + `src/generated` ligados por junction. `.env.test` copiado. Nenhum arquivo do scratch pertence à árvore real.

| # | File:line | Mutação | Testes rodados | Killed? |
| - | --------- | ------- | -------------- | ------- |
| **M1** | `src/lib/auth/guards.ts:93` | Ramo `VT` de `podeEditarOfertante` passa a `return true` (destrói a assimetria leitura/escrita) | `guards.test.ts` | ✅ **Killed** — 1 failed / 27 passed. `guards.test.ts:182` `AssertionError: expected true to be false` |
| **M2** | `src/app/api/verbas/route.ts:43-50` | Removida a checagem de existência do Ofertante antes do `create` (reintroduz o caminho de erro FK cru) | `e2e/verbas.spec.ts` | ✅ **Killed** — 1 failed / 7 passed. CA-OV-09 `Received: 500` em vez de 400 — prova que a asserção de status, embora não cheque a mensagem, **discrimina** contra o 500 genérico |
| **M3** | `src/lib/verba/saldo.ts:53` | `greaterThanOrEqualTo` → `greaterThan` (quebra a regra de igualdade permitida, AD-016) | `saldo.integration.test.ts` | ✅ **Killed** — 1 failed / 3 passed. `:78` `expected false to be true` |
| **M4** | `src/app/api/ofertantes/route.ts:140-141` | Ramo `AL` do switch de escopo deixa de devolver 403 e passa a devolver a lista completa | `e2e/ofertantes.spec.ts` | ✅ **Killed** — 1 failed / 10 passed. `:310` `Received: 200` em vez de 403 |
| **M5** | `src/lib/auth/guards.ts:106` | `podeGerenciarVerba` passa a devolver `true` também para `GO` | `guards.test.ts` | ✅ **Killed** — 1 failed / 27 passed. `:204` `expected true to be false` |
| **M6** | `src/lib/verba/saldo.ts:38` | `saldoDisponivel: verba.vlVerba.minus(totalAlocado)` → `verba.vlVerba` (saldo ignora o já alocado) | `saldo.integration.test.ts` | ✅ **Killed** — 1 failed / 3 passed. `:72` `expected 10000 to be 6000` |
| **M7** | `src/app/api/verbas/route.ts:83-85` | Ramo `GO`/`VO` da listagem passa a honrar o `?cdOfertante=` do cliente em vez do vínculo da sessão (o ataque exato que CA-OV-15 descreve) | `e2e/verbas.spec.ts` | ✅ **Killed** — 1 failed / 7 passed. `:148` `Received: false` — a asserção `every(v => v.cdOfertante === cdOfertante2)` é o que pega |

**Result**: **7/7 killed** — ✅ PASS

**Isolation verified**: cada mutação foi revertida no scratch (`git checkout --` ou substituição inversa) e reconfirmada antes da seguinte. Ao final: `git worktree remove --force` + `git worktree prune`; `git worktree list` mostra só a árvore principal. O diretório do scratch foi apagado **removendo primeiro cada junction com `cmd /c rmdir`** (que remove o reparse point sem seguir para o alvo) — incluindo duas junctions que o próprio `next dev` criou em `.next/dev/node_modules/` — e só então `Remove-Item -Recurse`. `node_modules` e `src/generated/prisma` da árvore real verificados intactos depois (`Test-Path` → `True`). `git status --porcelain` na árvore real é **vazio**, idêntico ao baseline capturado antes de qualquer trabalho de sensor. HEAD inalterado em `6bad62a`. Suíte unitária re-rodada pós-sensor: 140/140 verdes.

**O que o sensor não pôde testar**: nenhuma mutação foi possível para CA-OV-13 — não existe código de validação de alocação para mutar. Essa ausência é, em si, a confirmação do Gap 1.

---

## Gate Check

- **Full gate**: `npm run test:unit && npm run test:integration && npm run test:e2e`
  - Unit: **140 passed**, 0 failed (14 files)
  - Integration: **25 passed**, 0 failed (6 files)
  - e2e: **80 passed**, 0 failed (5.9 min)
  - **Total: 245 passed, 0 failed, 0 skipped** — casa exatamente com o baseline esperado
- **Build gate** (ordem exata `npm run lint && npm run build && npm run typecheck`):
  - `lint` → exit 0 (3 warnings, 0 errors — os `_request` não usados pré-existentes em `src/lib/errors/api-error.test.ts:18,38,53`, herdados de `seguranca-transversal`; esta feature não adiciona nenhum)
  - `build` → exit 0
  - `typecheck` → exit 0
- **Environment**: `docker compose ps` → `spma-mysql` Up 24 hours (**healthy**) confirmado antes da rodada; porta 3000 confirmada livre (`netstat` sem match) antes da perna e2e
- **Test Integrity**: 189 pré-feature → **245** agora (**+56**: +22 unit, +4 integration, +30 e2e). Nenhum teste deletado, pulado ou enfraquecido. Nenhuma asserção pré-existente relaxada — verificado no diff de `e2e/usuarios.spec.ts` (puramente aditivo: 3 CPFs novos, 1 helper de login, 2 testes novos) e de `e2e/helpers/db.ts` (4 helpers novos, nenhum alterado)

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — nenhuma migration, nenhum model novo; `Ofertante`/`Verba`/`PreCurso` reusados como estavam |
| Surgical changes | ✅ — as duas rotas pré-existentes tocadas (`usuarios`, `ofertantes`) recebem só adição; o auto-cadastro do GO em `ofertantes/route.ts:85-104` está intacto |
| No scope creep | ✅ — sem exclusão/desativação (coerente com a Assunção de spec.md:66), sem abstração especulativa |
| Matches patterns | ✅ — `verificarCSRF` antes da sessão em toda mutação (`verbas/route.ts:15`, `verbas/[id]/route.ts:50`, `ofertantes/[id]/route.ts:49`), `obterSessao` + 401 explícito em vez de `requireSession()`, `comTratamentoDeErro` em todos os 10 handlers exportados |
| Spec-anchored outcome check | ❌ — 14/15; CA-OV-13 sem evidência |
| Per-layer Coverage Expectation | ⚠️ — domínio e rotas bem cobertos (happy + edge + erro em cada rota nova, incluindo 401/403/404/400/409); a lacuna é de domínio: a função de teto de alocação não existe |
| Every test maps to a spec requirement | ✅ — nenhum teste órfão. Os 3 testes sem prefixo `CA-` (`verbas.spec.ts:79`, `:107`, `verbas-id.spec.ts:133`) mapeiam a bullets explícitos de `Done when` em T6/T7 |
| Documented guidelines followed | ✅ — `AGENTS.md` (guia do Next em `node_modules/next/dist/docs/`) consultado durante o sensor para resolver o `turbopack.root`; `params: Promise<{ id: string }>` com `await` segue a convenção async-params desta versão |

**Observação de qualidade (não é finding)**: `src/app/api/verbas/route.ts:92-97` faz uma query de saldo por verba dentro de um `Promise.all` — N+1 por item da listagem. Aceitável agora (`PreCurso` está vazio, `@@index([cdVerba])` existe, e design.md:140 registra a escolha de computar sob demanda), mas vira candidato a agregação única quando houver volume. Registrado, não levantado como gap.

---

## Edge Cases

- [x] `cdOfertante` nulo em GO/VO não devolve a lista inteira — usa `?? -1` (`ofertantes/route.ts:135`, `verbas/route.ts:85`); a intenção está comentada no código
- [x] `AL` barrado nas duas listagens (`ofertantes/route.ts:140-141`, `verbas/route.ts:87-88`); asserido em `e2e/ofertantes.spec.ts:310-321`; mutação M4 confirma discriminação
- [x] Id não numérico / não positivo → 400 antes de qualquer query (`parseId`, `ofertantes/[id]/route.ts:13-16`, `verbas/[id]/route.ts:14-17`)
- [x] Ofertante inexistente → 404 (`e2e/ofertantes-id.spec.ts:88-99`)
- [x] Escopo checado **antes** de revelar existência: `ofertantes/[id]/route.ts:33-41` devolve 403 antes do `findUnique`, então um GO fora de escopo não distingue "existe" de "não existe"
- [x] Fronteira de 1 centavo abaixo do alocado rejeitada (`saldo.integration.test.ts:81-85` com 3999.99; e2e `verbas-id.spec.ts:122` com 2999.99)
- [x] `edicaoVerbaSchema` descarta `cdOfertante` se vier no payload — verba não se transfere de Ofertante (`verba.schema.test.ts:59-66`, `expect(result.data).not.toHaveProperty("cdOfertante")`)
- [x] CSRF exigido nas rotas novas (`e2e/ofertantes-id.spec.ts:164-182`, com estado do banco verificado)
- [x] Fixture de `PreCurso` limpa antes de `deleteUsuarios` por causa da FK do CPF criador (`e2e/helpers/db.ts`, `deletePreCursosPorOfertante`; usado em `verbas-id.spec.ts:59-62`)
- [ ] **Alocação acima do saldo** — sem tratamento e sem teste (Gap 1)

---

## Ranked Gaps

### Gap 1 (Major) — CA-OV-13 sem implementação e sem teste

**O que a spec pede**: CA-OV-13 (`spec.md:110-111`) — "Dado uma Verba com saldo disponível Y, quando uma alocação maior que Y é validada, então é rejeitada e o saldo disponível é informado no retorno (RN-10, CA-16 do documento fonte)". REQ-OV-12 (`spec.md:56-57`) é o requisito correspondente.

**O que existe**: `src/lib/verba/saldo.ts` entrega duas funções — `calcularSaldoVerba` (devolve o saldo) e `validarNovoValorTotal` (`:47-54`, `novoValorTotal >= totalAlocado`). Nenhuma delas valida uma **alocação proposta** contra o saldo. `validarNovoValorTotal` responde à pergunta inversa — "este novo valor *total* da verba cabe no que já foi alocado?" — que é REQ-OV-09/CA-OV-14, um critério distinto e já coberto.

**Por que isto não é o deferral documentado**: a Assunção em `spec.md:67` defere explicitamente **a rota**, não a função — "REQ-OV-12 é entregue como **função de serviço reutilizável**, testada diretamente contra o model `PreCurso` via Prisma... A **rota** que efetivamente cria um curso e chama essa função é escopo de `formulario-pre-curso`". `design.md:119` chega a nomear a função pretendida — `validarAlocacao` — na tabela de Error Handling. Essa função nunca foi escrita. O deferral cobre o consumidor; a peça que esta feature prometeu entregar está faltando.

**Como o gap entrou**: `tasks.md:330` mapeia REQ-OV-12 → CA-OV-12, CA-OV-13 → T2, mas a lista `Done when` de T2 (`tasks.md:88-91`) só enumera CA-OV-10, CA-OV-11 e o comportamento de `validarNovoValorTotal`. CA-OV-13 nunca virou um `Done when`, então a implementação seguiu fielmente o T2 escrito e a tabela de rastreabilidade ficou reivindicando cobertura que a task não pedia. É uma quebra de rastreabilidade entre spec e tasks, não descuido de implementação.

**Evidência de ausência**: `grep -rn "CA-OV-13\|validarAlocacao"` em todo o repo → apenas `spec.md:110`, `tasks.md:330` e `design.md:119` (o último só citando o nome da função no texto). Zero ocorrências em código ou teste.

**Fix task proposto**:
- **What**: adicionar `validarAlocacao(cdVerba: number, valorProposto: number): Promise<{ permitido: boolean; saldoDisponivel: Prisma.Decimal }>` em `src/lib/verba/saldo.ts`, reusando `calcularSaldoVerba`. Permitido quando `valorProposto <= saldoDisponivel` (igualdade permitida, AD-016); o `saldoDisponivel` volta sempre no retorno, satisfazendo o "informado no retorno" de CA-OV-13.
- **Where**: `src/lib/verba/saldo.ts`; testes em `src/lib/verba/saldo.integration.test.ts`.
- **Verify**: três casos de integração contra `spma_test` — alocação abaixo do saldo aceita; alocação **exatamente igual** ao saldo aceita com saldo resultante zero (fecha o conjunto faltante de CA-OV-12); alocação 1 centavo acima rejeitada **com `saldoDisponivel` correto no retorno** (CA-OV-13).
- **Done when**: os três testes passam e uma mutação `<=` → `<` é morta pelo caso de igualdade.
- **Priority**: Major — bloqueia o fechamento de REQ-OV-12, mas não afeta nenhuma rota em produção hoje (nada chama a função ausente), então não há risco em runtime na superfície atual.

---

## Observations (registradas, não contadas como gaps)

**Observação 1 — CA-OV-09 assere status, não clareza.** `e2e/verbas.spec.ts:102` checa só `toBe(400)`. O critério pede "erro claro", e o irmão CA-OV-05 (`e2e/usuarios.spec.ts:315`) assere a string exata. A mutação M2 provou que o 400 discrimina contra o 500 genérico, então não há buraco de comportamento — mas um regresso que trocasse a mensagem por "Dados inválidos" passaria. Uma linha (`expect(corpo.erro).toBe("Ofertante informado não existe")`) fecharia.

**Observação 2 — CA-OV-02 não assere o campo faltante.** `e2e/ofertantes.spec.ts:272` checa só `toBe(400)`, e só para `nome` ausente. O ramo `uf` ausente está coberto no schema (`ofertante.schema.test.ts:13`), então o comportamento existe; o que falta é a asserção de que a resposta **indica** o campo, como o critério pede. A rota já propaga `entrada.error.issues[0].message` (`ofertantes/route.ts:57`), então a informação está lá, apenas não verificada.

**Observação 3 — CA-OV-12 coberto por análogo, com um conjunto não asserido.** O critério descreve uma **alocação** de exatamente Y; o teste exercita uma **edição** que iguala o total ao já alocado. A regra AD-016 (igualdade permitida) está genuinamente provada, e a mutação M3 confirma que é discriminante. Mas: (a) a direção testada não é a que o critério descreve — a direção correta depende do Gap 1; (b) o segundo conjunto, "o saldo resultante é zero", nunca é asserido — `verbas-id.spec.ts:106` verifica `vlVerba === 3000` mas não faz um `GET` subsequente para confirmar `saldoDisponivel === 0`. O nome do teste promete "(saldo zero)" mais do que o corpo verifica. O fix do Gap 1 resolve ambos.

**Observação 4 — `totalAlocado` no 409 não é lido por nenhum teste.** `verbas/[id]/route.ts:92-99` inclui `totalAlocado` no corpo do 409 para indicar o mínimo permitido (design.md:118). CA-OV-14 não exige esse campo, e os dois conjuntos que ele exige estão asseridos — então não é gap. Mas é payload entregue e não verificado: poderia sumir sem quebrar nada.

**Observação 5 — SPEC_DEVIATION de REQ-OV-04 confirmado como legítimo.** REQ-OV-04 diz "cria **ou atualiza**". Confirmei por busca que não existe rota de edição de `Usuario` em lugar nenhum (`src/app/api/usuarios/` tem só `route.ts` com `POST`). A metade "atualiza" não tem alvo, e isso está documentado tanto em `design.md:130` quanto no cabeçalho do próprio arquivo (`src/app/api/usuarios/route.ts:6-11`). Deferral correto e visível no código, exatamente como a disciplina de SPEC_DEVIATION pede.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| REQ-OV-01 | Implementing | ✅ Verified |
| REQ-OV-02 | Implementing | ✅ Verified |
| REQ-OV-03 | Implementing | ✅ Verified |
| REQ-OV-04 | Implementing | ✅ Verified (metade "cria"; "atualiza" sem alvo — SPEC_DEVIATION documentado) |
| REQ-OV-05 | Implementing | ✅ Verified |
| REQ-OV-06 | Implementing | ✅ Verified |
| REQ-OV-07 | Implementing | ✅ Verified — **fecha CA-SEC-14**, que `seguranca-transversal` deixou em nível unitário |
| REQ-OV-08 | Implementing | ✅ Verified |
| REQ-OV-09 | Implementing | ✅ Verified |
| REQ-OV-10 | Implementing | ✅ Verified |
| REQ-OV-11 | Implementing | ✅ Verified |
| REQ-OV-12 | Implementing | ❌ **Needs Fix** — CA-OV-12 parcial, CA-OV-13 sem implementação (Gap 1) |

---

## Summary

**Overall**: ⚠️ Issues — uma correção pontual separa esta feature do PASS

**Spec-anchored check**: 14/15 ACs casam com o outcome da spec; 1 gap (CA-OV-13); 3 observações de precisão
**Sensor**: 7/7 mutações mortas (tier P0-full)
**Gate**: 245 passed, 0 failed, 0 skipped; build gate limpo (`lint` → `build` → `typecheck`, todos exit 0)

**What works**: O escopo por Ofertante é reforçado no servidor em todas as quatro combinações (Ofertante/Verba × leitura/escrita), com requisições forjadas direto contra a API e estado do banco verificado após cada 403 — CA-SEC-14, deixado em aberto por `seguranca-transversal`, está genuinamente fechado. A assimetria `podeEditarOfertante` vs `podeAcessarOfertante` (VT lê tudo, VT não edita nada) está testada como assimetria em ambos os níveis e confirmada load-bearing pela mutação M1. O cálculo de saldo é asserido por valor numérico em três superfícies distintas (serviço, GET por id, listagem), nunca por presença de campo. CA-OV-14 verifica os dois conjuntos — 409 **e** valor persistido inalterado lido do banco. CA-OV-05 assere a mensagem exata, e a mutação M2 prova que o pré-check evita mesmo o 500 de FK cru. A rota `usuarios` reaberta não regrediu.

**Issues found**: Gap 1 — CA-OV-13 (rejeição de alocação acima do saldo) não tem implementação nem teste. A Assunção da spec deferiu a *rota* consumidora para `formulario-pre-curso`, mas prometeu a *função de serviço* nesta feature; `design.md:119` chega a nomeá-la `validarAlocacao`. O que existe (`validarNovoValorTotal`) responde à pergunta inversa e já serve CA-OV-14. A causa raiz é de rastreabilidade: `tasks.md:330` reivindica REQ-OV-12 sob T2, mas nenhum `Done when` de T2 menciona CA-OV-13.

**Next steps**: Executar o fix task do Gap 1 (uma função + três testes de integração, sem mudança de rota), depois re-despachar o Verifier. Iteração 1 de 3.
