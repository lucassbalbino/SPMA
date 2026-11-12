# Revisão de Usabilidade 1 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/revisao-usabilidade-1/design.md`
**Status**: In Progress

**Branch**: `feat/revisao-usabilidade-1`, a partir da `main`. Push na `main` = deploy (AD-047): nada sai do local sem ordem explícita.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (convenções visuais AD-039, sem regra de teste), `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, memória do projeto `feedback_test_scope` (camada mais barata que prova o AC; não inflar e2e). Lições confirmadas: L-014 (afirmar cada parte de um critério composto), L-030 (afirmar cada fato visível pelo texto, não só pelo testid).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Funções puras (`nomeDaFormacao`, telefone, ordem de datas, `validado`) | unit | Todos os ramos; 1:1 com os ACs; edge cases do spec | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Schemas Zod | unit | Mensagem exata de cada regra nova | `src/lib/validation/schemas/*.test.ts` | `npm run test:unit` |
| Exclusões (`excluirCurso`, `excluirAluno`) | integration | Caminho feliz + cada "filho" que bloqueia + nada apagado no 409 + saldo | `src/lib/**/*.integration.test.ts` | `npm run test:integration` |
| Rotas novas | e2e (request) | 200 + cada 4xx do spec | `e2e/*.spec.ts` | `npx playwright test <spec>` |
| Telas | e2e | Um teste por AC visível novo; asserções de texto antigas atualizadas, não apagadas | `e2e/*.spec.ts` | `npx playwright test <spec>` |
| Primitivo de UI (`alert-dialog`) | none | build gate; coberto pelo uso em T12 | - | build gate only |
| Documentação | none | build gate only | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefas só com testes unitários | `npm run typecheck && npm run test:unit` |
| Full | Tarefas com testes de integração | `npm run db:test:reset && npm run test:unit && npm run test:integration` |
| E2E | Tarefas de tela ou rota | `npm run typecheck && npm run test:unit && npx playwright test <specs da task>` |
| Build | Fim de cada fase e T31 | `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e` |

---

## Execution Plan

Ordem por risco: primeiro o bug e as mensagens (P1, só cliente), depois nomes, conclusão e as duas exclusões (P1, as únicas que apagam dado), por fim textos, datas, telefone e perfil (P2).

### Phase 1: Bug de pendências e mensagens

```
T1
T2 → T3
T4 → T5
```

### Phase 2: Nome no lugar do código

```
T32
T6 → T7
T6 → T8
T9
T10
```

### Phase 3: Concluir com confirmação

```
T11 → T12
```

### Phase 4: Excluir formação

```
T13 → T14 → T15
T11 → T15
```

### Phase 5: Excluir aluno

```
T16 → T17 → T18
T11 → T18
```

### Phase 6: Termos do cliente

```
T19 → T20
T21
T22
```

### Phase 7: Datas, telefone e valor previsto

```
T23
T24 → T25
T26
```

### Phase 8: Editar Perfil

```
T24 → T27 → T29
T24 → T28 → T29
T29 → T30
T19 → T30
```

### Phase 9: Fechamento

```
T31
```

### Phase 10: Correções da validação (iteração 1)

```
T33
T34
T35
T36
```

---

## Task Breakdown

### T1: Pendências somem ao salvar; Concluir bloqueado sem salvar

**What**: `salvarRascunho` limpa `pendentes` e expõe "Alterações salvas."; `encerrar` com `alterados` não vazio mostra "Salve antes de concluir." e não chama a API.
**Where**: `src/components/formulario/useFormularioRespostas.ts`
**Depends on**: None
**Reuses**: estado `alterados` do próprio hook
**Requirement**: RU-01, RU-02, RU-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `CascaFormulario` mostra "Alterações salvas." após 2xx (prop nova `mensagem`, `data-testid` `salvo-<sufixo>`)
- [x] e2e em `e2e/pos-cursos-formulario.spec.ts`: concluir com a 26 vazia → pendência; marcar a 26 e concluir sem salvar → "Salve antes de concluir.", status segue "Em andamento" e nenhum POST de conclusão sai (reproduz o doc 12)
- [x] e2e: após "Salvar" com sucesso, `lista-pendencias` tem contagem 0 e "Alterações salvas." visível (L-014: as duas metades); o Concluir seguinte conclui
- [x] Gate E2E passa: `npx playwright test e2e/pos-cursos-formulario.spec.ts`

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `fix(formulario): clear stale pending list and block closing with unsaved changes`

---

### T2: Zod em português e `campo` no 400

**What**: `validado` devolve `{ erro, campo }` (campo = `issues[0].path[0]` quando string); módulo `src/lib/validation/zod-pt.ts` chama `z.config(z.locales.pt())` e é importado pelos schemas de questionário.
**Where**: `src/lib/api/requisicao.ts`
**Depends on**: None
**Reuses**: `erroHttp` (extras no corpo, como `saldoDisponivel`)
**Requirement**: RU-04, RU-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/lib/api/requisicao.test.ts`: issue com path → corpo traz `campo`; sem path → sem `campo`; mensagem padrão sai em português
- [x] Nenhum teste existente compara mensagem padrão em inglês (conferido: zero ocorrências hoje)
- [x] Gate Quick passa

**Tests**: unit
**Gate**: quick
**Status**: Done

**Commit**: `feat(api): return the failing field and Portuguese zod messages`

---

### T3: Erro mostra o rótulo da pergunta

**What**: ao receber 400 com `campo`, o hook monta `<rotuloDaChave(campo)>: <erro>`.
**Where**: `src/components/formulario/useFormularioRespostas.ts`
**Depends on**: T2
**Reuses**: `rotuloDaChave` já passado a `CascaFormulario`
**Requirement**: RU-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e em `e2e/pre-cursos-formulario.spec.ts`: valor fora do limite na 18 (taxa > 100) mostra "18. Taxa de evasão esperada (%): <mensagem em pt>"
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(formulario): name the question in validation errors`

---

### T4: Mensagem do limite de 3 motivos

**What**: `.max(3, { message: "Selecione no máximo 3 motivos" })` na 17.
**Where**: `src/lib/validation/schemas/avaliacao.schema.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: RU-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `avaliacao.schema.test.ts`: 4 motivos → issue com a mensagem exata e path `avalMotivMotivosParticipacao`; 3 passa
- [x] Gate Quick passa

**Tests**: unit
**Gate**: quick
**Status**: Done

**Commit**: `fix(avaliacao): Portuguese message for the three-reason limit`

---

### T5: Teto de seleção na tela e aviso da Parte 1

**What**: `maxSelecoes` em `CampoDef`; `CampoResposta` desabilita as opções não marcadas ao atingir o teto; a 17 declara `maxSelecoes: 3`; aviso da Parte 2 com o texto de RU-09.
**Where**: `src/components/formulario/CampoResposta.tsx`
**Depends on**: T4
**Reuses**: `components/formulario/tipos.ts`, `AvaliacaoForm.tsx:430`
**Requirement**: RU-08, RU-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e em `e2e/avaliacoes-formulario.spec.ts`: com 3 marcados, as 3 restantes estão `disabled`; desmarcar uma reabilita
- [x] e2e: texto exato de RU-09 visível com Parte 1 incompleta
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(avaliacao): cap reason selection at three and explain how to unlock part 2`

---

### T6: `nomeDaFormacao`

**What**: função pura de RU-10.
**Where**: `src/lib/cursos/nome.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: RU-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `nome.test.ts`: P8 preenchida, com espaços nas pontas, só espaços, `""`, `null`, `undefined`
- [x] Gate Quick passa

**Tests**: unit
**Gate**: quick
**Status**: Done

**Commit**: `feat(cursos): course display name from question 8`

---

### T7: Listas mostram o nome

**What**: as listas de Cadastro de Formação, Avaliação de Formação e Avaliações Aluno leem a P8 (`curso.preCurso` com `p8`) e mostram `nomeDaFormacao`.
**Where**: `src/app/(protegido)/pre-cursos/page.tsx`
**Depends on**: T6
**Reuses**: mesmas consultas escopadas; também `pos-cursos/page.tsx` e `avaliacoes/page.tsx` (mesma troca de uma linha)
**Requirement**: RU-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `pre-cursos-page`, `pos-cursos-page`, `avaliacoes-page`: nome visível e `#<cdCurso>` ausente; formação sem P8 mostra `Formação sem nome (nº X)` (L-030: texto, não só testid)
- [x] Nenhuma lista devolve colunas `P*` além da P8 do pré
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(cursos): list courses by name instead of number`

---

### T8: Títulos com o nome

**What**: títulos de RU-12, RU-13 (incluindo o aviso "aguardando") e RU-14; a página passa `nome` ao formulário.
**Where**: `src/app/(protegido)/pre-cursos/[id]/page.tsx`
**Depends on**: T6
**Reuses**: idem em `pos-cursos/[cdCurso]/page.tsx` e `avaliacoes/[cpf]/[cdCurso]/page.tsx`; `CascaFormulario.titulo`
**Requirement**: RU-12, RU-13, RU-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `pre-cursos-formulario`, `pos-cursos-formulario`, `avaliacoes-formulario`: cada título exato (os specs `*-id` são de API, sem tela)
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(cursos): course name in form titles`

---

### T9: Seletor que mostra o recurso escolhido

**What**: `NovoCursoForm` passa `items` ao `Select`; opção e campo fechado mostram `<nome> — saldo R$ x` (com o nome do ofertante para AM), sem `#n`.
**Where**: `src/app/(protegido)/cursos/novo/NovoCursoForm.tsx`
**Depends on**: None
**Reuses**: `items` de `SelectRoot` (`node_modules/@base-ui/react/select/root/SelectRoot.d.ts:111`)
**Requirement**: RU-15, RU-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `cursos-novo`: após escolher, o campo fechado mostra o texto da opção e não o número; nenhuma opção contém `#`
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `fix(cursos): show the chosen resource name in the selector`

---

### T10: Lista de recursos sem número

**What**: `ListaVerbas` mostra só `dsVerba` no lugar de `#n · nome`.
**Where**: `src/app/(protegido)/verbas/ListaVerbas.tsx`
**Depends on**: None
**Reuses**: -
**Requirement**: RU-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `verbas-page`: nome visível, `#<cdVerba>` ausente; asserções antigas de `#n ·` atualizadas
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(verbas): list resources by name`

---

### T32: Nome obrigatório ao criar a formação

**What**: `criarCursoSchema` ganha `nome` (`trim`, `min(1)`, mensagem de RU-57); "Nova Formação" ganha o campo "Nome da formação" no topo; `POST /api/cursos` grava `p8: nome` no `preCurso.create` da mesma transação; `qualifNomeCurso` passa a `.trim().min(1)` com a mesma mensagem.
**Where**: `src/app/api/cursos/route.ts`
**Depends on**: None
**Reuses**: `criarCursoSchema` (`pre-curso.schema.ts:6`), `NovoCursoForm.tsx`, transação existente em `api/cursos/route.ts`
**Requirement**: RU-57, RU-58, RU-59

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pre-curso.schema.test.ts`: `nome` ausente, `""` e `"   "` recusados com a mensagem exata; `"  Mecânica  "` vira `"Mecânica"`; `qualifNomeCurso: "  "` recusado
- [x] e2e `cursos-novo`: criar com nome → o Cadastro de Formação abre com a pergunta 8 preenchida (L-014: criação + estado); sem nome → mensagem e nenhuma formação nova; request sem `nome` → 400
- [x] e2e `pre-cursos-id`: `PATCH` com a 8 em branco → 400 com `campo: "qualifNomeCurso"`
- [x] Helpers e2e que criam curso por request passam a mandar `nome`
- [x] Gate E2E passa

**Tests**: unit, e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(cursos): require a name when creating a course`

---

### T11: Diálogo de confirmação

**What**: primitivo `alert-dialog` (shadcn sobre `@base-ui/react/alert-dialog`) com tokens de `globals.css`, e `ConfirmarAcao` (botão + diálogo com "Sim"/"Não").
**Where**: `src/components/ui/alert-dialog.tsx`
**Depends on**: None
**Reuses**: padrão dos primitivos em `src/components/ui/`; `ConfirmarAcao` em `src/components/formulario/ConfirmarAcao.tsx`
**Requirement**: RU-18, RU-22, RU-29

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhuma cor literal no `.tsx` (AD-039)
- [x] Gate Build passa

**Tests**: none
**Gate**: build
**Status**: Done

**Commit**: `feat(ui): confirmation dialog`

---

### T12: Concluir, confirmação, aviso e "Concluído"

**What**: `CascaFormulario` troca o botão "Encerrar" por "Concluir" via `ConfirmarAcao` com o texto de RU-18 e mostra o aviso de RU-20. O status continua "Encerrado".
**Where**: `src/components/formulario/CascaFormulario.tsx`
**Depends on**: T11
**Reuses**: `ConfirmarAcao`
**Requirement**: RU-17, RU-18, RU-19, RU-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `*-formulario` (3 specs): seletores `name: "Encerrar"` → `"Concluir"` + clique em "Sim"; as asserções `toHaveText("Encerrado")` ficam como estão
- [x] e2e novo: "Não" mantém "Em andamento" e nenhuma requisição de conclusão sai
- [x] e2e: aviso visível quando editável e ausente em somente leitura
- [x] Gate E2E passa nos 3 specs

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(formulario): confirm before closing and warn there is no autosave`

---

### T13: `excluirCurso`

**What**: exclusão transacional com as regras de RU-23 a RU-27.
**Where**: `src/lib/cursos/exclusao.ts`
**Depends on**: None
**Reuses**: `podeGerenciarPreCurso`, `erroHttp`, `calcularSaldoVerba` (no teste)
**Requirement**: RU-23, RU-24, RU-25, RU-26, RU-27

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `exclusao.integration.test.ts`: some curso, pré e pós; saldo volta ao valor anterior à criação; com 1 avaliação → 409 e as 3 linhas continuam; pré concluído → 409 e nada some; GO de outro ofertante → 403; inexistente → 404
- [x] Gate Full passa

**Tests**: integration
**Gate**: full
**Status**: Done

**Commit**: `feat(cursos): delete a course without students`

---

### T14: `DELETE /api/cursos/[cdCurso]`

**What**: rota fina sobre `excluirCurso`.
**Where**: `src/app/api/cursos/[cdCurso]/route.ts`
**Depends on**: T13
**Reuses**: `exigirMutacao`, `idPositivo`, `comTratamentoDeErro`
**Requirement**: RU-23, RU-25, RU-26, RU-27

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e request no spec novo `e2e/cursos-excluir.spec.ts`: 200, 409 com aluno, 409 concluído, 403, 404, sem CSRF → recusado
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(api): DELETE /api/cursos/[cdCurso]`

---

### T15: Botão Excluir no Cadastro de Formação

**What**: `PreCursoForm` mostra "Excluir" (RU-21) com a confirmação de RU-22; sucesso leva a `/pre-cursos`; 409 mostra a mensagem.
**Where**: `src/app/(protegido)/pre-cursos/[id]/PreCursoForm.tsx`
**Depends on**: T14, T11
**Reuses**: `ConfirmarAcao`, prop opcional de ação extra em `CascaFormulario`
**Requirement**: RU-21, RU-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `pre-cursos-formulario`: excluir formação sem aluno → volta à lista e ela some; com aluno → mensagem de RU-25 e continua; botão ausente em concluído e para VO
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(pre-curso): delete button on the course form`

---

### T16: `excluirAluno`

**What**: exclusão transacional com a regra de "dados" de RU-31.
**Where**: `src/lib/usuarios/gestao.ts`
**Depends on**: None
**Reuses**: `lerRespostas` (avaliação tem resposta?), padrão de `atualizarCadastro`
**Requirement**: RU-30, RU-31, RU-32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `excluir-aluno.integration.test.ts` (arquivo próprio: os índices de documento de `gestao.integration.test.ts` já estão em uso): aluno só com matrícula vazia → some usuário, matrícula e sessões; com dado pessoal → 409; com uma resposta gravada → 409; com avaliação concluída → 409; em todo 409 nada some; alvo GO → 400
- [x] Gate Full passa

**Tests**: integration
**Gate**: full
**Status**: Done

**Commit**: `feat(usuarios): delete a student with no answers`

---

### T17: `POST /api/usuarios/excluir`

**What**: rota fina com o documento no corpo (AD-029, GU-48, como o reset de senha); alvo e autoridade por `exigirAlvoEditavel` (403; 404 só para o AM).
**Where**: `src/app/api/usuarios/excluir/route.ts`
**Depends on**: T16
**Reuses**: `exigirMutacao`, `exigirAlvoEditavel`, `resetarSenhaSchema` (mesmo corpo `{ documento }`)
**Requirement**: RU-30, RU-31, RU-32, RU-33

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e request em `e2e/usuarios-gestao.spec.ts`: 200, 409, 400 não-aluno, 403 fora do escopo, 404 para AM com alvo inexistente, sem CSRF → recusado
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(api): add the student delete route`

---

### T18: Botão Excluir na linha do aluno

**What**: `LinhaUsuario` mostra "Excluir" só para alvo AL em edição, com a confirmação; sucesso recarrega a lista.
**Where**: `src/app/(protegido)/usuarios/LinhaUsuario.tsx`
**Depends on**: T17, T11
**Reuses**: `ConfirmarAcao`
**Requirement**: RU-28, RU-29

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `usuarios-page` (é o spec da tela; `usuarios-gestao` é de API): excluir aluno vazio → some da lista; aluno com dados → mensagem de RU-31; botão ausente na linha de outro perfil
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(usuarios): delete button for students`

---

### T19: Rótulos de menu e módulos

**What**: rótulos de RU-35 e RU-36 em `MODULOS_POR_PERFIL` e nos itens (sem "Editar Perfil", que entra em T30).
**Where**: `src/lib/ui/navegacao.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: RU-35, RU-36

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `navegacao.test.ts` com os rótulos novos por perfil
- [x] e2e `identidade-visual`, `pre-cursos-page` e afins: seletores por nome de link atualizados
- [x] Gate E2E passa

**Tests**: unit, e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(ui): client terminology in menu and modules`

---

### T20: Painel por extenso

**What**: textos de RU-34 com `NOME_TIPO_USUARIO`.
**Where**: `src/app/(protegido)/painel/page.tsx`
**Depends on**: T19
**Reuses**: `NOME_TIPO_USUARIO`, `modulosDoPerfil`
**Requirement**: RU-34

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `painel`: "Você está no perfil de Administrador Master" e "Portanto, está apto a realizar:"; asserção antiga `Perfil: AM` atualizada
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(painel): spell out the profile and its modules`

---

### T21: Títulos e botões das telas

**What**: "Recursos Recebidos"/"Recursos" (RU-37), "Usuários Cadastrados" (RU-38), "Nova Formação", "Criar formação", "Novo recurso", "Criar recurso", "Recurso", "Nome do recurso" no lugar de "Identificação" (RU-60), "Valor alocado à formação", estados vazios (RU-39, telas).
**Where**: `src/app/(protegido)/verbas/page.tsx`
**Depends on**: None
**Reuses**: também `GestaoUsuarios.tsx`, `cursos/novo/*`, `NovaVerbaForm.tsx`, `ListaVerbas.tsx`
**Requirement**: RU-37, RU-38, RU-39, RU-60

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `grep -rn "erba\|urso" src/app src/components --include=*.tsx` só encontra identificadores, nenhum texto visível
- [x] e2e `verbas-page` (GO vê "Recursos Recebidos", AM vê "Recursos"), `usuarios-page`, `cursos-novo` atualizados
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(ui): client terminology in screen titles and buttons`

---

### T22: Mensagens da API

**What**: as ~20 mensagens de `erroHttp` e `MENSAGEM_PRE_CURSO_EM_ANDAMENTO` com os termos de RU-39 ("Conclua o Cadastro de Formação antes de preencher a Avaliação de Formação", "Valor alocado excede o saldo disponível do recurso"...).
**Where**: `src/lib/pos-curso/liberacao.ts`
**Depends on**: None
**Reuses**: lista no levantamento do design; rotas em `src/app/api/**`
**Requirement**: RU-39

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Testes unit/integration/e2e que comparam essas mensagens atualizados (nenhum apagado)
- [x] Gate Build passa

**Tests**: unit, integration, e2e
**Gate**: build
**Status**: Done

**Commit**: `feat(api): client terminology in error messages`

---

### T23: Ordem das datas com a regra da inscrição

**What**: `violacaoOrdemDatas(dados): string | null` com as 3 regras e mensagens de RU-40..42; o `PATCH` só confere quando o corpo traz uma das 4 datas (RU-61); a conclusão confere sempre (RU-62).
**Where**: `src/lib/validation/schemas/pre-curso.schema.ts`
**Depends on**: None
**Reuses**: `ordemDatasValida` / `parEmOrdem` (substituídos), `api/pre-cursos/[id]/route.ts:73`
**Requirement**: RU-40, RU-41, RU-42, RU-61, RU-62

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pre-curso.schema.test.ts`: 17b < 13 passa; 17b = 13 e 17b > 13 recusam com RU-40; 13 ou 17b ausente não aplica; 14 < 13 → RU-41; 17c < 17b → RU-42
- [x] e2e `pre-cursos-id`: PATCH com 13 = 2026-10-14 e 17b = 2026-10-20 → 400 com a mensagem exata
- [x] e2e: com datas fora de ordem já gravadas (fixture direta no banco), PATCH de outra pergunta → 200; conclusão → 400 com a mensagem e status segue em andamento
- [x] Gate E2E passa

**Tests**: unit, e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(pre-curso): enrollment must start before the course`

---

### T24: Telefone com DDD

**What**: `src/lib/validation/telefone.ts` (dígitos, validade, máscara, `telefoneSchema`).
**Where**: `src/lib/validation/telefone.ts`
**Depends on**: None
**Reuses**: padrão de `mascara-documento.ts`
**Requirement**: RU-44, RU-45, RU-46

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `telefone.test.ts`: 10 e 11 dígitos válidos; 9 e 12 inválidos; DDD 10 e 00 inválidos; máscara parcial durante a digitação; schema devolve só dígitos
- [x] Gate Quick passa

**Tests**: unit
**Gate**: quick
**Status**: Done

**Commit**: `feat(validation): phone number with area code`

---

### T25: Telefone/WhatsApp no cadastro do ofertante

**What**: `organizacaoSchema.telefone` usa `telefoneSchema`; `CadastroOrganizacaoForm` com o rótulo de RU-43, máscara e `inputMode="tel"`.
**Where**: `src/lib/validation/schemas/organizacao.schema.ts`
**Depends on**: T24
**Reuses**: `telefoneSchema`, `mascaraTelefone`
**Requirement**: RU-43, RU-44, RU-45, RU-46

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `organizacao.schema.test.ts`: `999281374` (sem DDD, o caso do doc 2) recusado com a mensagem de RU-45
- [x] e2e `organizacao`/`cadastro-ofertante-page`: rótulo novo; valor gravado só com dígitos
- [x] Gate E2E passa

**Tests**: unit, e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(organizacao): phone/WhatsApp field with area code`

---

### T26: Valor previsto na pergunta 19

**What**: a página passa `vlCursoAlocado`; `PosCursoForm` mostra a dica de RU-55 sob a 19, formatada em BRL.
**Where**: `src/app/(protegido)/pos-cursos/[cdCurso]/PosCursoForm.tsx`
**Depends on**: None
**Reuses**: formatação de moeda de `ListaVerbas.tsx` (`moeda`)
**Requirement**: RU-55, RU-56

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `pos-cursos-formulario`: curso com R$ 60.000,00 alocado mostra "Estava previsto inicialmente R$ 60.000,00"; gravar a 19 com valor diferente passa
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(pos-curso): show the planned amount under question 19`

---

### T27: `PATCH /api/usuarios/me/perfil`

**What**: `perfilSchema` (nome, e-mail, telefone opcional; obrigatório para GO) e a rota sobre o usuário da sessão.
**Where**: `src/app/api/usuarios/me/perfil/route.ts`
**Depends on**: T24
**Reuses**: `dadosCadastraisSchema`, `telefoneSchema`, `exigirMutacao`
**Requirement**: RU-49, RU-50, RU-51, RU-52, RU-54

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Unit do schema: nome vazio, e-mail inválido, GO sem telefone
- [x] e2e request no spec novo `e2e/perfil.spec.ts`: 200 grava os 3 campos; 400 nada muda; GO sem telefone → 400; AL → 403; `documento` no corpo é ignorado e não altera outro usuário
- [x] Gate E2E passa

**Tests**: unit, e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(api): self-service profile update`

---

### T28: Telefone nos dados pessoais do Aluno

**What**: campo opcional de telefone no `DadosPessoaisForm` (modo perfil e onboarding) e gravação em `Usuario.telefone` pela rota de dados pessoais.
**Where**: `src/app/api/usuarios/me/dados-pessoais/route.ts`
**Depends on**: T24
**Reuses**: `telefoneSchema`; gravação de nome/e-mail já existente na rota
**Requirement**: RU-52

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `meus-dados`: aluno grava telefone com DDD; sem DDD → mensagem de RU-45; vazio continua aceito
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(dados-pessoais): optional phone for students`

---

### T29: Editar Perfil para todos os perfis

**What**: `/meus-dados` deixa de dar `notFound()` para não-AL e mostra `PerfilForm` (nome, e-mail, telefone) com o aviso de senha (RU-53, menos AM); AL segue no `DadosPessoaisForm`.
**Where**: `src/app/(protegido)/meus-dados/page.tsx`
**Depends on**: T27, T28
**Reuses**: `src/components/perfil/PerfilForm.tsx` (novo), padrão de `DadosCadastraisForm.tsx`
**Requirement**: RU-48, RU-52, RU-53

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e `meus-dados`: GT edita e vê o valor novo após recarregar; GO vê o aviso de senha; AM não vê; teste antigo "não-AL recebe 404" substituído pelo novo comportamento
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(perfil): edit own name, email and phone for every profile`

---

### T30: Item "Editar Perfil" no menu

**What**: item `Editar Perfil` (`/meus-dados`) no fim do menu e módulo "Editar Perfil" nos 6 perfis; o "Meus dados" do Aluno vira "Editar Perfil".
**Where**: `src/lib/ui/navegacao.ts`
**Depends on**: T29, T19
**Reuses**: `MEUS_DADOS`
**Requirement**: RU-47

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `navegacao.test.ts`: os 6 perfis têm o item; `ROTAS_COM_SESSAO` inalterado (a rota já existia)
- [x] e2e `identidade-visual`: listas de links por perfil atualizadas
- [x] Gate E2E passa

**Tests**: unit, e2e
**Gate**: e2e
**Status**: Done

**Commit**: `feat(ui): Editar Perfil in every profile menu`

---

### T31: AD-054 e nota de deploy

**What**: AD-054 em `.specs/STATE.md`; nota em `docs/DEPLOY_PRODUCAO.md`: sem migration; cadastros em andamento com 17b ≥ 13 gravam normalmente e só não concluem até corrigir as datas (consulta para contá-los).
**Where**: `.specs/STATE.md`
**Depends on**: None
**Reuses**: formato das AD-048 a AD-052
**Requirement**: RU-39, RU-61

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Traceability do spec com todos os RU implementados (passam a Verified após o Verifier)
- [x] Gate Build passa (suíte inteira)

**Tests**: none
**Gate**: build
**Status**: Done

**Commit**: `docs(revisao-usabilidade): record AD-054 and deploy note`

---

### T33: `campo` provado nas rotas da avaliação e do pós-curso (Fix 1)

**What**: e2e de request que afirmam o corpo `{ erro, campo }` do 400 nos `PATCH` da avaliação (4 motivos, o Independent Test da história) e do pós-curso.
**Where**: `e2e/avaliacoes-id.spec.ts`
**Depends on**: None
**Reuses**: helpers de request do próprio spec; idem em `e2e/pos-cursos-id.spec.ts`
**Requirement**: RU-05, RU-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Avaliação: 4 motivos → `toEqual({ erro: "Selecione no máximo 3 motivos", campo: "avalMotivMotivosParticipacao" })`, nada gravado
- [x] Pós-curso: valor fora do limite → `toEqual({ erro, campo })` com a chave
- [x] Gate E2E passa

**Tests**: e2e
**Gate**: e2e
**Status**: Done

**Commit**: `test(api): pin the failing field on the evaluation and post-course routes`

---

### T34: Telefone antigo exibido como gravado (Fix 2)

**What**: `PerfilForm` e `DadosPessoaisForm` abrem o telefone gravado sem máscara e só o enviam quando a pessoa o altera; `perfilSchema` e a rota do perfil tratam telefone ausente como "não mexer".
**Where**: `src/components/perfil/PerfilForm.tsx`
**Depends on**: None
**Reuses**: `telefoneOpcionalSchema`; mesmo padrão já usado na rota de dados pessoais
**Requirement**: RU-45, RU-49 (edge case de telefone antigo)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Unit: `perfilSchema` sem `telefone` não o devolve (fica `undefined`)
- [ ] e2e `meus-dados`: GT com telefone antigo `"(61) 3333-4444 ramal 2"` vê esse texto, troca só o nome, salva, e o telefone gravado não muda; o mesmo para o Aluno
- [ ] Gate E2E passa

**Tests**: unit, e2e
**Gate**: e2e

**Commit**: `fix(perfil): keep a legacy phone as stored unless it is edited`

---

### T35: "Olá, <nome>" afirmado no painel (Fix 3)

**What**: e2e do painel afirma a saudação com o nome.
**Where**: `e2e/painel.spec.ts`
**Depends on**: None
**Reuses**: teste RU-34 existente
**Requirement**: RU-34

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `toHaveText("Olá, <nome do GT>")`
- [ ] Gate E2E passa

**Tests**: e2e
**Gate**: e2e

**Commit**: `test(painel): assert the greeting with the user name`

---

### T36: Redação de RU-16 e RU-39 (Fix 4)

**What**: RU-16 passa a descrever o seletor (nome + saldo, e ofertante para o AM, sem número); RU-39 delimita o que é "mensagem visível" (fora: texto das perguntas, opções e cabeçalhos de parte dos questionários em papel, AD-035).
**Where**: `.specs/features/revisao-usabilidade-1/spec.md`
**Depends on**: None
**Reuses**: -
**Requirement**: RU-16, RU-39

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `validate_spec.py` sem erros

**Tests**: none
**Gate**: build

**Commit**: `docs(revisao-usabilidade): settle the wording of RU-16 and RU-39`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
```

As arestas de cada fase estão nos blocos de Execution Plan acima, inclusive as que vêm de fases anteriores (T11 → T15, T11 → T18, T24 → T27, T24 → T28, T19 → T30).

Execução sequencial. Lotes de ~7 tarefas por fases inteiras: Fases 1-2 (11), 3-4 (5), 5-6 (7), 7-8 (8), 9 (1).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1, T3 | 1 hook (+ prop de mensagem na casca) | ✅ |
| T2 | 1 função + 1 módulo de config | ⚠️ coeso |
| T7, T8 | mesma troca de 1 linha em 3 páginas | ⚠️ coeso, mesma regra |
| T21, T22 | troca de textos em vários arquivos | ⚠️ coeso: uma regra (RU-39), sem lógica |
| T29 | 1 página + 1 formulário novo | ⚠️ coeso |
| demais | 1 arquivo / 1 função / 1 rota | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | - | ✅ |
| T2 | None | - | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | None | - | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | None | - | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T6 | T6 → T8 | ✅ |
| T9 | None | - | ✅ |
| T10 | None | - | ✅ |
| T32 | None | - | ✅ |
| T33 | None | - | ✅ |
| T34 | None | - | ✅ |
| T35 | None | - | ✅ |
| T36 | None | - | ✅ |
| T11 | None | - | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | None | - | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14, T11 | T14 → T15; T11 na Fase 3 | ✅ |
| T16 | None | - | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17, T11 | T17 → T18; T11 na Fase 3 | ✅ |
| T19 | None | - | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | None | - | ✅ |
| T22 | None | - | ✅ |
| T23 | None | - | ✅ |
| T24 | None | - | ✅ |
| T25 | T24 | T24 → T25 | ✅ |
| T26 | None | - | ✅ |
| T27 | T24 | T24 → T27 (Fase 7) | ✅ |
| T28 | T24 | T24 → T28 (Fase 7) | ✅ |
| T29 | T27, T28 | T27 → T29, T28 → T29 | ✅ |
| T30 | T29, T19 | T29 → T30; T19 na Fase 6 | ✅ |
| T31 | None | - | ✅ |

Dependências entre fases (todas para trás) não aparecem nos diagramas de fase: T15 e T18 usam `ConfirmarAcao` (T11); T27 e T28 usam `telefoneSchema` (T24); T30 edita o arquivo de T19.

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1, T3, T5, T7, T8, T9, T10, T12, T15, T18, T20, T21, T26, T28, T29 | Telas | e2e | e2e | ✅ |
| T2, T6, T24 | Funções puras | unit | unit | ✅ |
| T4 | Schema | unit | unit | ✅ |
| T19, T23, T25, T27, T30, T32 | Função/schema + tela/rota | unit + e2e | unit, e2e | ✅ |
| T11 | Primitivo de UI | none | none | ✅ |
| T13, T16 | Exclusões | integration | integration | ✅ |
| T14, T17 | Rotas novas | e2e | e2e | ✅ |
| T22 | Mensagens em rotas (todas as camadas que as afirmam) | unit + integration + e2e | unit, integration, e2e | ✅ |
| T31 | Documentação | none | none | ✅ |
