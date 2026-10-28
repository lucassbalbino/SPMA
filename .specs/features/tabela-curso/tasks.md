# Tabela de Curso Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/tabela-curso/design.md`
**Status**: Done

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `AGENTS.md` (convenções visuais, sem regra de teste), `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, memória do projeto `feedback_test_scope` (camada mais barata que prova o AC; não inflar e2e).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Tradução curso ↔ JSON (`comCurso`) | unit | Achatamento e campos por etapa (CUR-11) | `src/lib/cursos/*.test.ts` | `npm run test:unit` |
| Persistência do curso | integration | Criação transacional, FKs, exclusão, saldo (CUR-01 a CUR-08, CUR-12) | `src/lib/cursos/*.integration.test.ts` | `npm run test:integration` |
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
T1
```

### Phase 2: Migração e persistência

```
T1 → T2 → T3
```

### Phase 3: Power BI, regressão e documentação

```
T3 → T4 → T5 → T6
```

### Phase 4: Correções da validação (iteração 1)

```
T6 → T7 → T8 → T9
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

- [x] `comCurso` coberto por teste unitário (achatamento e lista de campos do pós)
- [x] Nenhum acesso a `preCurso.cdOfertante`, `.cdVerba`, `.vlCursoAlocado`, `.criadoPor`, `.dataCriacao` ou `posCurso.preCurso` fora do model `Curso`
- [x] Gate check passes: `npm run typecheck && npm run test:unit && npm run build`

**Status**: Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cursos)!: give the course its own table`

---

### T2: Migration com autoconferência

**What**: Escrever a migration (expand, backfill, conferência, contract) e o teste por `prisma migrate deploy` em banco descartável, incluindo um aborto por conferência; escrever o `reversao.sql`.
**Where**: `prisma/migrations/<timestamp>_tabela_curso/`
**Depends on**: T1
**Reuses**: harness de `respostas-por-coluna-migracao.integration.test.ts`
**Requirement**: CUR-14, CUR-15, CUR-16, CUR-17, CUR-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `prisma migrate diff` do banco migrado contra o schema = vazio
- [x] A suíte de integração existente passa contra o banco migrado
- [x] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Status**: Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): move course data to tb_curso with self-check`

---

### T3: Persistência do curso contra o banco

**What**: Conferir em integração as chaves estrangeiras, a criação transacional, a exclusão (cascata no pré e no pós, recusa com avaliação) e o saldo da verba somando `TB_Curso`.
**Where**: `src/lib/cursos/curso.integration.test.ts`
**Depends on**: T2
**Reuses**: fixtures de `saldo.integration.test.ts`
**Requirement**: CUR-02, CUR-05, CUR-06, CUR-07, CUR-08, CUR-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Status**: Done

**Tests**: integration
**Gate**: full

**Commit**: `test(cursos): check course persistence against the database`

---

### T4: VIEWs do `bi`

**What**: Gerar `bi.TB_Curso` e ajustar `bi.TB_Pre_Curso` e `bi.TB_Pos_Curso`; conferir com `CHECK TABLE` num `bi` local.
**Where**: `src/lib/respostas/views-bi.ts`
**Depends on**: T3
**Reuses**: `sqlDasViewsBi`
**Requirement**: CUR-19, CUR-20, CUR-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `CHECK TABLE` OK nas quatro VIEWs de formulário e em `bi.TB_Curso` no banco local migrado
- [x] Gate check passes: `npm run typecheck && npm run test:unit`

**Status**: Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(bi): add the course view`

---

### T5: Suíte e2e sem regressão

**What**: Rodar a suíte e2e completa sem mudar asserções.
**Where**: `e2e/`
**Depends on**: T4
**Reuses**: suíte e2e existente
**Requirement**: CUR-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhuma asserção e2e alterada
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e`

**Status**: Done

**Tests**: e2e
**Gate**: build

**Resultado e2e**: 296 de 296 na suíte completa (11,3 min). Nenhum arquivo em `e2e/` mudou nesta feature; só o fixture (`scripts/e2e-fixture.ts`, T1), que manteve as assinaturas.

**Commit**: `test(e2e): run the suite against tb_curso`

---

### T6: AD-052 e procedimento de deploy

**What**: Registrar a AD-052 em `.specs/STATE.md` e o deploy desta migration em `docs/DEPLOY_PRODUCAO.md` (backup, `views-bi.sql` logo depois, reversão).
**Where**: `.specs/STATE.md`
**Depends on**: T5
**Reuses**: formato da AD-051
**Requirement**: CUR-22, CUR-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Status**: Done

**Tests**: none
**Gate**: build

**Commit**: `docs(cursos): record ad-052 and deploy steps`

---

### T7: Cada ramo da conferência provocado (Fix 1 e Fix 2)

**What**: Corromper no teste da migration cada coluna comparada, separadamente; provocar a contagem com um curso a mais; semear um pós-curso órfão e uma avaliação órfã em cenários próprios; desfazer cada tentativa com o `reversao.sql`.
**Where**: `src/lib/cursos/tabela-curso-migracao.integration.test.ts`
**Depends on**: T6
**Reuses**: relatório do Verifier, `validation.md` (iteração 1)
**Requirement**: CUR-16, CUR-17, CUR-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os mutantes M2b (comparação sem `Data_Criacao`) e M9 (`cursos_orfaos` sem a avaliação) são mortos, e também a retirada do ramo de contagem e a do `Criado_Por`
- [x] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Status**: Done

**Tests**: integration
**Gate**: full

**Commit**: `test(cursos): provoke every branch of the migration self-check`

---

### T8: Asserções menores (iteração 1)

**What**: Exigir o erro de chave estrangeira (`P2003`) no teste do CUR-08 e testar `posCursoLiberado(null)`.
**Where**: `src/lib/cursos/curso.integration.test.ts`, `src/lib/pos-curso/liberacao.test.ts`
**Depends on**: T7
**Reuses**: relatório do Verifier, `validation.md` (iteração 1)
**Requirement**: CUR-08, CUR-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate check passes: `npm run db:test:reset && npm run test:unit && npm run test:integration`

**Status**: Done

**Tests**: integration
**Gate**: full

**Commit**: `test(cursos): pin the delete refusal and the closed post-course`

---

### T9: Precisão da spec e campo a mais do pós

**What**: Ressalvar no CUR-13 a leitura de colunas movidas em `TB_Curso`; tirar do CUR-22 a cópia do nome; documentar no design e na AD-052 o `cdOfertante` a mais no `PATCH` e no `encerrar` do pós; registrar as lições do Verifier.
**Where**: `.specs/`
**Depends on**: T8
**Reuses**: relatório do Verifier, `validation.md` (iteração 1)
**Requirement**: CUR-11, CUR-13, CUR-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Status**: Done

**Tests**: none
**Gate**: build

**Commit**: `docs(cursos): clarify cur-13 and the extra post-course field`

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

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Tradução curso ↔ JSON | unit | unit | ✅ OK: a persistência do T1 é provada no T3, depois que a migration do T2 cria `TB_Curso` |
| T2 | Migration SQL | integration | integration | ✅ OK |
| T3 | Persistência do curso | integration | integration | ✅ OK |
| T4 | VIEWs do `bi` | unit | unit | ✅ OK |
| T5 | Rotas e telas | e2e | e2e | ✅ OK |
| T6 | Documentação | none | none | ✅ OK |
| T7 | Migration SQL | integration | integration | ✅ OK |
| T8 | Persistência do curso + liberação do pós | integration / unit | integration | ✅ OK |
| T9 | Documentação | none | none | ✅ OK |
