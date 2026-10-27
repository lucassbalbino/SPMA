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
T1 → T2 → T3 → T4
```

### Phase 3: Consumidores e documentação

```
T4 → T5 → T6 → T7
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

- [ ] O mapa reproduz as quatro tabelas de `design.md` (63 + 26 + 27 + 7 chaves; 122 + 45 + 46 + 7 colunas)
- [ ] Teste unitário `src/lib/respostas/colunas.test.ts` prova cada tipo nos dois sentidos, a regra de nomes, o `null` e a opção exclusiva
- [ ] Gate check passes: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(respostas): add question-to-column map`

---

### T2: Modelo físico e repositório por coluna

**What**: Trocar o modelo Prisma (colunas `P*` nos três formulários, `DadoPessoalAluno` com uma linha por CPF, sem as tabelas `RespostaPreCurso`/`RespostaPosCurso`/`RespostaAvaliacao`) e reescrever o repositório, a omissão global do client, as três rotas de listagem e a página de usuários sobre ele, removendo `forma.ts`.
**Where**: `src/lib/respostas/repositorio.ts`
**Depends on**: T1
**Reuses**: API pública atual do repositório; `separarRespostas` substitui `montarRespostas` nas rotas de listagem
**Requirement**: COL-01, COL-02, COL-09, COL-10, COL-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `prisma/schema.prisma` tem as colunas de `design.md`; `npx prisma validate` passa
- [ ] Teste unitário `src/lib/respostas/schema-colunas.test.ts` prova que toda chave do mapa tem coluna no modelo certo e toda coluna `P*` do modelo tem dono (COL-10)
- [ ] `src/lib/respostas/forma.ts` e `forma.test.ts` removidos (código morto do formato antigo)
- [ ] Nenhum `.ts`/`.tsx` fora dos testes de integração referencia `respostaPreCurso`, `respostaPosCurso`, `respostaAvaliacao` ou `linhasResposta`
- [ ] Gate check passes: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(respostas)!: store answers as one column per question`

---

### T3: Migration com backfill e conferência

**What**: Escrever a migration `respostas_por_coluna` (expand, backfill, conferência por `CHECK` nomeado, contract) e o seu teste de integração num banco descartável.
**Where**: `prisma/migrations/20261027120000_respostas_por_coluna/migration.sql`
**Depends on**: T2
**Reuses**: harness `sqlDaMigration` de `alteracoes-mtur-migracao.integration.test.ts`
**Requirement**: COL-17, COL-18, COL-19, COL-20, COL-21, COL-22, COL-23, COL-24

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Teste `src/lib/respostas/respostas-por-coluna-migracao.integration.test.ts` cobre: conversão dos quatro formulários coluna a coluna, múltipla com 0/1, órfã descartada, aborto por texto sem opção e por contagem divergente com o formulário no erro, tabelas antigas intactas após aborto, colunas antigas preservadas, formulário sem resposta
- [ ] Depois de `npm run db:test:reset`, `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` não acusa drift
- [ ] Gate check passes: `npm run db:test:reset && npx vitest run -c vitest.integration.config.ts src/lib/respostas/respostas-por-coluna-migracao.integration.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): migrate answers from rows to columns with self-check`

---

### T4: Testes de integração do repositório

**What**: Reescrever `repositorio.integration.test.ts` para o formato por coluna e atualizar a lista de tabelas de `scripts/db-test-reset.ts`.
**Where**: `src/lib/respostas/repositorio.integration.test.ts`
**Depends on**: T3
**Reuses**: cenários do teste atual (merge raso, lista que encolhe, regravação idêntica, concorrência, cascata)
**Requirement**: COL-11, COL-12, COL-13, COL-14, COL-15, COL-29, COL-30, COL-31

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cada AC listado tem asserção sobre o valor das colunas no banco e sobre o objeto lido
- [ ] Gate check passes: `npm run db:test:reset && npm run test:unit && npx vitest run -c vitest.integration.config.ts src/lib/respostas/repositorio.integration.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `test(respostas): cover column repository against mysql`

---

### T5: Cruzamento por pergunta e testes de migrations antigas

**What**: Substituir `agregacao.integration.test.ts` por um teste de filtro e cruzamento sobre as colunas, aposentar os três testes de migrations antigas e ajustar a fixture de `gestao.integration.test.ts`.
**Where**: `src/lib/respostas/cruzamento.integration.test.ts`
**Depends on**: T4
**Reuses**: semeadura via `gravarRespostas`
**Requirement**: COL-25, COL-26, COL-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `SELECT P12, COUNT(*) ... WHERE P11 = 'b' GROUP BY P12` e `SELECT SUM(P20a)` devolvem as contagens semeadas
- [ ] `backfill`, `dados-pessoais-migracao` e `alteracoes-mtur-migracao` `.integration.test.ts` removidos, com o motivo no commit
- [ ] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Tests**: integration
**Gate**: full

**Commit**: `test(respostas): replace row aggregation with column cross-filter`

---

### T6: Suíte e2e sem regressão

**What**: Ajustar os helpers e2e que ainda descrevem o formato antigo e rodar a suíte completa.
**Where**: `e2e/helpers/db.ts`
**Depends on**: T5
**Reuses**: suíte e2e existente das quatro features
**Requirement**: COL-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhuma asserção e2e enfraquecida; só comentários/fixtures que citam `TB_Resposta_*` mudam
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: build

**Commit**: `test(e2e): align helpers with column storage`

---

### T7: AD-051 e procedimento de deploy

**What**: Registrar a AD-051 em `.specs/STATE.md` (rescinde a AD-041), atualizar a nota do `schema.prisma` e escrever em `docs/DEPLOY_PRODUCAO.md` o backup antes do deploy e a reversão de uma migração abortada.
**Where**: `.specs/STATE.md`
**Depends on**: T6
**Reuses**: formato das ADs existentes
**Requirement**: COL-27, COL-28

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] AD-051 com a regra de nomes, "opção nova no fim" e "pergunta retirada mantém a coluna"; AD-041 marcada como rescindida
- [ ] `docs/DEPLOY_PRODUCAO.md` com o backup e o SQL de reversão
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `docs(respostas): record ad-051 and deploy rollback`

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase 1 start | ✅ Match |
| T2 | T1 | T1 (fase anterior) → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 (fase anterior) → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Mapa de colunas | unit | unit | ✅ OK |
| T2 | Schema + repositório | unit (schema) / integration (repositório) | unit | ✅ OK: o repositório só roda contra o banco depois da migration (T3); seus testes de integração entram no primeiro task em que são executáveis (T4, merge forward) |
| T3 | Migration SQL | integration | integration | ✅ OK |
| T4 | Repositório | integration | integration | ✅ OK |
| T5 | Testes de integração | integration | integration | ✅ OK |
| T6 | Rotas/telas (sem regressão) | e2e | e2e | ✅ OK |
| T7 | Documentação | none | none | ✅ OK |
