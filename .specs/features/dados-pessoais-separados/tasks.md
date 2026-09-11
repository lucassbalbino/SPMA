# Dados Pessoais Separados Tasks

> # ⛔ DESATUALIZADO — NÃO EXECUTAR
>
> Este arquivo descreve o plano ANTERIOR, de quando a feature era só uma
> separação de persistência. Ele **contradiz o `spec.md` atual** em pontos que
> mudam o modelo de dados, e os validadores determinísticos NÃO pegam isso —
> `validate_tasks.py` passa neste arquivo mesmo assim.
>
> O que mudou depois que isto foi escrito (dois pedidos novos do usuário):
>
> | Aqui diz | Hoje é |
> | --- | --- |
> | Chave `(CPF, curso)` | **Só o CPF** — a coleta acontece antes de existir qualquer curso |
> | As 7 perguntas continuam no questionário do curso | **Saem** — a Parte 1 cai de 19 para 12 |
> | "Nenhuma rota muda, nenhum componente React muda" | Tela nova no `/painel`, tela de perfil, gate de navegação, rota de gravação |
> | "Nenhuma asserção de teste existente muda" | Mudam — 3 specs e2e preenchem essas perguntas hoje |
> | Backfill move as linhas | **Descarte**: as respostas pessoais antigas são removidas e recoletadas |
> | 6 tarefas em 3 fases | A reescrever a partir dos 27 requisitos do `spec.md` |
>
> **Refaça este arquivo a partir do `spec.md` e do `context.md` antes de
> executar qualquer coisa.**

---


## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/dados-pessoais-separados/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Mesma matriz de `respostas-normalizadas`, que continua valendo: nada mudou em `AGENTS.md`, nas configs de Vitest/Playwright nem no threshold de cobertura (inexistente, logo default forte).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica de domínio (`src/lib/**`, exceto acesso a dados) | unit | Todos os ramos; 1:1 com as ACs da spec; todo edge case listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Acesso a dados (`src/lib/respostas/repositorio.ts`) | integration | Caminhos de query principais + caminhos de erro, contra banco real | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Migration com comportamento de dados | integration | Movimento por tipo de valor (escalar, lista) + avaliação sem dado pessoal + contagem exata nas duas tabelas | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Rotas API e telas (`src/app/**`) | e2e | Toda rota tocada: happy path + edge cases + caminhos de erro | `e2e/*.spec.ts` | `npm run test:e2e` |
| Schema Prisma / migration estrutural | none | - (só gate de build) | - | build gate only |

## Gate Check Commands

> A ordem `lint && build && typecheck` é a registrada em `.specs/STATE.md` (Next 16 gera `LayoutProps` no build).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tarefas só com teste unitário | `npm run test:unit` |
| Full | Depois de tarefas com teste de integração | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | Fim de fase, ou tarefa só de schema/config | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

**Política de gate desta feature:** a suíte e2e agora roda em ~6 minutos (paralelizada por arquivo, `b43b2c1`), contra os ~22 que forçaram o gate reduzido na feature anterior. Com esse custo, **toda tarefa usa gate Full ou Build** — não há mais razão para gate por alvo. A rede de regressão completa passa em todas as 6 tarefas.

**Conferir sempre `test-results/.last-run.json`** (`status` + `failedTests`), nunca a linha `N passed` nem o exit code de um pipe ou encadeamento — essa classe de falso-verde apareceu três vezes na feature anterior.

---

## Execution Plan

Fases são ordenadas e rodam em sequência - cada fase termina antes da próxima começar, e as tarefas dentro de uma fase executam em ordem.

**Invariante que governa a ordem:** diferente da AD-041, aqui não há fase de espelho - as linhas MUDAM DE LUGAR em vez de ganhar uma segunda representação. A suíte só volta ao verde quando o repositório (T3) e a migração (T4) estiverem ambos no lugar, porque o código novo lê da tabela nova e o dado só chega lá na T4. Por isso a T3 e a T4 são consecutivas e a T3 carrega gate Full com a migração ainda não aplicada apenas nos ambientes de teste que ela mesma prepara.

### Phase 1: Fundação

```
T1 → T2
```

### Phase 2: Partição na borda de persistência

A seta de entrada mostra a dependência de fronteira com a fase anterior.

```
T2 → T3 → T4
```

### Phase 3: Prova e fechamento

```
T4 → T5 → T6
```

---

## Task Breakdown

### T1: Declarar a fronteira numa única lista

**What**: `CHAVES_PESSOAIS` com as 7 chaves da seção DADOS PESSOAIS (Q3–Q9), mais o predicado puro que o repositório vai usar.
**Where**: `src/lib/validation/schemas/avaliacao.schema.ts`, `src/lib/respostas/pessoais.ts`
**Depends on**: -
**Reuses**: padrão de `CHAVES_PARTE_1` (`as const satisfies readonly (keyof RespostasAvaliacao)[]`)
**Requirement**: PESSOAL-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `CHAVES_PESSOAIS` lista as 7 chaves `avalPessoal*`, com `satisfies` que quebra a compilação se alguma sumir do schema
- [ ] `ehChavePessoal` e `particionar` são funções puras, sem acesso a banco
- [ ] Teste afirma que as 7 são pessoais e que as 12 restantes da Parte 1 NÃO são — nomeando Q10–Q16 (renda, condição de trabalho, experiência) e Q17–Q21 (motivação, expectativa) uma a uma, não por amostra
- [ ] Teste afirma que `CHAVES_PESSOAIS` é subconjunto próprio de `CHAVES_PARTE_1` (7 de 19) - se alguém mesclar as duas listas, cai
- [ ] Gate check passes (Quick): `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(avaliacao): declarar as chaves de dado pessoal do aluno`

---

### T2: Tabela de dado pessoal no schema Prisma

**What**: model `DadoPessoalAluno` e a migration que cria a tabela.
**Where**: `prisma/schema.prisma`, `prisma/migrations/`
**Depends on**: T1
**Reuses**: forma de `RespostaAvaliacao` (AD-041)
**Requirement**: PESSOAL-04, PESSOAL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `@@unique([cpf, cdCurso, chave, ordem])` e `@@index([chave])` presentes
- [ ] FK composta para `AvaliacaoAluno` com `onDelete: Cascade`
- [ ] Migration de criação gerada; nenhuma linha movida ainda
- [ ] Gate check passes (Build): `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: none
**Gate**: build

**Commit**: `feat(avaliacao): criar a tabela de dado pessoal do aluno`

---

### T3: Repositório particiona por chave

**What**: `buscarLinhas`, `apagarLinhas` e `inserirLinhas` passam a rotear cada chave para a sua tabela, mantendo o objeto único acima da borda.
**Where**: `src/lib/respostas/repositorio.ts`
**Depends on**: T2
**Reuses**: `particionar` (T1), `montarRespostas`, `ISOLAMENTO_RESPOSTAS`
**Requirement**: PESSOAL-01, PESSOAL-02, PESSOAL-03, PESSOAL-11, PESSOAL-17, PESSOAL-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `PATCH` com chave pessoal grava só em `TB_Dado_Pessoal_Aluno` (PESSOAL-01)
- [ ] `PATCH` com chave de curso grava só em `TB_Resposta_Avaliacao` (PESSOAL-02)
- [ ] `PATCH` misto grava cada uma na sua tabela, na mesma transação (PESSOAL-03)
- [ ] `lerRespostas` devolve UM objeto com as duas metades, e `null` quando não há nenhuma (PESSOAL-11)
- [ ] Lista pessoal que encolhe perde as linhas das opções que saíram (PESSOAL-17)
- [ ] Transação revertida não deixa linha em nenhuma das duas tabelas (PESSOAL-19)
- [ ] Gate check passes (Full): `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: integration
**Gate**: full

**Commit**: `refactor(respostas): particionar dado pessoal e questionario`

---

### T4: Migration que move os dados já gravados

**What**: `INSERT ... SELECT` das linhas pessoais para a tabela nova e `DELETE` delas da tabela de resposta.
**Where**: `prisma/migrations/`, `src/lib/respostas/dados-pessoais.integration.test.ts`
**Depends on**: T3
**Reuses**: padrão do backfill da AD-041 (SQL, não script TS)
**Requirement**: PESSOAL-13, PESSOAL-14, PESSOAL-15, PESSOAL-16, PESSOAL-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Linhas pessoais movidas com `Ordem` e `Valor` preservados (PESSOAL-13)
- [ ] Nenhuma chave pessoal permanece em `TB_Resposta_Avaliacao`; as de curso ficam todas (PESSOAL-14)
- [ ] Avaliação sem dado pessoal não gera linha e não quebra (PESSOAL-15)
- [ ] `status`, `parte1Completa` e `dataEncerramento` intactos (PESSOAL-16)
- [ ] Chave órfã pessoal: limite do design registrado em comentário no teste (PESSOAL-18)
- [ ] O teste lê o SQL real do disco e restaura o estado que encontrou, como `backfill.integration.test.ts`
- [ ] Gate check passes (Build): `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: integration
**Gate**: build

**Commit**: `feat(avaliacao): mover os dados pessoais ja gravados`

---

### T5: Prova da fronteira e da agregação

**What**: teste que afirma a separação como propriedade do banco, não do código, e que a agregação por pergunta funciona do lado pessoal.
**Where**: `src/lib/respostas/dados-pessoais.integration.test.ts`
**Depends on**: T4
**Reuses**: padrão de `agregacao.integration.test.ts`
**Requirement**: PESSOAL-01, PESSOAL-02, PESSOAL-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Consulta direta afirma: zero chave pessoal em `TB_Resposta_Avaliacao`, zero chave de curso em `TB_Dado_Pessoal_Aluno` - varrendo as 19 chaves, não uma amostra
- [ ] Agregação por `(Chave, Valor)` sobre a tabela nova conta corretamente e passa pelo índice de `Chave`
- [ ] Gate check passes (Full): `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: integration
**Gate**: full

**Commit**: `test(avaliacao): provar a fronteira entre pessoal e questionario`

---

### T6: Registrar a AD e retificar as specs

**What**: AD nova declarando a separação e o custo aceito, mais retificação da spec de `avaliacao-aluno` e do Handoff.
**Where**: `.specs/STATE.md`, `.specs/features/avaliacao-aluno/spec.md`
**Depends on**: T5
**Reuses**: precedente do AD-041
**Requirement**: PESSOAL-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] AD nova declara a fronteira, cita a tabela e registra as duas decisões do agente (escopo de 14 chaves, cardinalidade mantida) com o custo de cada uma
- [ ] Registra o limite conhecido: chave pessoal órfã de questionário antigo não é movida pela migration
- [ ] `avaliacao-aluno/spec.md` deixa de afirmar que as respostas vivem todas numa tabela só
- [ ] Handoff atualizado
- [ ] Gate check passes (Build): `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: none
**Gate**: build

**Commit**: `docs(avaliacao): registrar a separacao do dado pessoal`

---

## Phase Execution Map

```
Phase 1:  T1 -----→ T2
                     |
Phase 2:             └→ T3 -----→ T4
                                   |
Phase 3:                           └→ T5 -----→ T6
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Chaves pessoais | 2 arquivos, funções puras | ✅ Granular |
| T2: Tabela nova | 1 schema + 1 migration | ✅ Granular |
| T3: Partição no repositório | 1 módulo | ✅ Granular |
| T4: Migration de movimento | 1 migration + 1 teste | ✅ Granular |
| T5: Prova da fronteira | 1 arquivo de teste | ✅ Granular |
| T6: AD e retificações | 1 arquivo de memória + spec citada | ⚠️ Coeso: uma decisão só, propagada |

## Diagram-Definition Cross-Check

| Task | Depends on | Diagrama | Match |
| --- | --- | --- | --- |
| T1 | - | início da Fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |

## Test Co-location Validation

| Task | Camada | Matriz exige | Tarefa declara | OK |
| --- | --- | --- | --- | --- |
| T1 | Domínio (funções puras) | unit | unit | ✅ OK |
| T2 | Schema Prisma | none | none | ✅ OK |
| T3 | Acesso a dados | integration | integration | ✅ OK |
| T4 | Migration com dados | integration | integration | ✅ OK |
| T5 | Acesso a dados | integration | integration | ✅ OK |
| T6 | Documentação | none | none | ✅ OK |
