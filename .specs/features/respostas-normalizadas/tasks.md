# Respostas Normalizadas Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/respostas-normalizadas/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerada a partir do código, das convenções do projeto e da spec - confirmar antes do Execute. Guidelines encontradas: `AGENTS.md` (convenções de projeto; não define profundidade de teste), `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts` (sem threshold de cobertura configurado). Sem threshold documentado, aplica-se o default forte.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica de domínio (`src/lib/**`, exceto acesso a dados) | unit | Todos os ramos; 1:1 com as ACs da spec; todo edge case listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Acesso a dados (`src/lib/respostas/repositorio.ts`) | integration | Caminhos de query principais + caminhos de erro, contra banco real | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Migration com comportamento de dados (backfill) | integration | Round-trip por tipo de valor (escalar, numérico, lista) + registro nulo + chave fora do schema | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Rotas API e telas (`src/app/**`) | e2e | Toda rota tocada: happy path + todo edge case listado + caminhos de erro | `e2e/*.spec.ts` | `npm run test:e2e` |
| Schema Prisma / migration estrutural | none | - (só gate de build) | - | build gate only |
| Infra de teste (`e2e/helpers/**`) | none | - (validada pela suíte existente continuar verde) | - | build gate only |

## Gate Check Commands

> Gerada a partir do código - confirmar antes do Execute. A ordem `lint && build && typecheck` é a registrada em `.specs/STATE.md` (Next 16 gera `LayoutProps` no build).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tarefas só com teste unitário | `npm run test:unit` |
| Alvo | Depois de tarefas de rota/tela, durante a fase | `npm run test:unit && npm run test:integration` + só os arquivos e2e que a tarefa toca (`npm run test:e2e -- <arquivos>`), com `E2E_REUSE_SERVER=1` e um `npm run dev:test` já de pé |
| Full | Depois de tarefas com teste de integração que não tocam rota | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | Fim de fase, ou tarefa só de schema/config | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

**Política de gate por tarefa (revisada durante o Execute):** a suíte e2e completa leva ~21 minutos e roda serializada de propósito (`workers: 1`, banco compartilhado). Rodá-la em cada uma das 14 tarefas restantes seriam ~3h30 de teste, e foi o que estourou o limite de sessão do primeiro worker. Então: tarefa de rota/tela usa o gate **Alvo** (só os arquivos e2e que ela toca), e a **última tarefa de cada fase mantém o gate Build**, que roda a suíte inteira. Nenhuma tarefa fica sem verificação, a rede de regressão completa passa cinco vezes ao longo da feature (T8, T11, T14, T16, T18), e o Verifier no fim roda tudo de novo de forma independente.

---

## Execution Plan

Fases são ordenadas e rodam em sequência - cada fase termina antes da próxima começar, e as tarefas dentro de uma fase executam em ordem.

**Invariante que governa a ordem das fases:** toda tarefa deixa a suíte verde. Isso é possível porque o repositório (T3) **espelha o JSON enquanto a coluna existir** - as duas representações ficam em sincronia durante as fases 3 a 5, e o espelho é removido na fase 6. O espelho vive numa única função, não espalhado pelas rotas.

### Phase 1: Fundação

```
T1 → T2 → T3
```

### Phase 2: Migração de dados

A seta de entrada mostra a dependência de fronteira com a fase anterior.

```
T3 → T4 → T5
```

### Phase 3: Pré-Curso passa a ler de linhas

```
T5 → T6 → T7 → T8
```

### Phase 4: Pós-Curso passa a ler de linhas

```
T8 → T9 → T10 → T11
```

### Phase 5: Avaliação do Aluno passa a ler de linhas

```
T11 → T12 → T13 → T14
```

### Phase 6: Contração e fechamento

A T19 vem antes da T15 de propósito: enquanto o espelho ainda está ligado, linhas e coluna concordam, então trocar a leitura dos helpers é comportamentalmente neutro e a suíte segue verde. Só depois o espelho pode ser desligado.

```
T14 → T19 → T15 → T16 → T17 → T18
```

---

## Task Breakdown

### T1: Classificador de forma das respostas ✅

**What**: função que, dada a chave de uma pergunta e o schema Zod do formulário, diz se o valor é lista, número ou texto, e converte entre valor e linhas.
**Where**: `src/lib/respostas/forma.ts`
**Depends on**: None
**Reuses**: os três schemas em `src/lib/validation/schemas/` (sem alterá-los)
**Requirement**: RESP-02, RESP-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `classificarChave` desembrulha apenas `ZodOptional`/`ZodNullable`/`ZodDefault` e checa `ZodArray` antes de qualquer outro desembrulho (ver a armadilha verificada em `design.md`)
- [x] `serializar` devolve um item por linha; `desserializar` reconstrói `string[]`, `number` ou `string`
- [x] Teste unitário classifica as 127 chaves reais dos três schemas e afirma **nominalmente** as 13 de lista (7 pré-curso, 3 pós-curso, 3 avaliação) e as 39 numéricas
- [x] Teste de round-trip: `desserializar(serializar(v)) === v` para valor escalar, numérico e lista
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 505 + novos, nenhum teste apagado (580 unit, 0 apagados)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(respostas): classificar forma da resposta pelo schema Zod`

---

### T2: Três tabelas de resposta no schema Prisma ✅

**What**: modelos `RespostaPreCurso`, `RespostaPosCurso` e `RespostaAvaliacao`, com FK e `ON DELETE CASCADE` para os pais, índice único e índice por chave; a coluna `Respostas` continua existindo.
**Where**: `prisma/schema.prisma`
**Depends on**: T1
**Reuses**: os três modelos pais já existentes
**Requirement**: RESP-05, RESP-06, RESP-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os três modelos existem conforme `design.md` (Data Models), incluindo `@@unique` e `@@index([chave])`
- [x] `RespostaAvaliacao` referencia a chave composta `[cpf, cdCurso]` do pai
- [x] Migration de criação gerada por `npx prisma migrate dev` e commitada junto (`20260910082855_criar_tabelas_resposta`)
- [x] Nenhuma coluna existente alterada ou removida nesta tarefa (só a relação inversa `linhasResposta` nos três pais, exigida pelo Prisma)
- [x] Gate check passes: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` (580 unit, 27 integration, 244 e2e)

**Tests**: none
**Gate**: build

**Commit**: `feat(respostas): criar as tres tabelas de resposta`

---

### T3: Repositório de respostas ✅

**What**: ler, gravar e apagar respostas em linhas, expondo para o resto do sistema o mesmo objeto `{ chave: valor }` de hoje; espelha a escrita na coluna JSON enquanto ela existir.
**Where**: `src/lib/respostas/repositorio.ts`
**Depends on**: T2
**Reuses**: `src/lib/respostas/forma.ts` (T1), padrão de `prisma.$transaction` já usado em `src/app/api/usuarios/route.ts`
**Requirement**: RESP-01, RESP-03, RESP-04, RESP-19, RESP-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `lerRespostas` remonta o objeto; registro sem linhas devolve `{}` (RESP-16)
- [x] `gravarRespostas` faz merge raso por chave: apaga as linhas das chaves do patch e insere as novas, tudo em uma transação (RESP-03, RESP-21)
- [x] Chave de lista que encolhe perde as linhas das opções que saíram (RESP-04)
- [x] Regravar a mesma chave com o mesmo valor mantém uma única linha (RESP-19)
- [x] `apagarRespostas` remove as chaves informadas, para o encerramento usar (RESP-08)
- [x] Espelho do JSON documentado em comentário como transitório, com referência à T15 que o remove
- [x] Teste de integração cobre: leitura vazia, gravação escalar, gravação de lista, lista que encolhe, regravação idempotente, e isolamento entre dois registros diferentes
- [x] Gate check passes: `npm run test:unit && npm run test:integration && npm run test:e2e` (580 unit, 41 integration, 244 e2e)
- [x] Test count: 27 de integração + novos, nenhum apagado (41 de integração)

**Tests**: integration
**Gate**: full

**Commit**: `feat(respostas): repositorio que traduz objeto e linhas`

---

### T4: Migration de backfill do JSON para linhas ✅

**What**: migration SQL que explode o `Respostas` de cada registro dos três formulários em linhas, antes de a coluna ser removida.
**Where**: `prisma/migrations/<timestamp>_backfill_respostas/migration.sql`
**Depends on**: T3
**Reuses**: `JSON_TABLE`/`JSON_KEYS` do MySQL 8.4
**Requirement**: RESP-13, RESP-14, RESP-15, RESP-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Uma linha por chave escalar e uma por opção de lista, com `ordem` preservando a posição (RESP-13)
- [x] Chave presente no JSON e ausente do schema Zod atual vira linha do mesmo jeito (RESP-14)
- [x] Registro com `Respostas` nulo não gera linha e não quebra a migration (RESP-16)
- [x] `status`, `dataEncerramento` e demais colunas dos três formulários intactos (RESP-15)
- [x] É migration SQL, executada por `prisma migrate deploy`, **não** um script manual - o `start:prod` roda migrations sozinho e um passo humano aqui significaria perda de dado (ver Risks em `design.md`)
- [x] Teste de integração semeia os três formulários com JSON (escalar, numérico, lista, chave fora do schema, e um registro nulo), roda a migration e afirma que o objeto remontado é igual ao JSON original
- [x] Gate check passes: `npm run test:unit && npm run test:integration && npm run test:e2e` (580 unit, 49 integration, 244 e2e)

**Tests**: integration
**Gate**: full

**Commit**: `feat(respostas): migrar respostas em JSON para linhas`

---

### T5: Fixtures e2e semeiam pelo repositório ✅

**What**: os helpers que semeiam respostas passam a gravar pelo repositório, mantendo a mesma assinatura de objeto para os specs que os chamam.
**Where**: `e2e/helpers/db.ts`
**Depends on**: T4
**Reuses**: `src/lib/respostas/repositorio.ts` (T3)
**Requirement**: RESP-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os helpers continuam recebendo o mesmo objeto de respostas - nenhum dos 11 specs que os chamam muda
- [x] Linhas e coluna JSON ficam em sincronia (o repositório espelha, T3)
- [x] Nenhuma asserção de teste existente foi alterada ou afrouxada
- [x] Gate check passes: `npm run test:unit && npm run test:integration && npm run test:e2e` (580 unit, 49 integration, 244 e2e)
- [x] Test count: 244 e2e, todos passando
- [x] `scripts/db-test-reset.ts` trunca as três tabelas novas: `TRUNCATE` do pai roda com `FOREIGN_KEY_CHECKS=0`, não dispara CASCADE e zera o AUTO_INCREMENT, então sem isso a rodada seguinte reusa `CD_Curso` e colide na unicidade

**Tests**: none
**Gate**: full

**Commit**: `test(respostas): semear fixtures e2e pelo repositorio`

---

### T6: PATCH do Pré-Curso lê e grava por linhas ✅

**What**: a rota de gravação parcial do pré-curso troca `registro.respostas` e `data: { respostas }` pelas chamadas do repositório.
**Where**: `src/app/api/pre-cursos/[id]/route.ts`
**Depends on**: T5
**Reuses**: `src/lib/respostas/repositorio.ts`, `src/lib/pre-curso/completude.ts` (inalterado)
**Requirement**: RESP-01, RESP-03, RESP-09, RESP-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Merge raso preservado: só as chaves enviadas mudam (RESP-03)
- [x] 409 em formulário encerrado, antes de abrir transação (RESP-09)
- [x] 400 de Zod não grava nenhuma linha (RESP-11)
- [x] Validação de ordem das datas continua rodando sobre o estado mesclado
- [x] Contrato HTTP idêntico: mesmo corpo de request e response
- [x] e2e de `pre-cursos-id`/`pre-cursos-formulario` passam sem alterar asserção
- [x] Gate check passes (Alvo): `npm run test:unit && npm run test:integration` (580 unit, 49 integration) + `npm run test:e2e -- e2e/pre-cursos-id.spec.ts e2e/pre-cursos-formulario.spec.ts` (16/16). Rodado com servidor fresco do Playwright, sem `E2E_REUSE_SERVER`: o `dev:test` de longa duração produziu 1-2 falhas intermitentes em cliques de checkbox/radio (`suporteEstrategias-opcao-8`, `publicoInstituicaoExecutora-opcao-2`) que também reproduzem na baseline sem T6 - ambiente, não regressão (ver Desvios no handoff desta tarefa).

**Tests**: e2e
**Gate**: alvo

**Commit**: `refactor(pre-cursos): gravar respostas por linhas no PATCH`

---

### T7: Encerramento do Pré-Curso apaga órfãs por linha ✅

**What**: a rota de encerramento passa a ler pelo repositório e a traduzir o descarte de condicional órfã em remoção de linhas, na mesma transação do `status=ENCERRADO`.
**Where**: `src/app/api/pre-cursos/[id]/encerrar/route.ts`
**Depends on**: T6
**Reuses**: `src/lib/pre-curso/condicionais.ts` (`normalizarCondicionaisPreCurso`, inalterado)
**Requirement**: RESP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Linhas das condicionais órfãs removidas na mesma transação que grava `ENCERRADO` (RESP-08, AD-038)
- [x] Completude avaliada sobre o objeto remontado, com o mesmo veredito de antes (RESP-07)
- [x] Encerramento continua irreversível
- [x] e2e de `pre-cursos-encerrar` passa sem alterar asserção
- [x] Gate check passes (Alvo): `npm run test:unit && npm run test:integration` (580 unit, 49 integration) + `npm run test:e2e -- e2e/pre-cursos-encerrar.spec.ts` (5/5, servidor fresco do Playwright)

**Tests**: e2e
**Gate**: alvo

**Commit**: `refactor(pre-cursos): descartar condicional orfa por linha no encerramento`

---

### T8: Tela do Pré-Curso lê pelo repositório ✅

**What**: o Server Component da tela passa a montar as respostas iniciais do formulário pelo repositório.
**Where**: `src/app/(protegido)/pre-cursos/[id]/page.tsx`
**Depends on**: T7
**Reuses**: `src/lib/respostas/repositorio.ts`
**Requirement**: RESP-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O formulário React recebe exatamente a mesma prop de hoje, sem alteração no componente cliente
- [x] e2e que abre a tela e confere valores já preenchidos passa sem alterar asserção
- [x] Gate check passes: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` (0 erros de lint, build ok, typecheck ok, 580 unit, 49 integration, 244 e2e em 21.7min)

**Tests**: e2e
**Gate**: build

**Commit**: `refactor(pre-cursos): ler respostas por linhas na tela`

---

### T9: PATCH do Pós-Curso lê e grava por linhas ✅

**What**: mesma troca da T6, na rota de gravação parcial do pós-curso.
**Where**: `src/app/api/pos-cursos/[cdCurso]/route.ts`
**Depends on**: T8
**Reuses**: padrão fechado na T6
**Requirement**: RESP-01, RESP-03, RESP-09, RESP-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Merge raso, 409 de encerrado e 400 de Zod com o mesmo comportamento de hoje
- [x] Validação de ordem das datas reais continua sobre o estado mesclado
- [x] e2e de `pos-cursos-id`/`pos-cursos-formulario` passam sem alterar asserção
- [x] Gate check passes (Alvo): `npm run test:unit && npm run test:integration` (580 unit, 49 integration) + `npm run test:e2e -- e2e/pos-cursos-id.spec.ts e2e/pos-cursos-formulario.spec.ts` (16/16, servidor fresco do Playwright - ver nota de T6 sobre flakiness do `E2E_REUSE_SERVER` em specs de UI)

**Tests**: e2e
**Gate**: alvo

**Commit**: `refactor(pos-cursos): gravar respostas por linhas no PATCH`

---

### T10: Encerramento do Pós-Curso apaga órfãs por linha ✅

**What**: mesma troca da T7, na rota de encerramento do pós-curso.
**Where**: `src/app/api/pos-cursos/[cdCurso]/encerrar/route.ts`
**Depends on**: T9
**Reuses**: `src/lib/pos-curso/condicionais.ts` (inalterado)
**Requirement**: RESP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Linhas órfãs removidas na transação do encerramento (RESP-08)
- [x] e2e de `pos-cursos-encerrar` passa sem alterar asserção
- [x] Gate check passes (Alvo): `npm run test:unit && npm run test:integration` (580 unit, 49 integration) + `npm run test:e2e -- e2e/pos-cursos-encerrar.spec.ts` (5/5, servidor fresco do Playwright)

**Tests**: e2e
**Gate**: alvo

**Commit**: `refactor(pos-cursos): descartar condicional orfa por linha no encerramento`

---

### T11: Tela do Pós-Curso lê pelo repositório ✅

**What**: mesma troca da T8, no Server Component do pós-curso.
**Where**: `src/app/(protegido)/pos-cursos/[cdCurso]/page.tsx`
**Depends on**: T10
**Reuses**: padrão fechado na T8
**Requirement**: RESP-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Prop do formulário idêntica; componente cliente intocado
- [x] e2e da tela passa sem alterar asserção
- [x] Gate check passes: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` (0 erros de lint, build ok, typecheck ok, 580 unit, 49 integration, 244 e2e em 23.2min)

**Tests**: e2e
**Gate**: build

**Commit**: `refactor(pos-cursos): ler respostas por linhas na tela`

---

### T12: PATCH da Avaliação lê e grava por linhas ✅

**What**: mesma troca da T6, na rota da avaliação - incluindo o gate de Parte 1, que passa a ser avaliado sobre o objeto remontado.
**Where**: `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts`
**Depends on**: T11
**Reuses**: `src/lib/avaliacao/completude.ts` (`validarCompletudeParte1`, inalterado)
**Requirement**: RESP-10, RESP-01, RESP-03, RESP-09, RESP-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Chave de Parte 2 com Parte 1 incompleta continua devolvendo 400 e **não grava nenhuma linha do patch**, nem as chaves de Parte 1 enviadas junto (RESP-10) - o gate roda antes de `$transaction`, então não há gravação a reverter
- [x] `parte1Completa` continua recalculado sobre o estado resultante, na mesma transação
- [x] Merge raso, 409 de encerrado e 400 de Zod inalterados
- [x] e2e de `avaliacoes-id` passa sem alterar asserção, incluindo o caso de preservação de resposta condicional já salva
- [x] Gate check passes (Alvo): `npm run test:unit && npm run test:integration` (580 unit, 49 integration) + `npm run test:e2e -- e2e/avaliacoes-id.spec.ts` (15/15, servidor fresco do Playwright)

**Tests**: e2e
**Gate**: alvo

**Commit**: `refactor(avaliacoes): gravar respostas por linhas no PATCH`

---

### T13: Encerramento da Avaliação apaga órfãs por linha ✅

**What**: mesma troca da T7, na rota de encerramento da avaliação.
**Where**: `src/app/api/avaliacoes/[cpf]/[cdCurso]/encerrar/route.ts`
**Depends on**: T12
**Reuses**: `src/lib/avaliacao/condicionais.ts` (inalterado)
**Requirement**: RESP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] As 22 chaves condicionais a "concluiu o curso" somem como linhas quando não se aplicam (RESP-08)
- [x] e2e de `avaliacoes-encerrar` passa sem alterar asserção
- [x] Gate check passes (Alvo): `npm run test:unit && npm run test:integration` (580 unit, 49 integration) + `npm run test:e2e -- e2e/avaliacoes-encerrar.spec.ts` (8/8, servidor fresco do Playwright)

**Tests**: e2e
**Gate**: alvo

**Commit**: `refactor(avaliacoes): descartar condicional orfa por linha no encerramento`

---

### T14: Tela da Avaliação lê pelo repositório ✅

**What**: mesma troca da T8, no Server Component da avaliação.
**Where**: `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/page.tsx`
**Depends on**: T13
**Reuses**: padrão fechado na T8
**Requirement**: RESP-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Prop do formulário idêntica; componente cliente intocado
- [x] e2e da tela passa sem alterar asserção
- [x] Gate check passes: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` (0 erros de lint, build ok, typecheck ok, 580 unit, 49 integration, 244 e2e em 20.7min)

**Tests**: e2e
**Gate**: build

**Commit**: `refactor(avaliacoes): ler respostas por linhas na tela`

---

### T19: Helpers de leitura e2e remontam respostas por linha ✅

**What**: as funções de leitura usadas pelas fixtures (`getPreCurso`, `getPosCurso`, `getAvaliacao`) passam a montar o campo `respostas` a partir das linhas, em vez de devolver a coluna JSON.
**Where**: `scripts/e2e-fixture.ts`
**Depends on**: T14
**Reuses**: `lerRespostas` de `src/lib/respostas/repositorio.ts`
**Requirement**: RESP-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `getPreCurso`, `getPosCurso` e `getAvaliacao` montam `respostas` por `lerRespostas`, sem ler a coluna JSON
- [x] Registro sem nenhuma linha devolve `respostas: null`, não `{}` - é o que a coluna devolvia, e o que os specs de criação afirmam (`expect(persistido?.respostas).toBeNull()`)
- [x] Executada **antes** da T15 de propósito: com o espelho ainda ligado, linhas e coluna concordam, então a troca é comportamentalmente neutra e a suíte segue verde
- [x] Nenhuma asserção de teste existente alterada - em especial as de `pre-cursos-encerrar.spec.ts` (`expect(respostas).not.toHaveProperty(...)`), que provam o descarte de condicional órfã lendo este campo
- [x] Gate check passes (Alvo): `npm run test:unit && npm run test:integration` (580 unit, 49 integration) + os 9 specs que leem `respostas` por estes helpers (`pre-cursos{,-id,-encerrar}`, `pos-cursos{,-id,-encerrar}`, `avaliacoes{,-id,-encerrar}`): 82/82, servidor fresco do Playwright

**Tests**: none
**Gate**: alvo

**Commit**: `test(respostas): ler respostas por linha nos helpers e2e`

---

### T15: Remover o espelho do JSON do repositório ✅

**What**: o repositório para de escrever na coluna `Respostas`; as linhas passam a ser a única fonte.
**Where**: `src/lib/respostas/repositorio.ts`
**Depends on**: T19
**Reuses**: -
**Requirement**: RESP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhuma escrita na coluna `Respostas` resta no código (`grep -rn "respostas:" src/app src/lib` só encontra o objeto em memória)
- [x] Comentário transitório da T3 removido junto
- [x] Teste de integração do repositório continua verde sem afrouxar asserção. Um teste foi APOSENTADO, não afrouxado: `"mantém a coluna JSON em sincronia com as linhas"` afirmava exatamente o espelho que esta tarefa remove, e o comentário dele (escrito na T3) já previa a remoção aqui. Integração vai de 49 para 48
- [x] Gate check passes (Alvo): 580 unit, 48 integration, e 85 e2e nos 11 specs de formulário e de leitura de respostas

**Tests**: integration
**Gate**: alvo

**Commit**: `refactor(respostas): parar de espelhar a coluna JSON`

---

### T16: Dropar a coluna `Respostas` dos três modelos ✅

**What**: remoção do campo `respostas Json?` dos três modelos Prisma, com a migration correspondente.
**Where**: `prisma/schema.prisma`
**Depends on**: T15
**Reuses**: -
**Requirement**: RESP-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `respostas Json?` não existe mais em `PreCurso`, `PosCurso` nem `AvaliacaoAluno`
- [x] Migration de drop gerada e commitada, **posterior** à de backfill na ordem de execução (`20260910082855_criar_tabelas_resposta` → `20260910091216_backfill_respostas` → `20260910222847_remover_coluna_respostas`)
- [x] Demais colunas dos três modelos intactas (RESP-15)
- [x] Gate check passes: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**SCOPE_DEVIATION**: a tarefa previa só schema + migration. Dropar a coluna quebrou o
contrato HTTP: as rotas devolviam `respostas` porque era campo do registro Prisma, e
passaram a devolver `undefined` — 13 specs e2e vermelhas. O conserto entrou nesta mesma
tarefa (as rotas remontam `respostas` das linhas, via `lerRespostasParaApi` /
`montarRespostas` + `respostasOuNulo`), porque um drop que deixa a API quebrada não é uma
tarefa concluída. Nenhuma asserção de teste foi alterada, que é o que a RESP-07..12 exige.
Reason: a T13/T14 converteram rotas e telas para LER por linha, mas o corpo da resposta
HTTP ainda vinha do registro Prisma — a dependência da coluna era invisível enquanto ela
existia.

**Tests**: none
**Gate**: build

**Commit**: `feat(respostas)!: remover a coluna JSON de respostas`

---

### T17: Prova de agregação por pergunta ✅

**What**: teste de integração que agrega respostas por pergunta e valor, provando que a consulta não usa função de JSON e passa pelo índice.
**Where**: `src/lib/respostas/agregacao.integration.test.ts`
**Depends on**: T16
**Reuses**: fixtures de integração já existentes
**Requirement**: RESP-17, RESP-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Semeia respostas de 4 alunos do mesmo curso e afirma a contagem correta por opção (RESP-17) — escalar (Sim 3 / Não 1), seleção múltipla (uma linha por opção, 5 seleções de 4 alunos) e escopo por curso sem vazamento entre cursos
- [x] Afirma que o plano de execução da consulta usa o índice de `chave` (RESP-18), nas três tabelas
- [x] Nenhuma função de JSON no `WHERE` nem no `GROUP BY` — mais: um teste afirma via `information_schema` que não sobrou nenhuma coluna JSON nos três formulários para uma consulta poder recair nelas
- [x] Gate check passes (Alvo): `npm run test:unit` (580) `&& npm run test:integration` (56, +7). Sem arquivo e2e nesta tarefa.

**SPEC_DEVIATION**: a asserção da RESP-18 é sobre `possible_keys`, não sobre `key`.
Com a tabela de teste pequena o otimizador do MySQL pode preferir varredura completa, e o
que a RESP-18 exige ("manter um índice que cubra a busca por chave") é que o índice exista
e sirva à consulta. Reason: asserção em `key` seria flaky por heurística de cardinalidade;
a discriminação foi verificada — coluna sem índice devolve `possible_keys` NULL, então
derrubar o índice quebra o teste.

**Tests**: integration
**Gate**: alvo

**Commit**: `test(respostas): provar agregacao por pergunta com indice`

---

### T18: Registrar AD-041 e retificar as specs afetadas

**What**: a AD nova que rescinde o AD-034, com o trade-off registrado, e o Handoff atualizado.
**Where**: `.specs/STATE.md`
**Depends on**: T17
**Reuses**: precedente do AD-040 (mesma sessão)
**Requirement**: RESP-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] AD-041 declara a normalização, cita as três tabelas e registra o custo aceito (perda da imunidade a troca de questionário, `.specs/STATE.md:47`)
- [ ] AD-034 marcado como superado por AD-041
- [ ] As linhas de assumption dos três `spec.md` afetados (`formulario-pre-curso`, `formulario-pos-curso`, `avaliacao-aluno`) deixam de afirmar armazenamento em JSON
- [ ] Handoff atualizado com o estado desta feature
- [ ] Gate check passes: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: none
**Gate**: build

**Commit**: `docs(respostas): registrar AD-041 e retificar as specs`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5
Phase 3:  T6 ------→ T7 ------→ T8
Phase 4:  T9 ------→ T10 -----→ T11
Phase 5:  T12 -----→ T13 -----→ T14
Phase 6:  T19 -----→ T15 -----→ T16 -----→ T17 -----→ T18
```

Execução é estritamente sequencial - não há paralelismo dentro da fase.

**Empacotamento previsto:** 19 tarefas, orçamento de ~7 por worker, cortando só em fronteira de fase → **3 batches** (Fases 1-2 = 5 tarefas; Fases 3-4 = 6 tarefas; Fases 5-6 = 8 tarefas). Como isso passa de um batch, o Execute **precisa** apresentar a oferta de sub-agentes antes de começar.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Classificador de forma | 1 módulo | ✅ Granular |
| T2: Três tabelas no schema | 1 arquivo de schema | ✅ Granular |
| T3: Repositório | 1 módulo | ✅ Granular |
| T4: Migration de backfill | 1 migration | ✅ Granular |
| T5: Fixtures e2e | 1 arquivo de helper | ✅ Granular |
| T6/T9/T12: PATCH por formulário | 1 rota cada | ✅ Granular |
| T7/T10/T13: Encerrar por formulário | 1 rota cada | ✅ Granular |
| T8/T11/T14: Tela por formulário | 1 Server Component cada | ✅ Granular |
| T19: Helpers de leitura e2e | 1 arquivo de fixture | ✅ Granular |
| T15: Remover espelho | 1 módulo | ✅ Granular |
| T16: Dropar coluna | 1 arquivo de schema | ✅ Granular |
| T17: Prova de agregação | 1 arquivo de teste | ✅ Granular |
| T18: AD-041 e retificações | 1 arquivo de memória + specs citadas | ⚠️ Coeso: uma decisão só, propagada |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | (início da Fase 1) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | Fase 1 → Fase 2, início | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | Fase 2 → Fase 3, início | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | Fase 3 → Fase 4, início | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | Fase 4 → Fase 5, início | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T19 | T14 | Fase 5 → Fase 6, início | ✅ Match |
| T15 | T19 | T19 → T15 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Tarefa diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Lógica de domínio | unit | unit | ✅ OK |
| T2 | Schema Prisma | none | none | ✅ OK |
| T3 | Acesso a dados | integration | integration | ✅ OK |
| T4 | Migration com comportamento de dados | integration | integration | ✅ OK |
| T5 | Infra de teste | none | none | ✅ OK |
| T6 | Rota API | e2e | e2e | ✅ OK |
| T7 | Rota API | e2e | e2e | ✅ OK |
| T8 | Tela | e2e | e2e | ✅ OK |
| T9 | Rota API | e2e | e2e | ✅ OK |
| T10 | Rota API | e2e | e2e | ✅ OK |
| T11 | Tela | e2e | e2e | ✅ OK |
| T12 | Rota API | e2e | e2e | ✅ OK |
| T13 | Rota API | e2e | e2e | ✅ OK |
| T14 | Tela | e2e | e2e | ✅ OK |
| T19 | Infra de teste | none | none | ✅ OK |
| T15 | Acesso a dados | integration | integration | ✅ OK |
| T16 | Schema Prisma | none | none | ✅ OK |
| T17 | Acesso a dados | integration | integration | ✅ OK |
| T18 | Documentação | none | none | ✅ OK |
