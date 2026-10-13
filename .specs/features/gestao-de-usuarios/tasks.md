# Gestão de Usuários Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/gestao-de-usuarios/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerado a partir do código (amostragem de `src/lib/auth/guards.test.ts`, `src/lib/validation/schemas/usuario.schema.test.ts`, `src/lib/ui/navegacao.test.ts`, `src/lib/verba/saldo.integration.test.ts`, `src/lib/respostas/repositorio.integration.test.ts`, `e2e/usuarios.spec.ts`, `e2e/usuarios-novo-page.spec.ts`) e das diretrizes encontradas: `AGENTS.md` (convenções visuais e de navegação, sem regra de teste), `vitest.integration.config.ts` (`fileParallelism: false`, banco `spma_test` compartilhado), memória do usuário "testes enxutos, principalmente e2e", e a convenção do repositório (registrada em `onboarding-organizacional-go/tasks.md`): rotas de API são provadas por e2e, sem um `*.integration.test.ts` por rota. Lição confirmada L-014: afirmar todo conjunto de um critério com várias partes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regras puras (permissões, paginação, schemas Zod, navegação) | unit | 1:1 com os GU da tarefa; todo ramo e todo edge case listado que cai na camada | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Serviço com banco (`src/lib/usuarios/consulta.ts`, `gestao.ts`) | integration | Todo GU da tarefa contra o `spma_test` real; caminho feliz + cada erro (403/404/409/400); estado do banco lido depois de cada escrita, tabela a tabela (L-014). Fixtures com prefixo `GU-T` para isolar contagens | `src/lib/usuarios/*.integration.test.ts` | `npm run test:integration` |
| Rotas de API | e2e (API) | Só a ligação: contrato 200, CSRF ausente, um 403 de autorização, um 400 de forma, documento só no corpo. A lógica já está provada em integração; não repetir | `e2e/usuarios-gestao.spec.ts` | `npx playwright test e2e/usuarios-gestao.spec.ts` |
| Páginas e componentes cliente | e2e (UI) | Só os fluxos de tela que a feature cria ou muda, mais os testes existentes que a mudança força a ajustar | `e2e/usuarios-page.spec.ts` (+ ajustes pontuais nos specs que conferem `/usuarios/novo`) | `npx playwright test <specs da tarefa>` |

## Gate Check Commands

> `Full` roda só as specs e2e que a tarefa toca; o `Full-feature` (suíte inteira) é obrigatório na T13 e antes do Verifier. **Nunca** filtrar a saída do Playwright com pipe nem confiar só no exit code: conferir `test-results/.last-run.json` (`status` + `failedTests`). Verificar que a porta 3000 está livre antes de rodar e2e.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unit | `npm run typecheck && npm run test:unit` |
| Full | Tarefa com integration e/ou e2e | `npm run typecheck && npm run test:unit && npm run test:integration && npx playwright test <specs listadas na tarefa>` |
| Build | Fechamento de fase | `npm run lint && npm run build && npm run typecheck` |
| Full-feature (obrigatório em T13 e antes do Verifier) | Fechamento | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Regras puras

Sem banco, sem React. Base das fases seguintes.

```
T1
T2
T3
```

### Phase 2: Serviço com banco

Consulta escopada e paginada, guarda de alvo, escritas atômicas.

```
T4 → T5
T4 → T6 → T7
```

### Phase 3: Rotas de API

As três rotas, com o documento sempre no corpo.

```
T8 → T9 → T10
```

### Phase 4: Tela

Rota renomeada, lista paginada com filtros, edição inline.

```
T11 → T12 → T13
```

---

## Task Breakdown

### T1: `podeEditarUsuario`

**What**: Regra pura da matriz de edição (`podeCriar(editor.tipo, alvo.tipo) && alvo.documento !== editor.documento`), com JSDoc avisando que o escopo é responsabilidade da consulta, reexportada por `guards.ts` como as demais.
**Where**: `src/lib/auth/permissoes.ts` (mais uma linha na lista de reexport do `guards.ts`)
**Depends on**: None
**Reuses**: `podeCriar` (`src/lib/auth/cascata.ts`)
**Requirement**: GU-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `guards.test.ts` ganha um `describe("podeEditarUsuario")`: para cada um dos 6 tipos de editor x 6 tipos de alvo, o resultado é igual a `TIPOS_PERMITIDOS[editor].includes(alvo)` (tabela escrita à mão no teste, não derivada da constante); AM editando o próprio documento → `false`; AM editando outro AM → `true`
- [x] Gate Quick passa; nenhum teste existente removido

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): regra de quem edita quem na gestao de usuarios`

---

### T2: Paginação e chips (puros)

**What**: `TAMANHO_PAGINA = 20`, `totalPaginas(total)` e `tiposVisiveis(tipo)`.
**Where**: `src/lib/usuarios/paginacao.ts`
**Depends on**: None
**Reuses**: enum `TipoUsuario`
**Requirement**: GU-09, GU-13, GU-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `paginacao.test.ts`: `totalPaginas(0) = 1`, `(1) = 1`, `(20) = 1`, `(21) = 2`, `(40) = 2`, `(41) = 3`; `tiposVisiveis` → AM e GT: os 6 na ordem AM, GT, VT, GO, VO, AL; GO: `[VO, AL]`; VT, VO, AL: `[]`
- [x] Gate Quick passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(usuarios): paginacao e tipos visiveis da gestao de usuarios`

---

### T3: Schemas das três rotas

**What**: `consultaUsuariosSchema`, `edicaoUsuarioSchema` e `resetarSenhaSchema`, todos `.strict()`, com as normalizações do design.
**Where**: `src/lib/validation/schemas/gestao-usuario.schema.ts`
**Depends on**: None
**Reuses**: `normalizarDocumento` (`src/lib/validation/documento.ts`), padrão de `usuario.schema.ts`
**Requirement**: GU-17, GU-25, GU-26, GU-30, GU-44, GU-47

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `gestao-usuario.schema.test.ts`, consulta: aceita `{ pagina: 1 }`; rejeita `pagina` 0, -1, 1.5 e `"1"`; rejeita `tipo: "XX"`; aceita busca com 100 caracteres e rejeita com 101; rejeita chave extra (`cpf`)
- [ ] edição: aceita só `nome`; `email: ""` sai `null`; rejeita nome `""`, `"   "` e 256 caracteres; rejeita e-mail `"x@"`; rejeita sem `documentoAtual`; rejeita só com `documentoAtual` ("Nada para alterar"); rejeita `senha`, `tipo` e `cdOfertante` como chave extra; `documentoAtual: "529.982.247-25"` sai `"52998224725"`
- [ ] reset: aceita `{ documento }` com pontuação (sai só dígitos); rejeita corpo vazio e chave extra `senha`
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validacao): schemas de consulta, edicao e reset de usuario`

---

### T4: `whereUsuariosVisiveis` + `consultarUsuarios`

**What**: Escopo de usuários por perfil e consulta paginada (count + página, ordem `nome, documento`, filtro por tipo, busca por nome ou dígitos do documento, `editavel` por linha).
**Where**: `src/lib/usuarios/consulta.ts`
**Depends on**: None (T1 e T2 já concluídas pela ordem das fases)
**Reuses**: `resolverEscopoOfertante`, `podeEditarUsuario` (T1), `TAMANHO_PAGINA`/`totalPaginas` (T2), `normalizarDocumento`, `prisma`
**Requirement**: GU-04, GU-05, GU-06, GU-10, GU-11, GU-13, GU-16, GU-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `consulta.integration.test.ts` com fixtures de nome prefixado `GU-T`: dois GOs (A e B), cada um com 1 VO e 1 AL matriculado em curso seu, mais 1 AL sem matrícula e 1 GT
- [ ] GO A, sem filtro e com `busca: "GU-T"` → exatamente o VO de A e o AL de A (não vê B, o AL sem matrícula nem a si mesmo)
- [ ] GT com `busca: "GU-T"` → todos os fixtures; com `tipo: "AL"` → só os 3 ALs
- [ ] `whereUsuariosVisiveis` devolve `null` para VT, VO e AL
- [ ] Busca `"gu-t vo"` (minúsculas) acha os VOs; busca pelo CPF de um AL com pontuação acha só ele
- [ ] 25 fixtures `GU-T PAG nn` no escopo do GT: página 1 → 20 itens, página 2 → 5, `total` 25, `totalPaginas` 2; dois fixtures com o mesmo nome saem na ordem do documento; página 3 → `usuarios: []` com `total` 25
- [ ] `editavel` é `true` para um VO visto pelo GO A e `false` para a linha do próprio GT visto por ele mesmo
- [ ] Gate Full passa (sem e2e nesta tarefa)

**Tests**: integration
**Gate**: full

**Commit**: `feat(usuarios): consulta escopada e paginada de usuarios`

---

### T5: `buscarUsuarioVisivel` + `exigirAlvoEditavel`

**What**: Guarda de alvo das mutações: 404/403 conforme o perfil, 403 fora da matriz e na auto-edição.
**Where**: `src/lib/usuarios/consulta.ts`
**Depends on**: T4
**Reuses**: `whereUsuariosVisiveis`, `podeEditarUsuario`, `erroHttp`
**Requirement**: GU-27, GU-28, GU-43

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Em `consulta.integration.test.ts`: GO A → VO de A devolve o alvo; VO de B lança 403 com a mensagem de GU-27; documento inexistente lança 403 (não 404)
- [ ] GT → AM existente lança 403 (fora da matriz); inexistente lança 404 "Usuário não encontrado"; o próprio GT lança 403
- [ ] AM → GT devolve o alvo
- [ ] Cada asserção de erro confere status **e** mensagem
- [ ] Gate Full passa

**Tests**: integration
**Gate**: full

**Commit**: `feat(usuarios): guarda de alvo editavel`

---

### T6: `atualizarCadastro` (nome, e-mail e troca de documento)

**What**: `validarDocumentoDoTipo` e `atualizarCadastro` com a transação soltar → trocar → religar → apagar sessões, 409 prévio e por `P2002`.
**Where**: `src/lib/usuarios/gestao.ts`
**Depends on**: T4
**Reuses**: `validarCPF`/`validarCNPJ`/`normalizarDocumento`, `erroHttp`, `prisma.$transaction`
**Requirement**: GU-24, GU-32, GU-33, GU-34, GU-35, GU-36, GU-37, GU-38, GU-39

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `gestao.integration.test.ts`: só nome/e-mail → gravados; a sessão do alvo continua existindo
- [ ] Troca de CNPJ de um GO que **criou** um VO (`criadoPor`) e tem esse VO vinculado (`cdOfertante`), com verba, pré-curso (ofertante + autor), pós-curso e sessão: depois da troca, cada um desses registros aponta para o CNPJ novo, há zero linhas com o antigo em cada tabela, e há zero sessões do alvo
- [ ] Troca de CPF de um AL com avaliação, resposta de avaliação e dado pessoal: as três tabelas apontam para o CPF novo; `senhaHash`, `primeiraVez`, `tipo`, `criadoPor` e `dataCriacao` são idênticos aos de antes
- [ ] Documento novo já existente → 409 "Documento já cadastrado" e nada mudou (alvo e filhos lidos de novo)
- [ ] CPF inválido para AL → 400 "CPF inválido"; CPF (11 dígitos válidos) para GO → 400 "CNPJ inválido"
- [ ] Mesmo documento com pontuação → tratado como sem troca; a sessão continua existindo
- [ ] `P2002` simulado (spy no `tx.usuario.update` lançando um `PrismaClientKnownRequestError` P2002) → 409 e rollback (os filhos soltos voltam ao documento antigo)
- [ ] Gate Full passa

**Tests**: integration
**Gate**: full

**Commit**: `feat(usuarios): corrigir cadastro e trocar documento com propagacao`

---

### T7: `resetarSenha`

**What**: Volta o alvo ao estado de 1º acesso e apaga as sessões dele, atomicamente.
**Where**: `src/lib/usuarios/gestao.ts`
**Depends on**: T6
**Reuses**: `prisma.$transaction`
**Requirement**: GU-41, GU-42

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Em `gestao.integration.test.ts`: usuário com senha, `primeiraVez: false`, 3 tentativas, `bloqueadoAte` no futuro e 2 sessões → depois do reset: `senhaHash` null, `primeiraVez` true, `tentativasFalhas` 0, `bloqueadoAte` null, zero sessões (os 5 conjuntos afirmados)
- [ ] Gate Full passa

**Tests**: integration
**Gate**: full

**Commit**: `feat(usuarios): resetar senha para o primeiro acesso`

---

### T8: `POST /api/usuarios/consulta`

**What**: Rota de consulta paginada, com filtro e busca no corpo.
**Where**: `src/app/api/usuarios/consulta/route.ts`
**Depends on**: None (T3 e T4 já concluídas pela ordem das fases)
**Reuses**: `exigirMutacao`, `corpoValidado`, `comTratamentoDeErro`, `consultaUsuariosSchema` (T3), `consultarUsuarios` (T4)
**Requirement**: GU-16, GU-19, GU-20, GU-48

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `e2e/usuarios-gestao.spec.ts` (novo): GT logado → 200 com as 4 chaves do contrato e `usuarios.length <= 20`; sem header CSRF → 403; VT logado → 403 "Acesso negado"; chave extra → 400
- [ ] A requisição de busca por CPF do teste tem `request.url()` igual a `/api/usuarios/consulta`, sem query string
- [ ] Gate Full passa com `npx playwright test e2e/usuarios-gestao.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): consulta paginada de usuarios por corpo`

---

### T9: `PATCH /api/usuarios`

**What**: Rota de edição de cadastro, com alvo e alterações no corpo, no mesmo arquivo do `POST` de criação.
**Where**: `src/app/api/usuarios/route.ts`
**Depends on**: T8
**Reuses**: `edicaoUsuarioSchema`, `exigirAlvoEditavel`, `validarDocumentoDoTipo`, `atualizarCadastro`
**Requirement**: GU-24, GU-27, GU-29, GU-30, GU-48

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Em `e2e/usuarios-gestao.spec.ts`: GO troca o nome do próprio VO → 200 com `{ usuario }` e o banco tem o nome novo; GO tenta o VO de outro GO → 403 e o banco não mudou; sem CSRF → 403; chave `tipo` → 400
- [ ] O comentário SPEC_DEVIATION do topo de `route.ts` (sobre "não existe rota de edição de `Usuario`") é atualizado: a rota agora existe e não edita `cdOfertante`
- [ ] Os testes existentes de `POST /api/usuarios` em `e2e/usuarios.spec.ts` continuam passando
- [ ] Gate Full passa com `npx playwright test e2e/usuarios-gestao.spec.ts e2e/usuarios.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): editar cadastro de usuario com o alvo no corpo`

---

### T10: `POST /api/usuarios/resetar-senha`

**What**: Rota de reset de senha, com o alvo no corpo.
**Where**: `src/app/api/usuarios/resetar-senha/route.ts`
**Depends on**: T9
**Reuses**: `resetarSenhaSchema`, `exigirAlvoEditavel`, `resetarSenha`
**Requirement**: GU-41, GU-43, GU-44, GU-48

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Em `e2e/usuarios-gestao.spec.ts`: AM reseta um VT com senha → 200, o banco tem `senhaHash` null e `primeiraVez` true, e o VT entra com a senha em branco e cai em `/primeiro-acesso`; GT reseta um AM → 403; sem CSRF → 403; corpo com `senha` → 400
- [ ] Gate Full passa com `npx playwright test e2e/usuarios-gestao.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): resetar senha de usuario com o alvo no corpo`

---

### T11: Rota `/usuarios` + redirect + navegação

**What**: Move a página de criação para `/usuarios` (com `NovoUsuarioForm` aceitando `aoCriar`), transforma `/usuarios/novo` em `redirect("/usuarios")` e troca o item de menu para "Gestão de usuários" → `/usuarios`.
**Where**: `src/app/(protegido)/usuarios/page.tsx` (os demais arquivos são o par desta mudança de rota: `novo/page.tsx` vira redirect, `NovoUsuarioForm.tsx` é movido, e `src/lib/ui/navegacao.ts` muda uma constante)
**Depends on**: None
**Reuses**: `novo/page.tsx` atual, `NovoUsuarioForm`, `redirect` (`next/navigation`)
**Requirement**: GU-01, GU-02, GU-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `navegacao.test.ts`: AM, GT e GO têm o item "Gestão de usuários" com href `/usuarios`; VT, VO e AL não têm; nenhuma ocorrência de `/usuarios/novo` na tabela
- [ ] `git mv e2e/usuarios-novo-page.spec.ts e2e/usuarios-page.spec.ts`; os testes existentes passam a navegar para `/usuarios`; um teste novo: abrir `/usuarios/novo` termina em `/usuarios` com o formulário visível
- [ ] Specs que conferem o href `/usuarios/novo` (`proxy.spec.ts`, `identidade-visual.spec.ts`, `organizacao.spec.ts`) ajustados só onde quebrarem
- [ ] Gate Full passa com `npx playwright test e2e/usuarios-page.spec.ts e2e/proxy.spec.ts e2e/identidade-visual.spec.ts e2e/organizacao.spec.ts e2e/painel.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(usuarios)!: renomear a pagina para Gestao de usuarios em /usuarios`

---

### T12: Lista paginada com chips e busca

**What**: `GestaoUsuarios` (cliente) com formulário + lista, chips, busca com debounce, "Anterior"/"Página X de Y"/"Próxima", recarga após criar; a página entrega a página 1 renderizada no servidor.
**Where**: `src/app/(protegido)/usuarios/GestaoUsuarios.tsx` (a página passa a entregar a ela a página 1 já consultada)
**Depends on**: T11
**Reuses**: `consultarUsuarios`, `whereUsuariosVisiveis`, `tiposVisiveis`, `NOME_TIPO_USUARIO`, `headerCSRF`, componentes `ui/`
**Requirement**: GU-06, GU-07, GU-08, GU-09, GU-10, GU-11, GU-12, GU-14, GU-15, GU-49

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Em `e2e/usuarios-page.spec.ts`: GO vê chips "Todos", "Visualizador Ofertante" e "Aluno" e as linhas com nome, documento, tipo por extenso e e-mail; GT com 21 fixtures `GU-E2E` buscados vê "Página 1 de 2", "Anterior" desabilitado, e "Próxima" leva a "Página 2 de 2" com "Próxima" desabilitado; trocar o chip volta à página 1; busca sem resultado → "Nenhum usuário encontrado."; criar um usuário pelo formulário faz ele aparecer na lista sem `page.reload()`; VT abre `/usuarios` e não vê lista
- [ ] Depois de buscar, paginar e filtrar, `page.url()` termina exatamente em `/usuarios`
- [ ] Nenhuma cor literal no `.tsx` (AD-039)
- [ ] Gate Full passa com `npx playwright test e2e/usuarios-page.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(usuarios): lista paginada com filtro por tipo e busca`

---

### T13: Edição inline e reset de senha

**What**: `LinhaUsuario` (cliente): botão "Editar" só nas linhas editáveis, formulário na própria linha, salvar com recarga da página atual, erro na linha, reset com confirmação inline e mensagem.
**Where**: `src/app/(protegido)/usuarios/LinhaUsuario.tsx`
**Depends on**: T12
**Reuses**: `Field*`, `Input`, `Button`, `headerCSRF`, `PATCH /api/usuarios`, `POST /api/usuarios/resetar-senha`
**Requirement**: GU-22, GU-23, GU-31, GU-40, GU-45, GU-46

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Em `e2e/usuarios-page.spec.ts`: GT vê "Editar" na linha de um VT e não na de um AM nem na própria; editar o nome do VT → a linha fecha e mostra o nome novo; trocar o CPF para um já existente → "Documento já cadastrado" na linha, que segue aberta; o campo do documento de um GO se chama "CNPJ" e aceita 14 dígitos, e o de um VT se chama "CPF" e aceita 11; "Resetar senha" → "Confirmar reset" → mensagem de GU-46, e o banco tem `senhaHash` null
- [ ] Gate **Full-feature** passa (lint, build, typecheck, unit, integration, e2e completo, com `test-results/.last-run.json` conferido)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(usuarios): editar cadastro e resetar senha na propria linha`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1    T2    T3
Phase 2:  T4 ------→ T5
          T4 ------→ T6 ------→ T7
Phase 3:  T8 ------→ T9 ------→ T10
Phase 4:  T11 -----→ T12 -----→ T13
```

13 tarefas → 2 lotes de ~7 (Lote A: Fases 1+2, T1–T7; Lote B: Fases 3+4, T8–T13).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 função | ✅ Granular |
| T2 | 3 funções puras coesas, 1 arquivo | ✅ Coeso |
| T3 | 3 schemas coesos, 1 arquivo | ✅ Coeso |
| T4 | 1 consulta + seu `where` | ✅ Granular |
| T5 | 1 guarda | ✅ Granular |
| T6 | 1 função de serviço | ✅ Granular |
| T7 | 1 função de serviço | ✅ Granular |
| T8 | 1 endpoint | ✅ Granular |
| T9 | 1 endpoint | ✅ Granular |
| T10 | 1 endpoint | ✅ Granular |
| T11 | 1 mudança de rota (página + redirect + item de menu, inseparáveis sem quebrar navegação) | ⚠️ Coeso |
| T12 | 1 componente | ✅ Granular |
| T13 | 1 componente | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | nenhuma seta | ✅ Match |
| T2 | None | nenhuma seta | ✅ Match |
| T3 | None | nenhuma seta | ✅ Match |
| T4 | None (fase anterior garante T1/T2) | início da Fase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T4 | T4 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | None (fases anteriores garantem T3/T4) | início da Fase 3 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | None | início da Fase 4 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Regra pura | unit | unit | ✅ OK |
| T2 | Regra pura | unit | unit | ✅ OK |
| T3 | Schema Zod | unit | unit | ✅ OK |
| T4 | Serviço com banco | integration | integration | ✅ OK |
| T5 | Serviço com banco | integration | integration | ✅ OK |
| T6 | Serviço com banco | integration | integration | ✅ OK |
| T7 | Serviço com banco | integration | integration | ✅ OK |
| T8 | Rota de API | e2e | e2e | ✅ OK |
| T9 | Rota de API | e2e | e2e | ✅ OK |
| T10 | Rota de API | e2e | e2e | ✅ OK |
| T11 | Página + navegação (unit + e2e) | e2e (maior) | e2e | ✅ OK |
| T12 | Componente cliente + página | e2e | e2e | ✅ OK |
| T13 | Componente cliente | e2e | e2e | ✅ OK |
