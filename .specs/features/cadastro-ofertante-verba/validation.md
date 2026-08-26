# cadastro-ofertante-verba Validation

**Date**: 2026-08-26
**Spec**: `.specs/features/cadastro-ofertante-verba/spec.md`
**Diff range**: `9f3d33d..cf1b071` (feature completa; `9f3d33d` é a fronteira pré-feature). Range do fix desta iteração: `8feaeeb..cf1b071`
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Iteration**: 2 of the bounded 3 — supersede o relatório da iteração 1 (commitado em `8feaeeb`)

**Verdict**: ✅ **PASS** — o único gap bloqueante da iteração 1 (CA-OV-13 sem implementação e sem teste) está fechado com evidência dura. 15/15 ACs cobertos e casando com o outcome da spec; sensor **6/6 mortas** (3 novas mirando `validarAlocacao` + 3 regressões da iteração 1); gate **248/248 verde**; build gate limpo. Duas observações de precisão permanecem registradas, ambas não-bloqueantes e ambas materialmente melhores que na iteração 1.

---

## Escopo desta iteração

Re-derivado de `git diff 8feaeeb..HEAD --stat`, não do relato do fix: **6 arquivos, +57/−5**.

| Arquivo | Natureza |
| --- | --- |
| `src/lib/verba/saldo.ts` | +21 — única mudança de código de produção |
| `src/lib/verba/saldo.integration.test.ts` | +16/−1 — dois testes novos + import |
| `e2e/ofertantes.spec.ts` | +19/−2 — CA-OV-02 reforçado + teste irmão de UF |
| `e2e/verbas.spec.ts` | +3/−1 — CA-OV-09 passa a asserir a mensagem |
| `e2e/verbas-id.spec.ts` | +2/−1 — apenas o relabel do teste de edição |
| `.specs/features/.../tasks.md` | +1 — `Done when` do fix (não citado no relato do fix, mas é a atualização de task exigida pela disciplina de commit atômico) |

`git diff 6bad62a..HEAD --stat -- src/` confirma que **sob `src/` só `saldo.ts` e seu teste mudaram** desde o HEAD da iteração 1. Nenhuma rota, nenhum guard, nenhum schema foi tocado — a evidência das 7 outras tasks da iteração 1 está estruturalmente intacta por construção, não por confiança.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 `verba.schema.ts` | ✅ Done | Inalterado desde a iteração 1 |
| T2 `verba/saldo.ts` | ✅ **Done** (era ⚠️ Partial) | `calcularSaldoVerba` (`:27-40`), `validarNovoValorTotal` (`:47-54`) e agora `validarAlocacao` (`:65-75`). O `Done when` faltante foi adicionado em `tasks.md:92` citando explicitamente CA-OV-12/CA-OV-13 |
| T3 guards de autorização | ✅ Done | Inalterado; regressão M1 re-confirmada abaixo |
| T4 `ofertantes/route.ts` | ✅ Done | Inalterado |
| T5 `ofertantes/[id]/route.ts` | ✅ Done | Inalterado |
| T6 `verbas/route.ts` | ✅ Done | Inalterado |
| T7 `verbas/[id]/route.ts` | ✅ Done | Inalterado |
| T8 `usuarios/route.ts` | ✅ Done | Inalterado; `SPEC_DEVIATION` no cabeçalho segue documentado |

---

## O gap da iteração 1, re-derivado

**O que a spec pede.** REQ-OV-12 (`spec.md:56-57`) — "Quando um valor é proposto para alocação a um curso a partir de uma Verba, o sistema deve rejeitar a alocação se o valor exceder o saldo disponível (REQ-OV-11), permitindo que a alocação iguale o saldo disponível a zero (AD-016)".

**O que existe agora.** `src/lib/verba/saldo.ts:65-75`:

```ts
export async function validarAlocacao(
  cdVerba: number,
  valorProposto: number,
): Promise<{ valido: boolean; saldoDisponivel: Prisma.Decimal }> {
  const { saldoDisponivel } = await calcularSaldoVerba(cdVerba);

  return {
    valido: new Prisma.Decimal(valorProposto).lessThanOrEqualTo(saldoDisponivel),
    saldoDisponivel,
  };
}
```

Confirmei lendo o arquivo, não o relato: a comparação é contra o **saldo disponível ATUAL** (via `calcularSaldoVerba`, que subtrai o já alocado), é `lessThanOrEqualTo` (igualdade permitida, AD-016), e o `saldoDisponivel` volta **sempre** no retorno — inclusive no caminho de rejeição, que é o que CA-OV-13 exige. A distinção que a iteração 1 apontou está respeitada: `validarNovoValorTotal` compara um novo valor **total** contra o já alocado (CA-OV-14, direção edição); `validarAlocacao` compara um valor **proposto** contra o saldo (CA-OV-12/13, direção alocação). São perguntas diferentes e agora existem as duas funções. O comentário `:56-63` documenta a distinção no próprio código.

**Cobertura do deferral.** A Assunção de `spec.md` defere a **rota** consumidora para `formulario-pre-curso` mas prometia a **função de serviço** nesta feature; `design.md:119` já a nomeava `validarAlocacao`. O nome entregue casa com o design. O deferral segue legítimo e agora cobre só o que sempre cobriu.

---

## Spec-Anchored Acceptance Criteria

Reproduzo abaixo apenas as linhas que mudaram nesta iteração. As 11 restantes (CA-OV-01, 03–08, 10, 11, 14, 15) foram verificadas na iteração 1 contra código que **não mudou desde então** (provado por `git diff 6bad62a..HEAD -- src/`) e permanecem ✅ PASS — ver o histórico do relatório em `8feaeeb` para as citações `file:line` completas.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| **CA-OV-02** (`spec.md:77-78`) — cadastro sem nome **ou** sem UF | HTTP 400 **indicando o campo faltante** | Ramo nome: `e2e/ofertantes.spec.ts:263` — `:272` `expect(res.status()).toBe(400)` **e** `:273` `expect((await res.json()).erro).toBe("Nome é obrigatório")`. Ramo UF: `:278` — `:287` `expect(res.status()).toBe(400)` | ⚠️ **PASS com precisão residual** — os dois ramos agora têm teste e o ramo nome assere a mensagem que **nomeia o campo**. Ver Observação 1 |
| **CA-OV-09** (`spec.md:98-99`) — Verba com Ofertante inexistente | rejeitada com **erro claro** | `e2e/verbas.spec.ts:93` — `:102` `expect(res.status()).toBe(400)` **e** `:103` `expect((await res.json()).erro).toBe("Ofertante informado não existe")` | ✅ **PASS** (era ⚠️ na iteração 1) — a metade "claro" agora é asserida por igualdade exata de string, alinhando com o irmão CA-OV-05 |
| **CA-OV-12** (`spec.md:107-108`) — alocação de exatamente Y aceita, saldo resultante zero (AD-016) | alocação de exatamente Y **aceita** | `src/lib/verba/saldo.integration.test.ts:87` — `:90` `expect(resultado.valido).toBe(true)` **e** `:91` `expect(resultado.saldoDisponivel.toNumber()).toBe(6000)`, com `valorProposto = 6000` sobre uma verba de 10000 com 4000 alocados | ✅ **PASS** — agora na direção **alocação** que o critério descreve, não mais por análogo de edição. Ver Observação 2 sobre o conjunto "saldo resultante zero" |
| **CA-OV-13** (`spec.md:110-111`) — alocação maior que Y rejeitada **e** saldo informado no retorno | rejeitada **e** `saldoDisponivel` presente **com o valor correto** | `src/lib/verba/saldo.integration.test.ts:94` — `:97` `expect(resultado.valido).toBe(false)` **e** `:98` `expect(resultado.saldoDisponivel.toNumber()).toBe(6000)`, com `valorProposto = 6000.01` (fronteira de 1 centavo) | ✅ **PASS** (era ❌ GAP) — **ambos** os conjuntos asseridos; a mutação MC prova que o segundo é load-bearing |
| *(relabel)* edição que iguala o total ao já alocado | — | `e2e/verbas-id.spec.ts:96` — título agora `"AD-016: ... (mesma regra de igualdade de CA-OV-12/14, aplicada à edição)"` | ✅ **Corrigido** — o teste deixou de reivindicar CA-OV-12, que ele não exercita. O título descreve exatamente o que o corpo faz |

**Status**: ✅ **15/15 ACs cobertos e casando com o outcome da spec**; 0 gaps; 2 observações de precisão residuais (não-bloqueantes).

---

## Payload / Conjunction Check

Regra aplicada: campos de payload precisam ser asseridos por **valor**, não por presença nem por booleano adjacente.

| Campo | Verificação |
| --- | --- |
| `validarAlocacao().valido` | ✅ Valor booleano asserido nos dois sentidos: `true` em `:90`, `false` em `:97` — não só "chamou sem lançar" |
| `validarAlocacao().saldoDisponivel` | ✅ **Valor numérico** asserido em **ambos** os casos — `:91` e `:98`, ambos `toBe(6000)`. Nunca `toBeDefined()`. Este é o ponto que a instrução pedia para julgar: os testes **não** se contentam com o booleano. A mutação **MC** (corromper só o `saldoDisponivel`, mantendo `valido` correto) **mata os dois testes** — prova empírica de que a metade "o saldo disponível é informado no retorno" de CA-OV-13 está genuinamente coberta, e não apenas satisfeita de fato pela assinatura de tipo |
| `corpo.erro` (CA-OV-09) | ✅ Igualdade exata de string: `e2e/verbas.spec.ts:103` (era ausente) |
| `corpo.erro` (CA-OV-02, ramo nome) | ✅ Igualdade exata de string: `e2e/ofertantes.spec.ts:273` (era ausente) |
| `corpo.erro` (CA-OV-02, ramo UF) | ⚠️ Só status — mas por limitação do produtor, não do teste. Ver Observação 1 |
| `totalAlocado` no corpo do 409 | ⚠️ Segue não lido por nenhum teste (Observação 4 da iteração 1, inalterada — não é AC) |

---

## Discrimination Sensor

**Depth**: P0-full — caminho de integridade financeira. **6 mutações**: 3 mirando especificamente o código novo (`validarAlocacao`) + 3 regressões da iteração 1 re-executadas para confirmar que o fix não afrouxou nada.

**Scratch**: `git worktree add --detach` em `Projetos/spma-sensor-wt2` (irmão do repo, fora dele) — **nunca** `git stash`. `node_modules` e `src/generated` ligados por junction ao repo real; `.env`/`.env.test` copiados. As mutações desta iteração são todas de camada domínio/unit, então **o dev server não foi necessário** — o problema de `turbopack.root` que a iteração 1 teve que resolver não se aplicou. Baseline no scratch antes de qualquer mutação: **27/27 integration verdes**.

| # | File:line | Mutação | Testes rodados | Killed? |
| - | --------- | ------- | -------------- | ------- |
| **MA** | `src/lib/verba/saldo.ts:72` | `lessThanOrEqualTo` → `lessThan` (quebra a fronteira de igualdade permitida, AD-016) | `test:integration` | ✅ **Killed** — 1 failed / 26 passed. `CA-OV-12 ... AssertionError: expected false to be true` |
| **MB** | `src/lib/verba/saldo.ts:72` | `valido: <comparação>` → `valido: true` (nunca rejeita nada) | `test:integration` | ✅ **Killed** — 1 failed / 26 passed. `CA-OV-13 ... AssertionError: expected true to be false` |
| **MC** | `src/lib/verba/saldo.ts:73` | `saldoDisponivel,` → `saldoDisponivel: new Prisma.Decimal(0)` — corrompe **só o payload**, deixando `valido` correto | `test:integration` | ✅ **Killed** — **2 failed** / 25 passed. CA-OV-12 **e** CA-OV-13, ambos `expected +0 to be 6000`. É esta mutação que prova a regra payload/conjunção |
| **M3** *(regressão it.1)* | `src/lib/verba/saldo.ts:53` | `greaterThanOrEqualTo` → `greaterThan` | `test:integration` | ✅ **Killed** — 1 failed / 26 passed. `expected false to be true` |
| **M6** *(regressão it.1)* | `src/lib/verba/saldo.ts:38` | `vlVerba.minus(totalAlocado)` → `vlVerba` (saldo ignora o já alocado) | `test:integration` | ✅ **Killed** — **3 failed** / 24 passed (era 1 na iteração 1): CA-OV-11, CA-OV-12 e CA-OV-13. **A rede ficou mais larga**, não mais frouxa — os testes novos amarram a aritmética do saldo em mais um ponto |
| **M1** *(regressão it.1)* | `src/lib/auth/guards.ts:94-96` | Ramo `VT`/`VO`/`AL` de `podeEditarOfertante` → `return true` | `test:unit` | ✅ **Killed** — 3 failed / 137 passed, todos `expected true to be false` |

**Result**: **6/6 killed** — ✅ PASS

**Isolation verified**: cada mutação revertida com `git checkout --` no scratch e re-confirmada antes da seguinte. Teardown: as duas junctions removidas primeiro via `[System.IO.Directory]::Delete(path, false)` (remove o reparse point **sem** seguir para o alvo), varredura posterior por reparse points remanescentes → vazia; depois `git worktree remove --force` + `git worktree prune`. Pós-teardown, verificado na árvore real: `git worktree list` mostra só a principal; o path do scratch não existe mais; `node_modules/vitest` e `src/generated/prisma` **intactos** (`Test-Path` → `True` nos dois); **`git status --porcelain` vazio, idêntico ao baseline pré-sensor**; HEAD inalterado em `cf1b071`.

---

## Gate Check

- **Full gate** (`npm run test:unit && npm run test:integration && npm run test:e2e`)
  - Unit: **140 passed**, 0 failed (14 files)
  - Integration: **27 passed**, 0 failed (6 files)
  - e2e: **81 passed**, 0 failed (6.3 min)
  - **Total: 248 passed, 0 failed, 0 skipped** — casa exatamente com o baseline esperado (245 → 248)
- **Build gate** (ordem exata `npm run lint && npm run build && npm run typecheck`):
  - `lint` → **exit 0** (3 warnings, 0 errors — os `_request` não usados pré-existentes em `src/lib/errors/api-error.test.ts:18,38,53`, herdados de `seguranca-transversal`; contagem idêntica à iteração 1, o fix não adicionou nenhum)
  - `build` → **exit 0**
  - `typecheck` → **exit 0**
- **Environment**: `docker compose ps` → `spma-mysql` Up 24 hours (**healthy**) confirmado antes da rodada; porta 3000 confirmada livre antes da perna e2e
- **Test Integrity**: 245 → **248** (**+3**: +2 integration, +1 e2e). Decomposição do e2e: +1 relabel (neutro), +1 teste novo de UF faltante = líquido +1, consistente com 80 → 81. **Nenhum teste deletado, pulado ou enfraquecido.** As duas asserções alteradas (`verbas.spec.ts:102`, `ofertantes.spec.ts:272`) foram **fortalecidas**, não relaxadas — ambas ganharam uma asserção de mensagem exata; o único teste cujo *payload de entrada* mudou (`{uf:"MG"}` → `{nome:"", uf:"MG"}`) teve o ramo original preservado pelo teste irmão novo, então nenhuma cobertura foi trocada por outra

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — o fix são 11 linhas de função reusando `calcularSaldoVerba`; nenhuma query nova, nenhuma migration, nenhuma abstração |
| Surgical changes | ✅ — um único arquivo de produção tocado, puramente aditivo (nenhuma linha existente de `saldo.ts` alterada) |
| No scope creep | ✅ — nenhuma rota criada para consumir a função; o deferral a `formulario-pre-curso` foi respeitado em vez de antecipado |
| Matches patterns | ✅ — mesma assinatura `async (cdVerba, valor)` das irmãs, mesmo uso de `Prisma.Decimal` para dinheiro (nunca `number` na comparação), mesmo estilo de docblock ancorado em REQ/CA |
| Spec-anchored outcome check | ✅ — 15/15 |
| Per-layer Coverage Expectation | ✅ — a lacuna de domínio da iteração 1 está fechada; rotas seguem com happy + edge + erro |
| Every test maps to a spec requirement | ✅ — e **melhorou**: o relabel de `verbas-id.spec.ts:96` eliminou o único caso de teste reivindicando um AC que não exercitava |
| Documented guidelines followed | ✅ — `AGENTS.md` respeitado; nenhuma API do Next tocada nesta iteração |

---

## Edge Cases

- [x] Todos os itens da iteração 1 seguem válidos (código inalterado)
- [x] **Alocação exatamente igual ao saldo aceita** (AD-016) — `saldo.integration.test.ts:87-92`; mutação MA confirma discriminação
- [x] **Alocação 1 centavo acima do saldo rejeitada** — `saldo.integration.test.ts:94-99` (6000.01 sobre saldo 6000); mutação MB confirma discriminação
- [x] **Saldo informado mesmo na rejeição** — `:98`; mutação MC confirma discriminação
- [x] **Ofertante sem UF** agora tem teste de rota próprio — `e2e/ofertantes.spec.ts:278-290`
- [x] Cálculo sobre `Prisma.Decimal`, não `number` — a fronteira de 1 centavo (`6000.01`) passa sem erro de ponto flutuante

---

## Ranked Gaps

**Nenhum.** O gap bloqueante da iteração 1 está fechado com implementação, testes por valor e três mutações mortas mirando exatamente esse código.

---

## Observations (registradas, não contadas como gaps)

**Observação 1 — CA-OV-02: a mensagem só nomeia o campo no ramo "presente-porém-vazio".** O fix trocou o payload do teste de `{uf:"MG"}` (chave `nome` ausente) para `{nome:"", uf:"MG"}` e passou a asserir `"Nome é obrigatório"`. Verifiquei empiricamente por que: com Zod 4.4.3, uma chave **ausente** produz `issues[0].message === "Invalid input: expected string, received undefined"` — a mensagem custom `.min(1)` não dispara, e o nome do campo vive em `issues[0].path`, que a rota **descarta** (`src/app/api/ofertantes/route.ts:57` só propaga `issues[0]?.message`). Portanto, para um campo genuinamente ausente, o 400 **não indica qual campo faltou** — e é por isso, corretamente, que o teste irmão de UF (`:287`) assere só o status: não existe mensagem nomeando o campo para asserir ali. O critério pede "indicando o campo faltante". Isso está agora provado para um ramo e não para o outro. Não é bloqueante: era Observação 2 (não-bloqueante) na iteração 1, o fix a melhorou estritamente (de zero asserções de mensagem para uma, mais um ramo de teste novo), e nenhum comportamento regrediu. Fechamento de uma linha, se desejado: incluir o `path` na resposta (`issues[0].path.join(".")`) e asserir nos dois ramos. **Registro como observação porque o relato do fix descreve a Observação 2 como "endereçada", e ela está endereçada pela metade** — o que é uma melhoria real, não uma falha.

**Observação 2 — CA-OV-12: o conjunto "saldo resultante é zero" segue implícito, e isso agora é correto.** O critério diz "é aceita **e** o saldo resultante é zero". O teste assere a aceitação (`valido === true`) e o saldo pré-alocação (`6000`), com `valorProposto === 6000` — o resultado zero é aritmeticamente determinado por esses dois valores, mas não é asserido como estado pós-alocação. Diferente da iteração 1, avalio isso como **não-gap**: `validarAlocacao` é um **validador puro**, não muta nada, logo não existe "saldo resultante" observável nesta camada. Observá-lo exigiria efetivar a alocação — exatamente o ato que a Assunção de `spec.md` defere a `formulario-pre-curso`. Além disso, a aritmética que produziria esse zero (`vlVerba.minus(totalAlocado)`) está pinada numericamente por CA-OV-10/CA-OV-11 e a mutação **M6 mata 3 testes**, incluindo os dois novos — ou seja, não há buraco de discriminação. O plano de fix da iteração 1 previa um terceiro caso ("alocação abaixo do saldo aceita") que não foi entregue; ele seria redundante com MA/MB, que já cobrem os dois lados da fronteira. Registro a divergência para rastreabilidade, sem consequência.

**Observação 3 — Observações 4 e 5 da iteração 1 seguem inalteradas.** `totalAlocado` no corpo do 409 continua não lido por nenhum teste (não é AC), e o `SPEC_DEVIATION` de REQ-OV-04 ("cria **ou atualiza**", sem rota de edição de `Usuario` existindo) segue documentado em `src/app/api/usuarios/route.ts:6-11`. Nenhum dos dois foi tocado por este fix e nenhum é bloqueante.

**Observação 4 — a N+1 na listagem de verbas segue registrada.** `src/app/api/verbas/route.ts:92-97` computa saldo por item dentro de um `Promise.all`. Inalterado, aceitável no volume atual, candidato a agregação única no futuro. Não é finding.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| REQ-OV-01 … REQ-OV-11 | ✅ Verified (it. 1) | ✅ Verified — código inalterado desde `6bad62a`, confirmado por diff |
| **REQ-OV-12** | ❌ **Needs Fix** (it. 1) | ✅ **Verified** — `validarAlocacao` em `src/lib/verba/saldo.ts:65-75`; CA-OV-12 em `saldo.integration.test.ts:87-92`, CA-OV-13 em `:94-99`; mutações MA/MB/MC mortas |

**Todos os 12 requisitos: ✅ Verified.**

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored check**: 15/15 ACs casam com o outcome da spec; 0 gaps; 2 observações de precisão residuais, ambas não-bloqueantes
**Sensor**: 6/6 mutações mortas (tier P0-full) — 3 novas sobre `validarAlocacao`, 3 regressões da iteração 1 re-confirmadas
**Gate**: 248 passed, 0 failed, 0 skipped; build gate limpo (`lint` → `build` → `typecheck`, todos exit 0)

**What works**: O gap bloqueante está genuinamente fechado, não contornado. `validarAlocacao` compara o valor proposto contra o saldo **atual** (não contra o já alocado, que era a função inversa já existente), permite igualdade por AD-016, e devolve o `saldoDisponivel` em ambos os caminhos. Os dois testes novos asserem o `saldoDisponivel` **por valor numérico** nos dois casos — e a mutação MC, que corrompe só esse campo deixando `valido` correto, mata os dois, o que é a prova empírica de que a metade "o saldo disponível é informado no retorno" de CA-OV-13 está coberta de verdade e não só satisfeita pela assinatura de tipo. As três correções de precisão da iteração 1 aterrissaram e foram lidas uma a uma: CA-OV-09 e CA-OV-02 agora asserem a mensagem exata, e o teste de edição em `verbas-id.spec.ts:96` foi relabelado para AD-016, encerrando a reivindicação dupla de um AC que ele não exercitava. As regressões M1/M3/M6 seguem mortas, e M6 agora mata **3** testes em vez de 1 — a rede de discriminação ficou mais larga. Nenhum arquivo de produção fora de `saldo.ts` mudou desde a iteração 1, provado por diff, então as 7 outras tasks não podem ter regredido.

**Issues found**: Nenhum bloqueante. Duas precisões residuais registradas: CA-OV-02 prova "indica o campo faltante" apenas no ramo de campo vazio (para chave ausente, a rota descarta o `path` do Zod e a mensagem fica genérica), e o conjunto "saldo resultante zero" de CA-OV-12 permanece implícito — corretamente, já que o validador não muta estado e o ato de alocar é escopo deferido.

**Next steps**: Feature pronta. Iteração 2 de 3 encerra o loop com PASS — não é necessária uma terceira. A próxima feature a consumir `validarAlocacao` é `formulario-pre-curso`, onde CA-OV-12/CA-OV-13 devem voltar a ser exercitados de ponta a ponta pela rota de criação de curso.
