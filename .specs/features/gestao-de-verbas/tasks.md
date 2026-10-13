# Gestão de Verbas Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/gestao-de-verbas/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Gerado a partir do código (amostragem de `src/lib/validation/schemas/verba.schema.test.ts`, `src/lib/auth/guards.test.ts`, `src/lib/ui/navegacao.test.ts`, `src/lib/verba/saldo.integration.test.ts`, `e2e/verbas.spec.ts`, `e2e/usuarios-page.spec.ts`) e das diretrizes encontradas: `AGENTS.md` (sem regra de teste), `vitest.config.ts` (unit só pega `*.test.ts`), `vitest.integration.config.ts` (`fileParallelism: false`, banco `spma_test`), `playwright.config.ts` (paralelismo por arquivo, documento único por arquivo), e a memória do usuário "testes enxutos, principalmente e2e: a camada mais barata que prove o critério". Convenção do repositório: rotas de API são provadas por e2e, não por um `*.integration.test.ts` por rota.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domínio (schemas Zod, guards, navegação) | unit | 1:1 com os GV da tarefa; todo edge case listado que cai nessa camada | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Consulta com banco (`lib/verba/consulta.ts`) | integration | Escopo por perfil e saldo, afirmando o conteúdo da lista (não só o tamanho) | `src/lib/**/*.integration.test.ts` | `npm run test:integration` |
| Componente React sem caminho e2e determinístico | unit (`renderToStaticMarkup`) | Só o estado que o e2e não alcança (GV-10) | `src/app/**/*.test.ts` | `npm run test:unit` |
| Rotas de API + páginas | e2e | Só os cenários que esta feature cria ou muda, mais os testes existentes que a mudança força a reescrever. Toda afirmação de "nada foi criado" ou "nada mudou" lê o banco (L-014). Não ampliar cobertura além disso | `e2e/*.spec.ts` | `npx playwright test <specs da tarefa>` |
| Documentação `.specs/` | none | - | - | - |

## Gate Check Commands

> `Full` roda só os specs e2e da tarefa. O `Full-feature` (suíte inteira) é obrigatório na última tarefa e antes do Verifier. **Nunca** filtrar a saída do Playwright com pipe nem confiar só no exit code: conferir `test-results/.last-run.json` (`status` + `failedTests`). Verificar que a porta 3000 está livre antes de rodar e2e.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unit | `npm run typecheck && npm run test:unit` |
| Full | Tarefa com e2e/integration | `npm run typecheck && npm run test:unit && npm run test:integration && npx playwright test <specs listados na tarefa>` |
| Build | Fim de fase | `npm run lint && npm run build && npm run typecheck` |
| Full-feature (obrigatório na T11 e antes do Verifier) | Fechamento | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

---

## Execution Plan

Phases run sequentially; tasks within a phase run in order.

### Phase 1: Contrato e domínio

Regras de servidor primeiro: as telas da Phase 2 só exibem o que estas tarefas já garantem.

```
T1
T2 → T4
T3 → T4
T5
```

### Phase 2: Telas e navegação

A página existe (T7) antes de o menu apontar para ela (T10), para nunca existir um link para 404.

```
T6
T7 → T8
T7 → T9
T7 → T10
T11
```

---

## Task Breakdown

### T1: Teto, casas decimais e mensagens de ausência no `verba.schema`

**What**: `vlVerba` com mensagens para ausente, `<= 0`, `> 99999999.99` e mais de 2 casas decimais; `cdOfertante` ausente ou vazio → "Ofertante é obrigatório".
**Where**: `src/lib/validation/schemas/verba.schema.ts`
**Depends on**: None
**Reuses**: `camposVerbaSchema` / `verbaSchema` / `edicaoVerbaSchema` existentes
**Requirement**: GV-03, GV-04, GV-05, GV-06, GV-21, GV-33

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `verba.schema.test.ts`: `verbaSchema` sem `cdOfertante` e com `""` → "Ofertante é obrigatório"; sem `vlVerba` → "Valor da verba é obrigatório"; `0` e `-1` → "Valor da verba deve ser positivo"; `100000000` → "Valor da verba excede o máximo permitido"; `99999999.99` aceito (GV-33); `10.123` → "Valor da verba aceita no máximo 2 casas decimais"; `0.29` e `12500.5` aceitos (ponto flutuante)
- [x] `edicaoVerbaSchema` rejeita `100000000` e `10.123` com as mesmas mensagens (GV-21)
- [x] Gate Quick passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(verbas): validar teto e casas decimais do valor da verba`

**Status**: ✅ Done — 792 unit (+11) / typecheck limpo.

---

### T2: Guarda de leitura `podeLerVerba`

**What**: `podeLerVerba(tipo)`: `true` para AM, GT, GO e VO; `false` para VT e AL. Reexportada por `guards.ts`.
**Where**: `src/lib/auth/permissoes.ts`
**Depends on**: None
**Reuses**: padrão de `podeGerenciarVerba`
**Requirement**: GV-17, GV-34

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `guards.test.ts`: um caso por tipo (6), cada um afirmando o booleano exato
- [x] Gate Quick passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): guarda de leitura de verba sem o VT`

**Status**: ✅ Done — 798 unit (+6) / typecheck limpo. As rotas passam a usar a guarda na T4.

---

### T3: `listarVerbasDoEscopo`

**What**: Lista escopada de verbas com `nomeOfertante` e `saldoDisponivel`, em `cdVerba asc`.
**Where**: `src/lib/verba/consulta.ts`
**Depends on**: None
**Reuses**: `escopoDeLeitura`, `whereDeEscopo`, `saldosDasVerbas`
**Requirement**: GV-11, GV-12, GV-13, GV-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `consulta.integration.test.ts`, com 2 GOs (A com 2 verbas, uma delas com um curso alocado; B com 1 verba) e um VO de A: AM vê as 3 verbas dos dois GOs (afirma os `cdVerba`) com `nomeOfertante` correto; GO A vê só as 2 dele; VO de A vê as mesmas 2; GO B vê só a dele; a verba com curso tem `saldoDisponivel = vlVerba - vlCursoAlocado` (valor exato) e a sem curso, `saldo = vlVerba`; AL recebe lista vazia (falha fechada)
- [x] Gate Full passa (sem e2e nesta tarefa)

**Tests**: integration
**Gate**: full

**Commit**: `feat(verbas): consulta escopada de verbas com saldo`

**Status**: ✅ Done — 798 unit / 121 integration (+7) / typecheck limpo.

---

### T4: Rotas GET de verba negam o VT e usam a consulta compartilhada

**What**: `GET /api/verbas` e `GET /api/verbas/[id]` respondem 403 para quem não passa em `podeLerVerba`; `GET /api/verbas` passa a montar a lista com `listarVerbasDoEscopo`.
**Where**: `src/app/api/verbas/route.ts` (e a mesma guarda em `src/app/api/verbas/[id]/route.ts`: uma mudança de regra, dois handlers)
**Depends on**: T2, T3
**Reuses**: `listarVerbasDoEscopo`, `podeLerVerba`
**Requirement**: GV-34

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `e2e/verbas.spec.ts`: VT em `GET /api/verbas` → 403, sem `verbas` no corpo
- [x] `e2e/verbas-id.spec.ts`: VT em `GET /api/verbas/[id]` de uma verba existente → 403, sem `verba` no corpo
- [x] Os testes existentes de listagem e escopo (`verbas.spec.ts:148-200`) continuam verdes sem alteração
- [x] Gate Full passa com `npx playwright test e2e/verbas.spec.ts e2e/verbas-id.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(verbas)!: negar ao VT a leitura de verbas`

**Status**: ✅ Done — 798 unit / 121 integration / e2e verbas + verbas-id 15/15 (+2). A guarda do [id] roda antes da busca, para o 403 do VT não revelar se a verba existe.

---

### T5: Criação de usuário deixa de aceitar e criar verba

**What**: `usuarioSchema` rejeita `verba` (`CAMPOS_NUNCA_NA_CRIACAO`); `POST /api/usuarios` não cria mais verba e a resposta 201 perde a chave `verba`; `exigeOfertanteEVerba` sai (fica órfã).
**Where**: `src/app/api/usuarios/route.ts` (contrato único: o `usuario.schema.ts` muda junto porque `dados.verba` some do tipo, e a remoção do órfão em `permissoes.ts`/`guards.ts` é consequência direta)
**Depends on**: None
**Reuses**: padrão `CAMPOS_NUNCA_NA_CRIACAO` (AD-044)
**Requirement**: GV-24, GV-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `usuario.schema.test.ts`: o bloco "verba criada junto do usuário (REQ-OV-08)" vira "verba nunca aceita na criação": payload com `verba` → falha com "verba não é aceito na criação de usuário", para GO e para VO
- [x] `guards.test.ts`: bloco `exigeOfertanteEVerba` removido junto com a função
- [x] `e2e/usuarios.spec.ts`: o teste OGO-09/UGO-07 (AM cria GO) envia só CNPJ + nome, espera 201, sem a chave `verba` no corpo, e zero verbas no banco para o CNPJ (GV-24); o teste "REQ-OV-08: AM criando GO sem verba recebe 400" dá lugar a GV-26: AM criando GO **com** `verba` → 400, e nem o GO nem verba existem no banco; os testes que ainda mandavam `verba` por arrasto (OGO-10 e o de `:412`) deixam de mandar
- [x] Gate Full passa com `npx playwright test e2e/usuarios.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(usuarios)!: criar GO sem verba`

**Status**: ✅ Done — 788 unit (798 − 9 casos de `exigeOfertanteEVerba`, removida junto da regra, − 4 testes do schema que aceitavam verba + 3 de GV-26) / 121 integration / e2e usuarios 19/19. Novo helper de fixture `getVerbasPorOfertante`. Entre a T5 e a T6, a criação de GO pela tela manda `verba` e recebe 400; a T6 fecha isso.

---

### T6: Formulário de usuário sem os campos de verba

**What**: Remover "Valor da verba" e "Data da verba" de `NovoUsuarioForm`, e `verba` do payload.
**Where**: `src/app/(protegido)/usuarios/NovoUsuarioForm.tsx`
**Depends on**: None (T5, da fase anterior, já mudou o contrato)
**Reuses**: -
**Requirement**: GV-23, GV-24

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `e2e/usuarios-page.spec.ts`, teste OGO-09/OGO-12: com o tipo GO selecionado, `#vlVerba` e `#dtVerba` têm contagem 0; o AM cria o GO só com CNPJ e nome → 201, usuário GO no banco e zero verbas para o CNPJ
- [ ] Gate Full passa com `npx playwright test e2e/usuarios-page.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(usuarios): tirar os campos de verba da criação do GO`

---

### T7: Página `/verbas` com a lista em modo leitura

**What**: Server Component que bloqueia VT/AL, carrega a lista por `listarVerbasDoEscopo` e renderiza `ListaVerbas` (só leitura nesta tarefa).
**Where**: `src/app/(protegido)/verbas/page.tsx` (+ `ListaVerbas.tsx`, o componente que a página renderiza)
**Depends on**: None (T2/T3, da fase anterior)
**Reuses**: `requireSession`, `podeLerVerba`, `listarVerbasDoEscopo`, `Card`
**Requirement**: GV-11, GV-14, GV-15, GV-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `e2e/verbas-page.spec.ts` (documentos inéditos):
  - GO com 1 verba e com outro GO no banco: vê a linha da própria verba (nome, CNPJ, "R$ 5000.00", saldo e data `dd/mm/aaaa`), não vê a do outro GO, e não há formulário nem botão "Editar" (GV-11 colunas, GV-14)
  - VO vinculado a um GO sem verbas: vê "Nenhuma verba cadastrada." e nenhum formulário (GV-15, GV-14)
  - VT: vê "Seu perfil não tem acesso a verbas." e nenhuma linha de verba (GV-17)
- [ ] Gate Full passa com `npx playwright test e2e/verbas-page.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(verbas): tela de verbas com lista escopada`

---

### T8: Formulário de criação de verba

**What**: `NovaVerbaForm`, renderizado para AM/GT, com o seletor de GO, valor e data.
**Where**: `src/app/(protegido)/verbas/NovaVerbaForm.tsx`
**Depends on**: T7
**Reuses**: `verbaSchema`, `headerCSRF`, marcação do `<select>` de `NovoUsuarioForm`
**Requirement**: GV-01, GV-02, GV-03, GV-04, GV-05, GV-07, GV-09, GV-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `e2e/verbas-page.spec.ts`:
  - AM: envia vazio → "Ofertante é obrigatório"; escolhe o GO sem valor → "Valor da verba é obrigatório"; valor `0` → "Valor da verba deve ser positivo"; contagem de verbas do GO no banco igual à anterior (GV-03..05)
  - AM cria uma verba para um GO que já tem uma: 201, o banco tem 2 verbas para o CNPJ, a nova com `vlVerba` e `dtVerba` informados, e as duas linhas aparecem na lista sem recarregar (GV-01, GV-02, GV-07)
  - GT com o `POST` atrasado via `page.route`: o botão "Criar verba" fica desabilitado durante o envio (GV-09)
- [ ] `src/app/(protegido)/verbas/NovaVerbaForm.test.ts`: `renderToStaticMarkup` com `gos=[]` contém "Nenhum Ofertante cadastrado - cadastre um GO antes de criar uma verba." e o botão `disabled` (GV-10)
- [ ] Gate Full passa com `npx playwright test e2e/verbas-page.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(verbas): criar verba para um GO pela tela`

---

### T9: Edição de valor e data na linha

**What**: Botão "Editar" para AM/GT em `ListaVerbas`, com valor e data (sem GO), `PATCH` e `router.refresh()`.
**Where**: `src/app/(protegido)/verbas/ListaVerbas.tsx`
**Depends on**: T7
**Reuses**: padrão de edição em linha de `LinhaUsuario`, `PATCH /api/verbas/[id]`
**Requirement**: GV-18, GV-19, GV-20, GV-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `e2e/verbas-page.spec.ts`, GT sobre uma verba de 1000 com curso alocado de 400:
  - a edição não tem campo de GO (GV-22)
  - valor 300 → "Novo valor não pode ser menor que o já alocado a cursos desta verba", e o banco segue com 1000 (GV-19)
  - valor 400 e data nova → a linha mostra "R$ 400.00", saldo "R$ 0.00" e a data nova; o banco tem 400 e a data (GV-18, GV-20)
- [ ] Gate Full passa com `npx playwright test e2e/verbas-page.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(verbas): editar valor e data da verba na lista`

---

### T10: Item "Verbas" na navegação

**What**: `VERBAS` em `MODULOS_POR_PERFIL` para AM, GT, GO e VO.
**Where**: `src/lib/ui/navegacao.ts`
**Depends on**: T7
**Reuses**: `ItemNavegacao`
**Requirement**: GV-27, GV-28, GV-29, GV-30

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `navegacao.test.ts`: `HREFS_ESPERADOS` e `MODULOS_ESPERADOS` atualizados conforme o design (AM/GT com `/verbas`; GO `["Gestão de usuários", "Verbas", "Meus cursos"]`; VO `["Verbas", "Meus cursos"]`; VT e AL sem `/verbas`); `/verbas` em `ROTAS_IMPLEMENTADAS` e em `ROTAS_COM_SESSAO` (GV-30)
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(navegacao): item Verbas no menu`

---

### T11: GO com várias verbas no seletor de curso

**What**: Provar que `/cursos/novo` oferece todas as verbas de um GO que tem mais de uma, cada uma com o próprio saldo.
**Where**: `e2e/cursos-novo.spec.ts`
**Depends on**: None
**Reuses**: fixtures do próprio spec
**Requirement**: GV-32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Uma segunda verba para o GO do spec; o seletor do GO mostra as duas opções (`opcao-verba-{cd}`), cada uma com o próprio saldo
- [ ] Gate Full-feature passa (última tarefa)

**Tests**: e2e
**Gate**: full

**Commit**: `test(cursos): seletor de curso com várias verbas do mesmo GO`

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: schema | 1 schema | ✅ Granular |
| T2: `podeLerVerba` | 1 função | ✅ Granular |
| T3: `listarVerbasDoEscopo` | 1 função | ✅ Granular |
| T4: rotas GET | 1 regra em 2 handlers | ⚠️ OK, coeso |
| T5: contrato de criação de usuário | schema + rota + órfão | ⚠️ OK, coeso (o tipo de `dados` liga os dois) |
| T6: `NovoUsuarioForm` | 1 componente | ✅ Granular |
| T7: página + lista leitura | 1 página + o componente que ela renderiza | ⚠️ OK, coeso |
| T8: `NovaVerbaForm` | 1 componente | ✅ Granular |
| T9: edição na linha | 1 componente | ✅ Granular |
| T10: navegação | 1 tabela | ✅ Granular |
| T11: teste do seletor | 1 spec | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | nenhuma seta | ✅ Match |
| T2 | None | nenhuma seta de entrada | ✅ Match |
| T3 | None | nenhuma seta de entrada | ✅ Match |
| T4 | T2, T3 | T2 → T4, T3 → T4 | ✅ Match |
| T5 | None | nenhuma seta | ✅ Match |
| T6 | None | nenhuma seta | ✅ Match |
| T7 | None | nenhuma seta de entrada | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T7 | T7 → T9 | ✅ Match |
| T10 | T7 | T7 → T10 | ✅ Match |
| T11 | None | nenhuma seta | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Schema Zod | unit | unit | ✅ OK |
| T2 | Guard | unit | unit | ✅ OK |
| T3 | Consulta com banco | integration | integration | ✅ OK |
| T4 | Rotas de API | e2e | e2e | ✅ OK |
| T5 | Schema + rota | e2e (maior) | e2e (+ unit do schema) | ✅ OK |
| T6 | Página | e2e | e2e | ✅ OK |
| T7 | Página | e2e | e2e | ✅ OK |
| T8 | Página + componente | e2e (+ unit p/ GV-10) | e2e | ✅ OK |
| T9 | Página | e2e | e2e | ✅ OK |
| T10 | Navegação | unit | unit | ✅ OK |
| T11 | Página existente | e2e | e2e | ✅ OK |
