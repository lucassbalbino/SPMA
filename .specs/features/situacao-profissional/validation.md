# Situação Profissional Validation

**Date**: 2026-11-11
**Spec**: `.specs/features/situacao-profissional/spec.md`
**Diff range**: `7001920..8741817` (branch `feat/situacao-profissional`, 3 commits: `dc0b122` domínio e banco, `3effdd8` tela, `8741817` docs)
**Verifier**: independent sub-agent (author ≠ verifier)
**Iteração**: 1 de 3

**Verdict**: PASS ✅

Os 16 ACs batem com o resultado que a spec define. Os gates passaram com os mesmos números que o autor informou, medidos de novo por mim. Injetei 19 mutações num worktree isolado (11 unit, 5 de migration contra o MySQL, 3 de tela em e2e) e todas morreram. Não achei nenhum defeito no código de produção. Ficam três resíduos menores, todos de evidência indireta, listados em Notas.

---

## Task Completion

A feature não tem `tasks.md`: a spec mapeia os 16 requisitos direto para a fase Execute. Conferi os commits contra a spec:

| Commit | Conteúdo | Status |
| --- | --- | --- |
| `dc0b122` | Schema Zod (`avaliacao.schema.ts:31-66`, `:167-171`, `:236-240`), completude (`completude.ts:35-38`), regra condicional da Q12 (`condicionais.ts:24-28`), mapa (`colunas.ts:158-161`), Prisma (`schema.prisma:431-434`), migration, `views-bi.sql:201-204`, testes unit e de integração | ✅ Done |
| `3effdd8` | Bloco "Situação Profissional" e título em `AvaliacaoForm.tsx:99-129`, `:457`; e2e ajustados e SPR-01/SPR-08 novos | ✅ Done |
| `8741817` | AD-053 (`.specs/STATE.md:404-414`), questionário-fonte, guia de deploy | ✅ Done |

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SPR-01 | Primeiro bloco da Parte 1 é "Situação Profissional", com os rótulos "10." a "13." exatos, antes de "Experiência" | `e2e/avaliacoes-formulario.spec.ts:261` - `getByTestId("bloco-parte1-1")).toHaveText("Situação Profissional")`; `:262` - `bloco-parte1-2` `toHaveText("Experiência")`; `:265-271` - os rótulos 10, 11 e 13 com `{ exact: true }` `toBeVisible()`; `:276` - rótulo 12 exato | ✅ PASS |
| SPR-02 | P10 com 9 opções, P11 Sim/Não, P12 com 10, P13 com 7, na ordem do papel | `src/lib/validation/schemas/avaliacao.schema.test.ts:325` - `shape[chave].unwrap().options).toEqual(opcoes)`, com as listas escritas à mão em `:281-323`. Conferi essas listas contra `git show 33ab9a6^:docs/Questionario_do_Aluno_1.md` (linhas 58-96): batem, inclusive "Estagiário(a)." com ponto e o travessão em "Pessoa Jurídica – PJ" | ✅ PASS |
| SPR-03 | Valor fora das opções: 400, nada gravado | `avaliacao.schema.test.ts:338` - `safeParse({ [chave]: "Talvez" }).success).toBe(false)` para as 4 chaves; `src/lib/api/requisicao.test.ts:52-54` - issue do Zod vira `status: 400`; a rota valida em `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts:107`, antes da leitura e da transação (`:131`) | ✅ PASS (por composição, ver Nota 1) |
| SPR-04 | P12 escondida enquanto P11 ≠ "Sim" | `e2e/avaliacoes-formulario.spec.ts:274` - rótulo 12 `toHaveCount(0)` sem resposta; `:276` - `toBeVisible()` com "Sim"; `:278` - `toHaveCount(0)` de novo com "Não" | ✅ PASS |
| SPR-05 | P10, P11 ou P13 em branco: Parte 1 incompleta, a chave nas pendências | `src/lib/avaliacao/completude.test.ts:91` - `toEqual({ completo: false, pendentes: [chave] })` no `it.each` de `:76-92`, que inclui as 3 chaves | ✅ PASS |
| SPR-06 | P11 = "Sim" e P12 em branco: incompleta, `avalProfissAtividadeEspecifica` pendente | `completude.test.ts:98-101` - `toEqual({ completo: false, pendentes: ["avalProfissAtividadeEspecifica"] })`; `src/lib/avaliacao/condicionais.test.ts:126` - `pendenciasCondicionaisParte1({ avalProfissAtuaTurismo: "Sim" })).toEqual(["avalProfissAtividadeEspecifica"])` | ✅ PASS |
| SPR-07 | P11 = "Não" e P12 em branco: P12 não cobrada | `completude.test.ts:108-111` - `toEqual({ completo: true, pendentes: [] })` | ✅ PASS |
| SPR-08 | Parte 1 incompleta por falta de P10-P13 e PATCH com chave da Parte 2: 400 com a mensagem exata, nada gravado | `e2e/avaliacoes-id.spec.ts:300` - `status()).toBe(400)`; `:301` - `erro).toBe("Complete a Parte 1 antes de responder a avaliação do curso")`; `:303` - `respostas).toEqual(antes?.respostas)`; `:304` - a resposta antiga da Parte 2 continua `5`. O fixture (`:150-165`) tem as 8 chaves de Q14-Q21 e nenhuma de P10-P13, e a rota recalcula a completude sobre o estado mesclado (`route.ts:114-116`), então o 400 vem mesmo da falta de P10-P13 | ✅ PASS |
| SPR-09 | Encerramento com P11 = "Não" e P12 preenchida: P12 descartada | `condicionais.test.ts:44-47` - `normalizarCondicionaisAvaliacao(respostas)).toEqual({ avalProfissAtuaTurismo: "Não", avalProfissFaixaRenda: "Sem renda" })`; `:56` - com "Sim" a P12 fica. A rota de encerramento passa essa função como `normalizar` (`encerrar/route.ts:56`), e `encerramento.ts:65` a aplica | ✅ PASS (por composição, ver Nota 2) |
| SPR-10 | Título "Parte 1 — Situação Profissional e Motivação" | `e2e/avaliacoes-formulario.spec.ts:258-260` - `getByText("Parte 1 — Situação Profissional e Motivação", { exact: true })).toBeVisible()` | ✅ PASS |
| SPR-11 | Colunas `P10`-`P13` `CHAR(1)` NULL, com a letra (`a` = primeira) | `src/lib/respostas/colunas.test.ts:176` - `paraColunas("avaliacao", RESPOSTAS)).toEqual({ p10: "i", p11: "b", p12: "a", p13: "g" })`; tipo e nulidade: `prisma/migrations/20261111120000_situacao_profissional/migration.sql:7-10` e conferência minha no `spma_test` (`information_schema.COLUMNS`): `P10`-`P13` = `char(1)`, `IS_NULLABLE = YES`, posições 7-10, entre `Data_Encerramento` (6) e `P14` (11) | ✅ PASS (tipo por verificação local, ver Nota 3) |
| SPR-12 | Leitura devolve P10-P13 com o texto da opção | `colunas.test.ts:180` - `deColunas("avaliacao", CAMPOS)).toEqual(RESPOSTAS)`. Leitura pelo banco: `e2e/avaliacoes-encerrar.spec.ts:149-174` (AVAL-13) grava P10-P13 nas colunas e encerra com 200. O encerramento lê as colunas e exige P10, P11 e P13, então só passa se elas voltarem com o texto | ✅ PASS |
| SPR-13 | `P10`-`P13` na VIEW `bi.TB_Avaliacao_Aluno`, depois de `Data_Encerramento` e antes de `P14` | `src/lib/respostas/views-bi.test.ts:38-45` - `colunas.slice(inicio, inicio + 6)).toEqual(["Data_Encerramento", "P10", "P11", "P12", "P13", "P14"])` | ✅ PASS |
| SPR-14 | Migration: `Parte1_Completa = false` em toda `EM_ANDAMENTO` | `src/lib/avaliacao/situacao-profissional-migracao.integration.test.ts:134-135` - `status).toBe("EM_ANDAMENTO")`, `parte1Completa).toBe(false)`, partindo de `true` (`:107-109`). O teste roda o UPDATE lido do próprio `migration.sql` (`:19-42`) | ✅ PASS |
| SPR-15 | Migration: encerrada mantém status, `Parte1_Completa`, data e respostas | `situacao-profissional-migracao...:141-143` - `"ENCERRADO"`, `parte1Completa).toBe(true)`, `dataEncerramento).toEqual(ENCERRAMENTO)`; `:150` - `toMatchObject(RESPOSTAS)` | ✅ PASS |
| SPR-16 | Migration: respostas já gravadas (P14-P38) mantidas | `situacao-profissional-migracao...:148-151` - `toMatchObject(RESPOSTAS)` nas duas avaliações, com 14 colunas de P14 a P36 (`:47-62`) | ✅ PASS |

**Status**: ✅ 16/16 ACs batem com o resultado que a spec define. Nenhum spec-precision gap: cada AC define o valor esperado, e as asserções miram esse valor.

---

## Discrimination Sensor

**Sensor depth**: expandido. A migration reabre avaliações em produção e a completude é um gate, então fiz 19 mutações, com pelo menos uma por regra nova.

**Scratch**: `git worktree add --detach` em `8741817` dentro do scratchpad, com `.env` e `.env.test` copiados e `prisma generate` (que escreve em `src/generated/prisma` do próprio worktree). Para unit e integração usei junction para o `node_modules`. O Turbopack recusa junction que aponta para fora da raiz, então, para o e2e, tirei só o link (`rmdir`, que não toca o alvo) e rodei `npm ci` dentro do worktree. Cada mutação foi aplicada, testada e revertida por script (`sensor.mjs`, `e2e-mut.ps1`). Rodei um controle sem mutação antes de cada camada e todos passaram: unit 144/144, integração 3/3, e2e SPR-01 1/1.

| # | File:line | Mutação | Teste | Killed? |
| --- | --- | --- | --- | --- |
| M1 | `src/lib/avaliacao/condicionais.ts:27` | `=== "Sim"` → `!== "Sim"` | unit (avaliacao, schema, respostas): 6 falhas, como `Q11='Não' com Q12 respondida -> Q12 descartada` | ✅ Killed |
| M2 | `condicionais.ts:24-28` | Regra da Q12 removida | unit: 3 falhas (SPR-06 em completude, SPR-09 e pendências) | ✅ Killed |
| M3 | `src/lib/avaliacao/completude.ts:38` | `avalProfissFaixaRenda` fora do `parte1SchemaBase` | unit: `sem avalProfissFaixaRenda -> incompleto` | ✅ Killed |
| M3b | `completude.ts:37` | `avalProfissAtuaTurismo` fora do `parte1SchemaBase` | unit: `sem avalProfissAtuaTurismo -> incompleto` | ✅ Killed |
| M4 | `src/lib/validation/schemas/avaliacao.schema.ts:51-52` | "Eventos" e "Guiamento e Condução" trocados de ordem (mudaria a letra gravada) | unit: `avalProfissAtividadeEspecifica aceita exatamente as opções do papel, nessa ordem` | ✅ Killed |
| M5 | `src/lib/respostas/colunas.ts:158-159` | Colunas de P10 e P11 trocadas | unit: 3 falhas (`grava a letra…`, `lê de volta…`, gerador da VIEW) | ✅ Killed |
| M6 | `avaliacao.schema.ts:238` | `avalProfissAtuaTurismo` fora de `CHAVES_PARTE_1` (o PATCH a trataria como Parte 2) | unit: `lista exatamente as 12 chaves de Q10-Q21` | ✅ Killed |
| M7 | `scripts/views-bi.sql:203` | `P12` fora da VIEW da avaliação | unit: 2 falhas (SPR-13 e `o arquivo versionado é o que o gerador produz`) | ✅ Killed |
| M8 | `avaliacao.schema.ts:169` | `z.enum(OPCOES_SIM_NAO)` → `z.string()` | unit: 2 falhas, entre elas `avalProfissAtuaTurismo recusa um valor fora das opções` | ✅ Killed |
| M9 | `avaliacao.schema.ts:40` | "Desempregado" removido da P10 | unit: 20 falhas | ✅ Killed |
| M10 | `prisma/migrations/20261111120000_situacao_profissional/migration.sql:20` | UPDATE sem `WHERE` | integração (`situacao-profissional-migracao`): SPR-15 falha | ✅ Killed |
| M11 | `migration.sql:20` | `WHERE Status = 'ENCERRADO'` | integração: SPR-14 e SPR-15 falham | ✅ Killed |
| M12 | `migration.sql:19` | `SET Parte1_Completa = true` | integração: SPR-14 falha | ✅ Killed |
| M13 | `migration.sql:19` | O UPDATE também zera `P36` | integração: SPR-15/SPR-16 falha (`toMatchObject(RESPOSTAS)`) | ✅ Killed |
| E1 | `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/AvaliacaoForm.tsx:120` | `visivelSe` removido da P12 | e2e `-g "SPR-01"`: `avaliacoes-formulario.spec.ts:274` `toHaveCount(0)` falha | ✅ Killed |
| E2 | `AvaliacaoForm.tsx:457` | Título de volta a "Parte 1 — Experiência e Motivação" | e2e: `:260` `toBeVisible()` falha | ✅ Killed |
| E3 | `AvaliacaoForm.tsx:124` | Rótulo "13. Qual a sua faixa de renda" | e2e: `:271` `toBeVisible()` falha | ✅ Killed |

**Result**: 17 linhas na tabela, 19 rodadas: duas foram repetidas por problema de ambiente, e as duas tentativas estão explicadas abaixo. **17/17 mutantes distintos morreram**, todos no ponto esperado. PASS ✅

Na primeira rodada, o E2 não foi aplicado: o `.ps1` sem BOM estragou o travessão no PowerShell 5.1. Na segunda, com os caracteres montados por código, ele morreu. O E1 também falhou na primeira rodada, mas na asserção do título (`:260`), um timeout da primeira compilação do dev server. Rodei de novo e ele morreu em `:274`, no ponto da SPR-04. Só conto a segunda rodada.

**Isolamento**: `git status --porcelain` do repositório real, antes e depois: `?? .specs/features/revisao-usabilidade-1/`, igual. O worktree foi removido (`git worktree remove --force`, depois `rmdir /s /q` da sobra, sem nenhuma junction dentro), e o `git worktree list` mostra só o repositório real. O `node_modules` real continua com 555 pastas, antes e depois.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code: 4 opções, 4 chaves, 1 regra, 4 entradas de mapa, 4 colunas, 1 bloco de tela, sem abstração nova | ✅ |
| Surgical changes: só os arquivos da cadeia schema → completude → mapa → banco → VIEW → tela, mais os testes e docs | ✅ |
| No scope creep: P28 e P30-P34 continuam fora (`avaliacao.schema.test.ts` mantém as 7 chaves em `CHAVES_REMOVIDAS_MTUR`) | ✅ |
| Matches patterns: mesma forma da Q16 (regra em `condicionais.ts`, `visivelSe: condicaoAvaliacao(...)`), mapa AD-051 com `unica(...)`, teste de migration que lê o UPDATE do arquivo real como em `verba/identificacao-migracao` | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer coverage: domínio 1:1 com os ACs (SPR-02/03/05/06/07/09/11/12/13); migration contra o banco real (SPR-14/15/16); rota com 400 + mensagem + nada gravado (SPR-08); tela em e2e (SPR-01/04/10) | ✅ |
| Every test maps to a spec requirement: os testes novos citam SPR-xx; os ajustes de índice de bloco nos e2e existentes vêm do deslocamento que a SPR-01 causa | ✅ |
| Documented guidelines followed: `AGENTS.md` (sem cor literal no `.tsx`: o bloco novo é só metadado; navegação não mudou) e `.specs/STATE.md` AD-051/AD-053 | ✅ |

---

## Edge Cases

- [x] Aluno com a Parte 2 já respondida abre a avaliação depois da migration: a Parte 2 fica bloqueada e nada se perde. A trava vem da SPR-08 (`e2e/avaliacoes-id.spec.ts:300-305`, com a resposta antiga da Parte 2 preservada em `:304`) e a migração preserva as respostas (SPR-14/16).
- [x] P11 de "Sim" para "Não" numa gravação preserva a P12 até o encerramento. O PATCH não normaliza: `route.ts:123-131` grava o `patch` sem chamar `normalizar`. O comportamento é o mesmo da Q22, testado em `e2e/avaliacoes-id.spec.ts:244`. No encerramento, a P12 cai (SPR-09). Não há teste específico da P12 no PATCH, mas o caminho é o genérico, que não conhece a chave.

---

## Gate Check

Rodei tudo no PowerShell, a partir da raiz do repositório, no HEAD `8741817`.

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0, 0 errors, 51 warnings (`_omitido` não usado em desestruturações de teste, padrão já existente) |
| Unit | `npm run test:unit` | exit 0, **874 passed** (41 arquivos), 0 failed, 0 skipped |
| Integration | `npm run db:test:reset` + `npm run test:integration` | exit 0, **141 passed** (17 arquivos), 0 failed, 0 skipped |
| e2e (avaliações) | `npx playwright test e2e/avaliacoes-formulario.spec.ts e2e/avaliacoes-id.spec.ts e2e/avaliacoes-encerrar.spec.ts e2e/avaliacoes-page.spec.ts --reporter=list` | exit 0, **41 passed** (3.4 min) |

- **Test count before feature** (`7001920`, de `.specs/STATE.md:11`, linha da AD-052): 855 unit / 138 integration.
- **Test count after feature**: 874 unit / 141 integration.
- **Delta**: +19 unit, +3 integration (o arquivo novo `situacao-profissional-migracao`), e 2 e2e novos (SPR-01, SPR-08). Nenhum teste foi apagado. O teste "não tem nenhuma das 11 chaves removidas" virou "7 chaves que seguem removidas": as 4 que saíram da lista são justamente as que a spec traz de volta. As asserções `toContain(chave)` de `completude.test.ts` ficaram mais fortes: agora são `toEqual({ completo: false, pendentes: [chave] })`.
- **Skipped / Failures**: nenhum.
- A suíte e2e completa (296 testes) não foi rodada. O diff de e2e só toca os 3 specs de avaliação, e rodei os 4 specs de avaliação.

---

## Notas e resíduos (não bloqueiam)

1. **SPR-03 por composição.** Nenhum teste manda um PATCH com P10-P13 inválido e confere o 400 na rota. A prova junta três elos, todos citados: o schema recusa, `validado` transforma a recusa em 400 e a rota valida antes de ler ou gravar. As mutações M8 e M9 mostram que o elo do schema discrimina. É o mesmo caminho genérico de todas as outras chaves do formulário.
2. **SPR-09 por composição.** O descarte da P12 é testado na função de domínio. O e2e de encerramento não tem um caso com P11 = "Não" e P12 preenchida. A rota repassa a mesma função, e o e2e `avaliacoes-encerrar.spec.ts:301` prova esse repasse para as chaves de concluinte.
3. **SPR-11, tipo da coluna.** Nenhum teste automatizado confere que `P10`-`P13` são `CHAR(1)`. O valor gravado (letra) e a nulidade (`:151` da integração) são testados. O tipo eu conferi no `information_schema` do `spma_test`, que é o banco montado pelas migrations (`char(1)`, `YES`, posições 7-10). É a mesma forma de evidência aceita no CUR-21 da `tabela-curso`. Um teste no estilo de `repositorio.integration.test.ts:162-172` fecharia isso, se o usuário quiser.
4. **Rótulo da 13 sem dois-pontos.** O papel diz "Qual a sua faixa de renda mensal:" e a tela, "13. Qual a sua faixa de renda mensal", como o SPR-01 pede literalmente. A implementação segue a spec. Fica o registro de que a spec tirou o ":" enquanto a premissa "Texto e opções" diz "sem alteração". Os outros rótulos do formulário também não levam ":", então parece ser o padrão da tela.
5. **Árvore real mudou durante a validação, por outra sessão.** Às 17:13, depois que terminei o sensor e conferi o isolamento, a árvore real passou para a branch `feat/revisao-usabilidade-1` (commit `dc7dfc7` sobre `8741817`, que só mexe em `.specs/features/revisao-usabilidade-1/`). Apareceram também mudanças não commitadas em `AvaliacaoForm.tsx`, `PosCursoForm.tsx`, `PreCursoForm.tsx`, `CascaFormulario.tsx`, `useFormularioRespostas.ts` e `e2e/pos-cursos-formulario.spec.ts`. Não fui eu: o sensor rodou só no worktree do scratchpad, e o `porcelain` batia com o baseline na limpeza. Não toquei nesses arquivos. Todas as citações deste relatório se referem ao commit `8741817`.
6. **Fora do escopo da feature.** O commit `8741817` apaga a lição candidata L-039 de `.specs/LESSONS.md` e `.specs/lessons.json`. O commit diz que foi expiração automática do `lessons.py`, por falta de reincidência.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| SPR-01 a SPR-16 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 16/16 ACs batem com o resultado que a spec define, sem spec-precision gap
**Sensor**: 17/17 mutantes distintos mortos (19 rodadas)
**Gate**: typecheck e lint ok; unit 874, integration 141 e e2e de avaliações 41 passaram; 0 falhas

**What works**: P10-P13 voltam com as opções do papel; completude com P12 condicional; descarte da P12 órfã no encerramento; colunas `CHAR(1)` antes da P14 e na VIEW do `bi`; migration que reabre só as avaliações em andamento sem tocar respostas nem encerradas; bloco e título na tela.

**Issues found**: nenhum defeito. Os resíduos de evidência indireta estão nas Notas 1 a 3.

**Next steps**: deploy conforme `docs/DEPLOY_PRODUCAO.md` (seção AD-053): backup antes e `scripts/views-bi.sql` logo depois.
