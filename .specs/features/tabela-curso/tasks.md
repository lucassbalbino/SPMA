# Tabela de Curso Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/tabela-curso/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `AGENTS.md` (convenções visuais, sem regra de teste), `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, memória do projeto `feedback_test_scope` (camada mais barata que prova o AC; não inflar e2e).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Tradução curso ↔ JSON (`comCurso`) | unit | Achatamento e campos por etapa (CUR-11) | `src/lib/cursos/*.test.ts` | `npm run test:unit` |
| Persistência do curso | integration | Criação transacional, FKs, exclusão, saldo, nome (CUR-01 a CUR-10, CUR-12) | `src/lib/cursos/*.integration.test.ts` | `npm run test:integration` |
| Migration SQL | integration | CUR-14 a CUR-18 contra MySQL real | `src/lib/cursos/*.integration.test.ts` | `npm run test:integration` |
| VIEWs do `bi` | unit + verificação local | CUR-19 a CUR-21 | `src/lib/respostas/views-bi.test.ts` | `npm run test:unit` |
| Rotas e telas | e2e (suíte existente) | Sem regressão (CUR-13); nenhum spec novo | `e2e/*.spec.ts` | `npm run test:e2e` |
| Documentação | none | build gate only | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefas só com testes unitários | `npm run typecheck && npm run test:unit` |
| Full | Tarefas com testes de integração | `npm run db:test:reset && npm run test:unit && npm run test:integration` |
| Build | Fim de fase, e2e e documentação | `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e` |

---

## Execution Plan

### Phase 1: Modelo e código

```
T1 → T2
```

### Phase 2: Migração e persistência

```
T2 → T3 → T4
```

### Phase 3: Power BI, regressão e documentação

```
T4 → T5 → T6 → T7
```

---

## Task Breakdown

### T1: Model `Curso` e leitura pelo curso

**What**: Criar o model `Curso` no schema, mover os campos e as relações, e adaptar rotas, páginas, saldo, escopo, fixture e2e, seed de demonstração e reset de teste para ler e gravar o curso em `TB_Curso`. Criar `comCurso` para o JSON de sempre.
**Where**: `prisma/schema.prisma`, `src/lib/cursos/curso.ts`
**Depends on**: None
**Reuses**: relação `AvaliacaoAluno.curso`, `whereDeEscopo`
**Requirement**: CUR-01, CUR-02, CUR-03, CUR-04, CUR-05, CUR-11, CUR-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `comCurso` coberto por teste unitário (achatamento e lista de campos do pós)
- [ ] Nenhum acesso a `preCurso.cdOfertante`, `.cdVerba`, `.vlCursoAlocado`, `.criadoPor`, `.dataCriacao` ou `posCurso.preCurso` fora do model `Curso`
- [ ] Gate check passes: `npm run typecheck && npm run test:unit && npm run build`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cursos)!: give the course its own table`

---

### T2: Nome do curso espelhado da P8

**What**: Gravar `TB_Curso.NM_Curso` na mesma transação sempre que a P8 do pré-curso for gravada ou apagada, e escrever os testes de integração da persistência do curso (criação, FKs, exclusão, saldo, nome).
**Where**: `src/lib/respostas/repositorio.ts`
**Depends on**: T1
**Reuses**: `paraColunas`
**Requirement**: CUR-06, CUR-07, CUR-08, CUR-09, CUR-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Testes de integração escritos; rodam no gate do T3, o primeiro task em que o banco tem `TB_Curso`
- [ ] Gate check passes: `npm run typecheck && npm run test:unit`

**Tests**: integration
**Gate**: quick

**Commit**: `feat(cursos): mirror question 8 into the course name`

---

### T3: Migration com autoconferência

**What**: Escrever a migration (expand, backfill, conferência, contract) e o teste por `prisma migrate deploy` em banco descartável, incluindo um aborto por conferência; escrever o `reversao.sql`.
**Where**: `prisma/migrations/<timestamp>_tabela_curso/`
**Depends on**: T2
**Reuses**: harness de `respostas-por-coluna-migracao.integration.test.ts`
**Requirement**: CUR-14, CUR-15, CUR-16, CUR-17, CUR-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `prisma migrate diff` do banco migrado contra o schema = vazio
- [ ] Os testes do T2 passam contra o banco migrado
- [ ] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): move course data to tb_curso with self-check`

---

### T4: Saldo e criação contra o banco

**What**: Conferir em integração o saldo da verba somando `TB_Curso` e a criação transacional pela rota de criação de curso.
**Where**: `src/lib/cursos/curso.integration.test.ts`
**Depends on**: T3
**Reuses**: fixtures de `saldo.integration.test.ts`
**Requirement**: CUR-05, CUR-06, CUR-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Tests**: integration
**Gate**: full

**Commit**: `test(cursos): check balance and creation against tb_curso`

---

### T5: VIEWs do `bi`

**What**: Gerar `bi.TB_Curso` e ajustar `bi.TB_Pre_Curso` e `bi.TB_Pos_Curso`; conferir com `CHECK TABLE` num `bi` local.
**Where**: `src/lib/respostas/views-bi.ts`
**Depends on**: T4
**Reuses**: `sqlDasViewsBi`
**Requirement**: CUR-19, CUR-20, CUR-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `CHECK TABLE` OK nas quatro VIEWs de formulário e em `bi.TB_Curso` no banco local migrado
- [ ] Gate check passes: `npm run typecheck && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(bi): add the course view`

---

### T6: Suíte e2e sem regressão

**What**: Rodar a suíte e2e completa sem mudar asserções.
**Where**: `e2e/`
**Depends on**: T5
**Reuses**: suíte e2e existente
**Requirement**: CUR-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhuma asserção e2e alterada
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: build

**Commit**: `test(e2e): run the suite against tb_curso`

---

### T7: AD-052 e procedimento de deploy

**What**: Registrar a AD-052 em `.specs/STATE.md` e o deploy desta migration em `docs/DEPLOY_PRODUCAO.md` (backup, `views-bi.sql` logo depois, reversão).
**Where**: `.specs/STATE.md`
**Depends on**: T6
**Reuses**: formato da AD-051
**Requirement**: CUR-22, CUR-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `docs(cursos): record ad-052 and deploy steps`

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

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Tradução curso ↔ JSON | unit | unit | ✅ OK |
| T2 | Persistência do curso | integration | integration | ✅ OK: escritos no T2, executados no T3, o primeiro task com `TB_Curso` no banco (merge forward, como na AD-051) |
| T3 | Migration SQL | integration | integration | ✅ OK |
| T4 | Persistência do curso | integration | integration | ✅ OK |
| T5 | VIEWs do `bi` | unit | unit | ✅ OK |
| T6 | Rotas e telas | e2e | e2e | ✅ OK |
| T7 | Documentação | none | none | ✅ OK |
