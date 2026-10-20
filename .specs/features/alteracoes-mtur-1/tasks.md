# Alterações MTur (Documento 1) Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: sem `design.md` - nenhuma decisão de arquitetura nova. A troca é de conteúdo (textos e chaves) dentro da forma já existente: schema Zod único (AD-004), respostas normalizadas `(Chave, Ordem, Valor)` e migration de dados em SQL literal (precedente: `20260911203228_descartar_dados_pessoais_do_questionario`).
**Status**: In Progress (T1 feita)

---

## Test Coverage Matrix

> Herdada de `dados-pessoais-separados/tasks.md`. Guidelines: `AGENTS.md` (sem regra de teste), `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, e a preferência registrada do usuário: camada mais barata que prove a AC, e2e só onde o fluxo já exercitado muda.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Schema Zod e domínio (`src/lib/**`) | unit | 1:1 com as ACs; todo edge case listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Migration com dados | integration | Cada UPDATE/DELETE + linha que não pode ser tocada, rodando o SQL do próprio arquivo | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Telas (`src/app/**`, `src/components/**`) | e2e | Só os specs que já exercitam a tela tocada: corrigir o que a mudança quebra + rótulos novos | `e2e/*.spec.ts` | `npm run test:e2e` |
| Documentação (`docs/`, `.specs/`) | none | - (gate de build) | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário | `npm run test:unit` |
| Full | Tarefa com integração ou e2e | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | Fim de fase / tarefa documental | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

**Conferir sempre `test-results/.last-run.json`** (`status` + `failedTests`), não o exit code de um encadeamento. Checar porta 3000 livre antes de gate com e2e.

---

## Execution Plan

### Phase 1: Formulários

```
T1 → T2 → T3
```

### Phase 2: Dados e fontes

```
T4 → T5
```

---

## Task Breakdown

### T1: Textos revisados do pré-curso

**What**: Trocar as opções de `OPCOES_CARACTERISTICAS` (Q10) e os rótulos de Q7 e Q30 do pré-curso.
**Where**: `src/lib/validation/schemas/pre-curso.schema.ts`
**Depends on**: None
**Reuses**: `src/app/(protegido)/pre-cursos/[id]/PreCursoForm.tsx` (rótulos de Q7/Q30), `src/lib/validation/schemas/pre-curso.schema.test.ts`, `e2e/pre-cursos-formulario.spec.ts`
**Requirement**: MTUR-01, MTUR-02, MTUR-03, MTUR-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `OPCOES_CARACTERISTICAS` igual à lista de MTUR-03, na ordem
- [x] Os 4 textos antigos rejeitados pelo schema (MTUR-04)
- [x] Rótulos de Q7 e Q30 com o texto de MTUR-01/02, visíveis no e2e já existente do formulário
- [x] Gate Full passa, sem teste removido

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): aplicar textos revisados pelo MTur`

---

### T2: Cor/raça e PCD com as opções novas

**What**: `OPCOES_RACA_ETNIA` com "Preto" no lugar de "Negro" e `OPCOES_CONDICAO_PCD` reduzida a "Não sou uma Pessoa com Deficiência." / "Sim.".
**Where**: `src/lib/validation/schemas/dados-pessoais.schema.ts`
**Depends on**: T1
**Reuses**: `src/lib/validation/schemas/dados-pessoais.schema.test.ts`, `e2e/meus-dados.spec.ts`
**Requirement**: MTUR-05, MTUR-06, MTUR-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] As duas listas iguais a MTUR-05 e MTUR-06, na ordem
- [ ] "Negro" e os 4 "Sim, tenho deficiência …" rejeitados (MTUR-07)
- [ ] `e2e/meus-dados.spec.ts` grava com os valores novos
- [ ] Gate Full passa, sem teste removido

**Tests**: e2e
**Gate**: full

**Commit**: `feat(dados-pessoais): adotar Preto (IBGE) e PCD Sim/Nao`

---

### T3: Questionário do aluno sem os 4 blocos pós-certificado

**What**: Remover as 11 chaves do schema, da completude, das condicionais e da tela do aluno.
**Where**: `src/lib/validation/schemas/avaliacao.schema.ts`
**Depends on**: T2
**Reuses**: `src/lib/avaliacao/completude.ts`, `src/lib/avaliacao/condicionais.ts`, `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/AvaliacaoForm.tsx`, os testes unitários e os 3 e2e de avaliação
**Requirement**: MTUR-08, MTUR-09, MTUR-10, MTUR-11, MTUR-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhuma das 11 chaves no schema, em `CHAVES_PARTE_1`, `CHAVES_SOMENTE_CONCLUINTE`, completude ou condicionais
- [ ] Parte 1 completa com as 7 chaves + Q16 condicional (MTUR-10)
- [ ] Encerramento com Q22="Sim" exige exatamente as 15 chaves de MTUR-11
- [ ] Chave removida no PATCH não vira linha (MTUR-09)
- [ ] Tela sem os 4 blocos, numeração original nos rótulos (MTUR-08, MTUR-12)
- [ ] Gate Full passa, sem teste removido além dos que testavam as chaves removidas

**Tests**: e2e
**Gate**: full

**Commit**: `feat(avaliacao): remover blocos que o aluno so responde apos o certificado`

---

### T4: Migration de dados

**What**: Migration SQL que troca os textos antigos, apaga as linhas das 11 chaves e recalcula `Parte1_Completa`.
**Where**: `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql`
**Depends on**: None
**Reuses**: padrão de `src/lib/respostas/dados-pessoais-migracao.integration.test.ts` (roda o SQL do próprio arquivo); teste novo em `src/lib/respostas/alteracoes-mtur-migracao.integration.test.ts`
**Requirement**: MTUR-13, MTUR-14, MTUR-15, MTUR-16, MTUR-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cada UPDATE e o DELETE provados contra `spma_test`
- [ ] Linha de outra chave e linha já com texto novo intactas (MTUR-17)
- [ ] `Parte1_Completa` só vira `true` onde MTUR-10 vale; demais intactas (MTUR-16)
- [ ] Gate Full passa

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): migrar respostas para os textos e blocos do MTur`

---

### T5: Fontes em docs/ e decisão AD-048

**What**: Aplicar as mudanças nos questionários-fonte, salvar `docs/Alteracoes_MTur_1.md` e registrar a AD-048.
**Where**: `docs/Questionario_do_Aluno_1.md`
**Depends on**: T4
**Reuses**: `docs/Questionario_do_Gestor_Pre_Curso.md`, `docs/SPMA_Especificacao_Cliente_v2.md` (tabelas 6.1/6.2), `.specs/STATE.md`
**Requirement**: MTUR-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] grep pelos textos antigos em `docs/Questionario_*` retorna zero
- [ ] AD-048 em `.specs/STATE.md`
- [ ] Gate Build passa

**Tests**: none
**Gate**: build

**Commit**: `docs(mtur): atualizar questionarios-fonte e registrar AD-048`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5
```
