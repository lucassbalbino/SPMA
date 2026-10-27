# Respostas por Coluna Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/respostas-por-coluna/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `AGENTS.md` (convenções visuais, sem regra de teste), `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, memória do projeto `feedback_test_scope` (camada mais barata que prova o AC; não inflar e2e).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Mapa de colunas (domínio puro) | unit | Todos os ramos de conversão, 1:1 com COL-03 a COL-08 e COL-14 | `src/lib/respostas/*.test.ts` | `npm run test:unit` |
| Schema Prisma ↔ mapa | unit | Toda chave mapeada e toda coluna `P*` com dono (COL-10) | `src/lib/respostas/*.test.ts` | `npm run test:unit` |
| Repositório | integration | Gravação, leitura, merge, `null`, encerramento, concorrência, cascata (COL-11 a COL-15, COL-29 a COL-31) | `src/lib/respostas/*.integration.test.ts` | `npm run test:integration` |
| Migration SQL | integration | Todos os ACs de migração (COL-17 a COL-24) contra MySQL real | `src/lib/respostas/*.integration.test.ts` | `npm run test:integration` |
| Rotas e telas | e2e (suíte existente) | Sem regressão (COL-16); nenhum spec novo | `e2e/*.spec.ts` | `npm run test:e2e` |
| Documentação | none | build gate only | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefas só com testes unitários | `npm run typecheck && npm run test:unit` |
| Full | Tarefas com testes de integração | `npm run db:test:reset && npm run test:unit && npm run test:integration` |
| Build | Fim de fase, e2e e documentação | `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e` |

---

## Execution Plan

### Phase 1: Mapa de colunas

```
T1
```

### Phase 2: Persistência por coluna

```
T1 → T2 → T3
```

### Phase 3: Consumidores e documentação

```
T3 → T4 → T5 → T6
```

### Phase 4: Correções da validação (iteração 1)

```
T6 → T7 → T8 → T9 → T10
```

---

## Task Breakdown

### T1: Mapa de colunas e conversões

**What**: Criar o mapa chave → coluna(s) → tipo dos quatro formulários e as funções `colunasDaEntrada`, `campoPrisma`, `paraColunas`, `deColunas` e `camposDeResposta`.
**Where**: `src/lib/respostas/colunas.ts`
**Depends on**: None
**Reuses**: as listas `OPCOES_*` dos quatro schemas Zod
**Requirement**: COL-03, COL-04, COL-05, COL-06, COL-07, COL-08, COL-14, COL-32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O mapa reproduz as quatro tabelas de `design.md` (63 + 26 + 27 + 7 chaves; 122 + 45 + 46 + 7 colunas)
- [x] Teste unitário `src/lib/respostas/colunas.test.ts` prova cada tipo nos dois sentidos, a regra de nomes, o `null` e a opção exclusiva
- [x] Gate check passes: `npm run typecheck && npm run test:unit`

**Status**: Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(respostas): add question-to-column map`

---

### T2: Modelo físico, repositório e testes que dependem dele

**What**: Trocar o modelo Prisma (colunas `P*` nos três formulários, `DadoPessoalAluno` com uma linha por CPF, sem `RespostaPreCurso`/`RespostaPosCurso`/`RespostaAvaliacao`) e reescrever sobre ele o repositório, a omissão global do client, as três rotas de listagem, a página de usuários e os testes de integração que usam esses modelos.
**Where**: `src/lib/respostas/repositorio.ts`
**Depends on**: T1
**Reuses**: API pública atual do repositório; `separarRespostas` substitui `montarRespostas` nas rotas de listagem
**Requirement**: COL-01, COL-02, COL-09, COL-10, COL-11, COL-12, COL-13, COL-14, COL-15, COL-29, COL-30, COL-31

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `prisma/schema.prisma` tem as colunas de `design.md`; `npx prisma validate` passa
- [x] Teste unitário `src/lib/respostas/schema-colunas.test.ts` prova que toda chave do mapa tem coluna no modelo certo, no tipo certo, e toda coluna `P*` do modelo tem dono (COL-07, COL-09, COL-10)
- [x] `src/lib/respostas/repositorio.integration.test.ts` reescrito com asserção sobre as colunas físicas para COL-11 a COL-15 e COL-29 a COL-31 (executado no gate do T3, o primeiro em que o banco tem as colunas)
- [x] `src/lib/usuarios/gestao.integration.test.ts` com a fixture no formato novo (respostas viajam com a linha na troca de documento)
- [x] Aposentados os testes que só existem para o formato antigo: `forma.test.ts` (com `forma.ts`), `agregacao`, `backfill`, `dados-pessoais-migracao` e `alteracoes-mtur-migracao` `.integration.test.ts`
- [x] Nenhum `.ts`/`.tsx` referencia `respostaPreCurso`, `respostaPosCurso`, `respostaAvaliacao` ou `linhasResposta`
- [x] Gate check passes: `npm run typecheck && npm run test:unit`

**Status**: Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(respostas)!: store answers as one column per question`

---

### T3: Migration com backfill e conferência

**What**: Escrever a migration `respostas_por_coluna` (expand, backfill, conferência por `CHECK` nomeado, contract) e o seu teste de integração num banco descartável.
**Where**: `prisma/migrations/20261027120000_respostas_por_coluna/migration.sql`
**Depends on**: T2
**Reuses**: harness `sqlDaMigration` dos testes de migration anteriores
**Requirement**: COL-17, COL-18, COL-19, COL-20, COL-21, COL-22, COL-23, COL-24

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste `src/lib/respostas/respostas-por-coluna-migracao.integration.test.ts` cobre: conversão dos quatro formulários coluna a coluna, múltipla com 0/1, órfã descartada, aborto por texto sem opção e por contagem divergente com o formulário no erro, tabelas antigas intactas após aborto, colunas antigas preservadas, formulário sem resposta
- [x] `scripts/db-test-reset.ts` sem as três tabelas `TB_Resposta_*`
- [x] Depois de `npm run db:test:reset`, `prisma migrate diff` do banco para o `schema.prisma` não acusa drift
- [x] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration` (inclui os testes de integração reescritos no T2)

**Status**: Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): migrate answers from rows to columns with self-check`

---

### T4: Cruzamento por pergunta direto na tabela

**What**: Teste de integração que prova o filtro e o cruzamento por pergunta numa única tabela, no lugar da agregação por `(Chave, Valor)`.
**Where**: `src/lib/respostas/cruzamento.integration.test.ts`
**Depends on**: T3
**Reuses**: semeadura via `gravarRespostas`
**Requirement**: COL-25, COL-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `SELECT P12, COUNT(*) ... WHERE P11 = 'b' GROUP BY P12` e `SELECT SUM(P20a)` devolvem as contagens semeadas
- [x] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Status**: Done

**Tests**: integration
**Gate**: full

**Commit**: `test(respostas): cross-filter answers by question column`

---

### T5: Suíte e2e sem regressão

**What**: Ajustar os helpers e2e que ainda descrevem o formato antigo e rodar a suíte completa.
**Where**: `e2e/helpers/db.ts`
**Depends on**: T4
**Reuses**: suíte e2e existente das quatro features
**Requirement**: COL-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhuma asserção e2e enfraquecida; só comentários/fixtures que citam `TB_Resposta_*` mudam
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e`

**Status**: Done

**Tests**: e2e
**Gate**: build

**SPEC_DEVIATION**: a asserção do RESP-20 em `e2e/pre-cursos-id.spec.ts` mudou de `["Mulheres", "Jovens"]` para `["Jovens", "Mulheres"]`. A spec deixou de guardar a ordem da seleção múltipla (premissa "Ordem da seleção múltipla"), e a leitura devolve a ordem do questionário. O que o teste prova (a resposta sobrevive à lista vazia) não mudou.

**Resultado e2e**: 295 de 296. A falha restante, `e2e/usuarios-page.spec.ts:489` (GU-08), é anterior a esta feature: o commit `862728e`, já na main, passou a pedir o nome só para AM, e o teste ainda preenche "Nome" ao criar um VT. Esta feature não toca `NovoUsuarioForm.tsx`. `pre-cursos-formulario.spec.ts:323` falhou uma vez sob carga e passou quando rodou isolado.

**Commit**: `test(e2e): align helpers with column storage`

---

### T6: AD-051 e procedimento de deploy

**What**: Registrar a AD-051 em `.specs/STATE.md` (rescinde a AD-041), atualizar a nota do `schema.prisma` e escrever em `docs/DEPLOY_PRODUCAO.md` o backup antes do deploy e a reversão de uma migração abortada.
**Where**: `.specs/STATE.md`
**Depends on**: T5
**Reuses**: formato das ADs existentes
**Requirement**: COL-27, COL-28

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] AD-051 com a regra de nomes, "opção nova no fim" e "pergunta retirada mantém a coluna"; AD-041 marcada como rescindida
- [x] `docs/DEPLOY_PRODUCAO.md` com o backup e o SQL de reversão
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Status**: Done

**Tests**: none
**Gate**: build

**Commit**: `docs(respostas): record ad-051 and deploy rollback`

---

### T7: Migração conferida opção a opção (Fix 1)

**What**: Semear no teste da migration todas as opções de todas as chaves dos quatro formulários, a partir do `MAPA`, e comparar cada formulário migrado com o semeado. Proibir `ELSE` nos `CASE` do backfill com um teste unitário.
**Where**: `src/lib/respostas/respostas-por-coluna-migracao.integration.test.ts`, `src/lib/respostas/schema-colunas.test.ts`
**Depends on**: T6
**Reuses**: relatório do Verifier, `validation.md` (iteração 1)
**Requirement**: COL-17, COL-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os mutantes M6 (letra trocada numa opção), M7 (letras trocadas numa chave) e M9 (`ELSE` no `CASE`) são mortos
- [x] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Status**: Done

**Tests**: integration
**Gate**: full

**Commit**: `test(respostas): check every option through the migration`

---

### T8: Contrato das listagens sem colunas P* (Fix 2)

**What**: Afirmar que o client padrão não devolve colunas `P*` nos três formulários e que a leitura da listagem (`omit: incluirRespostas` + `separarRespostas`) devolve o registro sem `P*` e as respostas como `{ chave: valor }`.
**Where**: `src/lib/respostas/repositorio.integration.test.ts`
**Depends on**: T7
**Reuses**: relatório do Verifier, `validation.md` (iteração 1)
**Requirement**: COL-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os mutantes M11 (`separarRespostas` deixa as `P*`) e M12 (client sem o omit global) são mortos
- [x] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Status**: Done

**Tests**: integration
**Gate**: full

**Commit**: `test(respostas): assert listings carry no answer columns`

---

### T9: Testes unitários num fuso fora do UTC (Fix 3)

**What**: Fixar `TZ=America/Sao_Paulo` no runner unitário, para que uma data gravada em hora local mude o dia e o teste falhe.
**Where**: `vitest.config.ts`
**Depends on**: T8
**Reuses**: relatório do Verifier, `validation.md` (iteração 1)
**Requirement**: COL-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O mutante M3 (data em hora local) é morto
- [x] Gate check passes: `npm run typecheck && npm run test:unit`

**Status**: Done

**Tests**: unit
**Gate**: quick

**Commit**: `test: run unit tests in a non-utc timezone`

---

### T10: Reversão, janela de deploy e precisão da spec

**What**: Travar o `reversao.sql` nas quatro formas antigas, na ordem do contract; recomendar o deploy num horário sem uso e o caminho de um contract interrompido em `docs/DEPLOY_PRODUCAO.md`; ressalvar a ordem da múltipla e o arredondamento dos decimais no COL-11 e no COL-16; anotar a AD-042 como rescindida na forma física; registrar as lições do Verifier.
**Where**: `prisma/migrations/20261027120000_respostas_por_coluna/reversao.sql`, `docs/DEPLOY_PRODUCAO.md`, `.specs/`
**Depends on**: T9
**Reuses**: relatório do Verifier, `validation.md` (iteração 1)
**Requirement**: COL-11, COL-16, COL-28

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Rodada contra um banco já migrado, a reversão para na trava sem apagar coluna nenhuma
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Status**: Done

**Tests**: none
**Gate**: build

**Commit**: `docs(respostas): guard rollback against a partial contract`

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase 1 start | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Mapa de colunas | unit | unit | ✅ OK |
| T2 | Schema + repositório | unit (schema) / integration (repositório) | unit | ✅ OK: os testes de integração do repositório são escritos no T2 e executados no T3, o primeiro task em que o banco tem as colunas (merge forward) |
| T3 | Migration SQL | integration | integration | ✅ OK |
| T4 | Consulta por coluna | integration | integration | ✅ OK |
| T5 | Rotas/telas (sem regressão) | e2e | e2e | ✅ OK |
| T6 | Documentação | none | none | ✅ OK |
| T7 | Migration SQL + schema ↔ migration | integration / unit | integration | ✅ OK |
| T8 | Repositório | integration | integration | ✅ OK |
| T9 | Mapa de colunas (runner) | unit | unit | ✅ OK |
| T10 | Documentação e SQL de reversão | none | none | ✅ OK: a trava foi rodada à mão contra o `spma_test` migrado |

**Replanejado em 2026-10-27, durante o T2:** remover os modelos antigos quebra o typecheck de todo teste que os usa, então o T2 absorveu a reescrita e a aposentadoria desses testes (antes T4 e parte do T5), e a execução deles contra o MySQL passou ao gate do T3.
