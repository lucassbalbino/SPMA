# Alterações no Questionário do Gestor (Pré-Curso) Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: sem `design.md`. Nenhuma decisão de arquitetura nova: as 7 chaves entram na forma que já existe (schema Zod único, AD-004; condicional "Qual?" em `condicionais.ts`, REQ-PC-09; respostas normalizadas com forma derivada do schema, AD-041). A ordem do par de inscrição estende `ordemDatasValida`, que a rota PATCH já chama contra o estado mesclado.
**Status**: In Progress

---

## Test Coverage Matrix

> Herdada de `alteracoes-mtur-1/tasks.md`. Guidelines: `AGENTS.md` (sem regra de teste), `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, e a preferência registrada do usuário: camada mais barata que prove a AC, e2e só onde o fluxo já exercitado muda.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Schema Zod e domínio (`src/lib/**`) | unit | 1:1 com as ACs; todo edge case listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Telas (`src/app/**`) | e2e | Só os specs que já exercitam a tela tocada: corrigir o que a mudança quebra + rótulos e campos novos | `e2e/pre-cursos-*.spec.ts` | `npm run test:e2e -- <arquivos>` |
| Documentação (`docs/`, `.specs/`) | none | - (gate de build) | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário | `npm run test:unit` |
| Full | Tarefa com e2e | `npm run test:unit && npm run test:integration && npm run test:e2e -- e2e/pre-cursos-formulario.spec.ts e2e/pre-cursos-encerrar.spec.ts e2e/pre-cursos-id.spec.ts` |
| Build | Fim da feature / tarefa documental | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

**Política de gate (precedente de `alteracoes-mtur-1`):** a suíte e2e completa leva perto de uma hora. O gate Full de T1-T3 roda só os três specs e2e do pré-curso; a suíte completa roda uma vez, no gate Build de T4.

**Conferir sempre `test-results/.last-run.json`** (`status` + `failedTests`), não o exit code de um encadeamento. Checar porta 3000 livre antes de gate com e2e.

---

## Execution Plan

### Phase 1: Questionário

```
T1 → T2 → T3
```

### Phase 2: Fontes

```
T4
```

---

## Task Breakdown

### T1: "Idiomas" em Q10 (A2)

**What**: Inserir "Idiomas" em `OPCOES_CARACTERISTICAS` entre "Eventos (…)" e "Outro".
**Where**: `src/lib/validation/schemas/pre-curso.schema.ts`
**Depends on**: None
**Reuses**: `src/lib/validation/schemas/pre-curso.schema.test.ts`, `src/lib/pre-curso/completude.test.ts`, `e2e/pre-cursos-formulario.spec.ts` (índice de "Outro" passa de 10 para 11)
**Requirement**: APC-08, APC-09, APC-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `OPCOES_CARACTERISTICAS` igual à lista de APC-08, na ordem
- [x] Só "Idiomas" marcada não exige `qualifCaracteristicasOutra` (APC-09)
- [x] e2e lê "Idiomas" como 11ª opção e marca "Outro" no índice 11 (APC-10)
- [x] Gate Full passa, sem teste removido

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): incluir Idiomas nas caracteristicas de Q10`

---

### T2: Município, UF e outros municípios na Seção 2 (A1)

**What**: Chaves `qualifMunicipio`, `qualifUf`, `qualifOutrosMunicipios`, `qualifOutrosMunicipiosQuais` no schema, regra condicional nova e campos 7a-7d na tela.
**Where**: `src/lib/validation/schemas/pre-curso.schema.ts`
**Depends on**: T1
**Reuses**: `src/lib/pre-curso/condicionais.ts`, `src/app/(protegido)/pre-cursos/[id]/PreCursoForm.tsx`, os testes unitários de schema/completude/condicionais/forma, `e2e/pre-cursos-formulario.spec.ts`, `e2e/pre-cursos-encerrar.spec.ts`
**Requirement**: APC-01, APC-02, APC-03, APC-04, APC-05, APC-06, APC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Forma das 4 chaves aceita e rejeita conforme APC-02/APC-03
- [x] Regra `qualifOutrosMunicipiosQuais` exige com "Sim", não exige com "Não" e descarta órfã (APC-04 a APC-06)
- [x] As 3 sempre obrigatórias aparecem em `pendentes` quando ausentes (APC-07)
- [x] Tela mostra os 4 rótulos de APC-01 na ordem e revela "7d. Qual?" só com "Sim", visível no e2e
- [x] Gate Full passa, sem teste removido

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): perguntar municipio, UF e outros municipios da acao`

---

### T3: Inscrição e vagas na Seção 3 (A3)

**What**: Chaves `planejDataInicioInscricao`, `planejDataTerminoInscricao`, `planejNumVagas` no schema, `ordemDatasValida` cobrindo o par de inscrição e campos 17a-17d na tela.
**Where**: `src/lib/validation/schemas/pre-curso.schema.ts`
**Depends on**: T2
**Reuses**: `src/app/(protegido)/pre-cursos/[id]/PreCursoForm.tsx`, os testes unitários de schema/completude/forma, `e2e/pre-cursos-formulario.spec.ts`, `e2e/pre-cursos-encerrar.spec.ts`
**Requirement**: APC-11, APC-12, APC-13, APC-14, APC-15, APC-16, APC-17, APC-18, APC-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Forma das 3 chaves aceita e rejeita conforme APC-12/APC-13
- [x] `ordemDatasValida` rejeita 17c < 17b e aceita igual, uma só ou nenhuma (APC-14/APC-15), sem perder o par do curso
- [x] As 3 chaves aparecem em `pendentes` quando ausentes (APC-16)
- [x] 63 chaves e 10 regras (APC-17); fixture de 56 chaves antigas pendente exatamente nas 6 novas (APC-18)
- [x] Tela mostra os 4 rótulos de APC-11 na ordem; e2e preenche tudo e encerra (APC-19)
- [x] Gate Full passa, sem teste removido

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): perguntar periodo de inscricao e numero de vagas`

---

### T4: Fontes em docs/ e decisão AD-049

**What**: Aplicar A1-A3 no questionário-fonte, salvar o pedido do cliente, marcar os pendentes do MTur como aplicados e registrar a AD-049.
**Where**: `docs/Questionario_do_Gestor_Pre_Curso.md`
**Depends on**: None
**Reuses**: `docs/Alteracoes_MTur_1.md`, `docs/SPMA_Especificacao_Cliente_v2.md` (tabela do pré-curso), `.specs/STATE.md`, `.specs/features/formulario-pre-curso/spec.md` (nota de supersessão)
**Requirement**: APC-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `docs/Questionario_do_Gestor_Pre_Curso.md` com 7a-7d, "k) Idiomas", "l) Outro. Qual?" e 17a-17d
- [x] `docs/Alteracoes_Questionario_Gestor_Pre_Curso.md` salvo com "Como foi aplicado"
- [x] AD-049 em `.specs/STATE.md`
- [x] Gate Build passa

**Tests**: none
**Gate**: build

**Commit**: `docs(pre-curso): atualizar questionario-fonte e registrar AD-049`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4
```
