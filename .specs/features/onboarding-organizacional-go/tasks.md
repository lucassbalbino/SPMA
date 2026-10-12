# Onboarding Organizacional do GO Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/onboarding-organizacional-go/design.md`
**Status**: Done (aguardando Verifier)

---

## Test Coverage Matrix

> Gerado a partir do código (amostragem de `src/lib/auth/guards.test.ts`, `src/lib/validation/schemas/*.test.ts`, `src/lib/respostas/dados-pessoais-migracao.integration.test.ts`, `e2e/cadastro-ofertante-page.spec.ts`, `e2e/usuarios.spec.ts`) e das diretrizes encontradas: `AGENTS.md` (sem regra de teste), `vitest.integration.config.ts` (`fileParallelism: false`), memória do usuário "testes enxutos, principalmente e2e" (mesmo pedido aplicado a `unificacao-ofertante-go`). Convenção do repositório: rotas de API são provadas por e2e, não por um `*.integration.test.ts` por rota.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domínio (guards, schemas Zod) | unit | 1:1 com os OGO da tarefa; todo edge case listado que cai nessa camada | `src/lib/auth/*.test.ts`, `src/lib/validation/schemas/*.test.ts` | `npm run test:unit` |
| Migration SQL | integration | O artefato real (`migration.sql`) executado contra `spma_test`, afirmando o estado resultante (OGO-14, OGO-16) | `src/lib/**/*.integration.test.ts` | `npm run test:integration` |
| Rotas de API + páginas | e2e | Só os cenários que esta feature cria ou muda, mais os testes existentes que a mudança força a reescrever. Toda afirmação de "nada mudou" lê o banco antes/depois (L-014). Não ampliar cobertura além disso | `e2e/*.spec.ts` | `npx playwright test <specs da tarefa>` |
| Fixtures/scripts de teste e seed (`scripts/e2e-fixture.ts`, `e2e/helpers/db.ts`, `scripts/dev-seed-demo.ts`) | none (não é produção) | - | - | gate de build (typecheck) |
| Schema Prisma | none (provado pela migration + typecheck) | - | - | gate de build |

## Gate Check Commands

> `Full` roda só as specs e2e que a tarefa toca, para não pagar 7 min de suíte a cada tarefa; o `Full-feature` (suíte inteira) é obrigatório na última tarefa e antes do Verifier. **Nunca** filtrar a saída do Playwright com pipe nem confiar no exit code sozinho: conferir `test-results/.last-run.json` (`status` + `failedTests`) — armadilha registrada no Handoff de `respostas-normalizadas`. Verificar que a porta 3000 está livre antes de rodar e2e.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unit | `npm run typecheck && npm run test:unit` |
| Full | Tarefa com e2e/integration | `npm run typecheck && npm run test:unit && npm run test:integration && npx playwright test <specs listadas na tarefa>` |
| Build | Tarefa de seed/fixture sem teste próprio | `npm run lint && npm run build && npm run typecheck` |
| Full-feature (obrigatório em T8 e antes do Verifier) | Fechamento | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

---

## Execution Plan

Phases run sequentially; tasks within a phase run in order.

### Phase 1: Fundação

A coluna existe, a migration é provada contra o artefato real, e o fixture e2e já a conhece com default `true` — nenhum spec existente muda de comportamento.

```
T1
```

### Phase 2: Coleta obrigatória no 1º login (P1)

Ordem deliberada: o contrato (T2) e o escritor da flag (T3) entram **antes** do guard trocar de critério (T4). Invertido, o GO enviaria o formulário e continuaria barrado.

```
T2 → T3 → T4 → T5
```

### Phase 3: Criação enxuta pelo AM/GT (P1)

```
T6 → T7
```

### Phase 4: Seed de demonstração

```
T8
```

---

## Task Breakdown

### T1: Coluna `dadosOrganizacionaisCompletos` + migration + fixture

**What**: Adicionar a coluna ao model `Usuario`, a migration `ADD COLUMN ... DEFAULT false`, o teste de integração que executa o SQL real, e o suporte à coluna no fixture e2e (default `true`, `nome` aceitando `null` explícito, `email` opcional).
**Where**: `prisma/schema.prisma`, `prisma/migrations/20261012120000_onboarding_organizacional_go/migration.sql` (uma mudança de modelo; o fixture entra junto porque seleciona colunas explicitamente em `CAMPOS_USUARIO` e precisa refletir o modelo no mesmo commit)
**Depends on**: None
**Reuses**: `dadosPessoaisCompletos` (forma), `dados-pessoais-migracao.integration.test.ts` (padrão de ler e executar o `migration.sql`), default `?? true` de `scripts/e2e-fixture.ts:120`
**Requirement**: OGO-14, OGO-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npx prisma generate` ok; `Usuario.dadosOrganizacionaisCompletos: boolean` no cliente gerado
- [x] Teste de integração novo `prisma/onboarding-organizacional-migracao.integration.test.ts` (ao lado do `seed.integration.test.ts`, já incluído pelo glob da config): remove a coluna, semeia um GO com os 6 campos e um AL, executa o `migration.sql` lido do disco, e afirma (a) flag `false` nos dois, (b) os 6 valores do GO idênticos aos semeados. `afterAll` recria a coluna se o teste falhar no meio
- [x] `scripts/e2e-fixture.ts` + `e2e/helpers/db.ts`: `dadosOrganizacionaisCompletos?: boolean` (default `true`), `nome?: string | null` (`null` explícito grava `null`; ausente mantém o default atual), `email?: string`; os três expostos em `UsuarioPersistido`
- [x] Gate Full passa; e2e de fumaça: `npx playwright test e2e/protegido-layout.spec.ts e2e/cadastro-ofertante-page.spec.ts` (nada muda de comportamento ainda)

**Tests**: integration
**Gate**: full

**Commit**: `feat(usuarios): coluna dadosOrganizacionaisCompletos para o onboarding do GO`

**Status**: ✅ Done — 690 unit / 74 integration (+2) / e2e de fumaça 8/8. Nota de execução: o parser de `migration.sql` copiado do precedente dividia por `;` antes de tirar comentários e quebrava com `;` em prosa no cabeçalho; corrigido no próprio teste (comentários saem primeiro).

---

### T2: `organizacaoSchema` com os 6 campos obrigatórios

**What**: Tornar `nome`, `responsavel`, `email`, `telefone`, `uf` e `municipio` obrigatórios, com mensagem por campo igual para ausente e vazio; simplificar `dadosOrganizacao()` (sem `?? null`) e corrigir o comentário que cita um terceiro uso inexistente.
**Where**: `src/lib/validation/schemas/organizacao.schema.ts` (+ `organizacao-dados.ts`, mesmo contrato)
**Depends on**: None
**Reuses**: `OPCOES_UF`
**Requirement**: OGO-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `organizacao.schema.test.ts`: aceita os 6 válidos; para cada um dos 5 campos de texto, ausente e `""` rejeitados com a mensagem do campo; email malformado → "Email inválido"; UF fora da lista → "UF inválida"
- [x] e2e que mandavam corpo parcial a rotas de organização passam a mandar os 6: `e2e/organizacao-id.spec.ts` (CA-OV-03), `e2e/cadastro-ofertante-page.spec.ts` (preenche os 6 pela UI). Os testes de 400/403 existentes seguem afirmando o mesmo status
- [x] Gate Full passa com `npx playwright test e2e/organizacao.spec.ts e2e/organizacao-id.spec.ts e2e/cadastro-ofertante-page.spec.ts`

**Tests**: unit
**Gate**: full

**Commit**: `feat(organizacao)!: exigir os 6 dados organizacionais do GO`

**Status**: ✅ Done — 693 unit (690 − 5 testes do contrato antigo + 8) / 74 integration / e2e 20/20. O teste "aceita payload válido com apenas os campos obrigatórios" (`{nome, uf}`) codificava a regra que a decisão 2 do usuário mudou e foi substituído; os de "ausente" foram reescritos a partir de um payload completo (antes rejeitariam por qualquer campo faltando).

---

### T3: `PATCH /api/usuarios/me/organizacao` passa a escrever e ler a flag

**What**: 409 por `sessao.usuario.dadosOrganizacionaisCompletos` (antes de validar o corpo); `update` grava os 6 campos e `dadosOrganizacionaisCompletos: true` juntos.
**Where**: `src/app/api/usuarios/me/organizacao/route.ts`
**Depends on**: T2
**Reuses**: `dadosOrganizacao`, `CAMPOS_ORGANIZACAO`, `exigirMutacao`, `corpoValidado`
**Requirement**: OGO-03, OGO-04, OGO-05, OGO-07, OGO-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `e2e/cadastro-ofertante-page.spec.ts`: o fixture do GO pendente passa `dadosOrganizacionaisCompletos: false`; após o envio pela UI, afirma os 6 valores gravados **e** a flag `true` (L-014: o estado resultante, não só o 200)
- [x] Novo: GO pendente envia corpo com `telefone` vazio → 400, e o banco segue com os 6 campos e a flag exatamente como antes (OGO-04)
- [x] Teste existente do 409 afirma também que email, responsável, telefone e município não mudaram (OGO-05/17), lidos antes e depois
- [x] Teste existente de 403 para não-GO segue verde (OGO-07)
- [x] Gate Full passa com `npx playwright test e2e/cadastro-ofertante-page.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(organizacao): ligar a flag do GO no envio do onboarding`

**Status**: ✅ Done — 693 unit / 74 integration / `cadastro-ofertante-page.spec.ts` 6/6 (+1: OGO-04). O 409 passou a ser provado com corpo completo e válido, para não poder vir da validação.

---

### T4: Guard `requireDadosOrganizacionaisCompletos`

**What**: Substituir `requireOfertanteVinculado` por `requireDadosOrganizacionaisCompletos({tipo, dadosOrganizacionaisCompletos})` e trocar a chamada no layout protegido (ordem da cadeia inalterada).
**Where**: `src/lib/auth/guards.ts` (+ a chamada em `src/app/(protegido)/layout.tsx`)
**Depends on**: T3
**Reuses**: `requireDadosPessoaisCompletos`
**Requirement**: OGO-01, OGO-06, OGO-08, OGO-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `guards.test.ts`: GO com flag `false` → redirect `/cadastro-ofertante`; GO com flag `true` → não redireciona **mesmo com `nome`/`uf` nulos** (prova que o critério antigo saiu); cada um de AM/GT/VT/VO/AL com flag `false` → não redireciona (OGO-06)
- [x] `e2e/protegido-layout.spec.ts`: fixture do GO pendente com flag `false`; caso existente renomeado para o critério novo; caso novo OGO-15: GO com nome **e** UF preenchidos e flag `false` → `/painel` redireciona para `/cadastro-ofertante`
- [x] OGO-08 segue provado pelo teste existente "primeiraVez=true redireciona para /primeiro-acesso" (ordem da cadeia não muda) — sem teste novo
- [x] Gate Full passa com `npx playwright test e2e/protegido-layout.spec.ts e2e/cadastro-ofertante-page.spec.ts e2e/identidade-visual.spec.ts`

**Tests**: unit
**Gate**: full

**Commit**: `feat(auth)!: decidir o gate do GO pela flag, nao por nome/uf`

**Status**: ✅ Done — 697 unit (693 − 4 testes do critério antigo + 8) / 74 integration / e2e 44/44 (`protegido-layout`, `cadastro-ofertante-page`, `identidade-visual`, `dados-pessoais`, `meus-dados`). A renomeação deixou 4 comentários citando `requireOfertanteVinculado` (`proxy.ts`, 3 specs e2e) — atualizados; o de `usuario.schema.ts` fica para o T6, que reescreve esse trecho. Em `cadastro-ofertante-page.spec.ts`, a pré-condição `uf` nulo virou flag `false`, que é o que mantém o GO pendente agora.

---

### T5: `/cadastro-ofertante` com nome pré-preenchido

**What**: A página vira Server Component que lê a sessão e renderiza `CadastroOrganizacaoForm` (client, novo) com `nomeInicial = usuario.nome ?? ""`; o formulário manda as 6 strings cruas.
**Where**: `src/components/organizacao/CadastroOrganizacaoForm.tsx` (novo; a `page.tsx` só passa a delegar)
**Depends on**: T4
**Reuses**: `meus-dados/page.tsx` + `DadosPessoaisForm` (Server → Client), JSX atual da página
**Requirement**: OGO-02, OGO-17, OGO-18, OGO-19, OGO-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e: GO pendente abre a tela e o campo Nome mostra o nome gravado na criação (OGO-02); envia sem tocar no Nome e o banco grava esse mesmo nome (OGO-19)
- [x] e2e: GO pendente com `nome: null` vê o campo vazio; enviar sem preencher mostra "Nome é obrigatório" e não grava nada (OGO-20)
- [x] e2e: GO com flag `true` abre `/cadastro-ofertante` pela URL e a tela renderiza (OGO-17, a parte do envio já é T3)
- [x] e2e: sem sessão, `/cadastro-ofertante` redireciona para `/login` (OGO-18)
- [x] Gate Full passa com `npx playwright test e2e/cadastro-ofertante-page.spec.ts e2e/identidade-visual.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(organizacao): abrir o onboarding do GO com o nome da criacao`

**Status**: ✅ Done — 697 unit / 74 integration / e2e 34/34 (`cadastro-ofertante-page` +4, `identidade-visual`). Só OGO-02/19 nasceu vermelho; OGO-17, OGO-18 e OGO-20 fixam comportamento que já valia e tem de continuar valendo. Desvio do design.md (item 8): o `campo || undefined` saiu por simplicidade, não pelo motivo citado lá — com `z.string({ message })`, ausente e vazio já dão a mesma mensagem.

---

### T6: Criação de GO sem dado organizacional (schema + tela)

**What**: `usuarioSchema` rejeita `email`/`uf` para GO e `responsavel`/`telefone`/`municipio` para todo tipo, e deixa de exigir UF do GO; `NovoUsuarioForm` remove os 4 campos organizacionais e esconde o E-mail com GO selecionado (é o consumidor cliente do mesmo schema, AD-004 — mudar um sem o outro trava a tela).
**Where**: `src/lib/validation/schemas/usuario.schema.ts` (+ `src/app/(protegido)/usuarios/novo/NovoUsuarioForm.tsx`, mesmo contrato no cliente)
**Depends on**: None
**Reuses**: estrutura de `superRefine` existente
**Requirement**: OGO-09, OGO-10, OGO-12, OGO-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `usuario.schema.test.ts`: GO com CNPJ+nome+verba aceito sem UF; GO com cada um de `email`/`uf`/`responsavel`/`telefone`/`municipio` rejeitado com a mensagem do campo; AL/VO com `email` e com `uf` aceitos (OGO-13, e a decisão fixada "aceita uf para tipo != GO" segue verde); AL com `responsavel` rejeitado
- [x] `e2e/usuarios.spec.ts`: tira `uf` dos payloads de GO que não testam isso (UGO-18 403, UGO-10 409, REQ-OV-08 400 — sem isso o 400 de forma mascara o status que cada um afirma); caso UGO-01/07 vira OGO-09 (CNPJ+nome+verba → 201, GO e verba criados); caso novo OGO-10: GO com `email` → 400 e nem usuário nem verba no banco
- [x] `e2e/usuarios-novo-page.spec.ts`: AM com GO selecionado não vê E-mail, UF, Responsável, Telefone nem Município (OGO-12) e cria o GO só com CNPJ+nome+verba; o caso "barrado sem UF" é removido (o requisito deixou de existir)
- [x] Gate Full passa com `npx playwright test e2e/usuarios.spec.ts e2e/usuarios-novo-page.spec.ts`

**Tests**: unit
**Gate**: full

**Commit**: `feat(usuarios)!: criar GO so com CNPJ, nome e verba`

**Status**: ✅ Done — 703 unit (697 − 3 do contrato antigo + 9) / 74 integration / e2e 24/25. **Falha pré-existente, fora desta feature:** `e2e/usuarios-novo-page.spec.ts:80` (CA-AU-05) espera as opções do `<select>` como códigos (`"AL"`, `"VO"`), mas o commit `fe2d383` ("commit Nome ALuno on form", anterior a esta feature) passou a renderizar `NOME_TIPO_USUARIO`. Falha igual no HEAD antes do T6 (verificado com `git stash`). Não alterada: teste alheio, aguarda o usuário. O mesmo commit trocou o rótulo do documento para "CNPJ" com GO, o que já quebrava os dois testes de GO pela UI; o reescrito aqui usa "CNPJ", e o "barrado sem UF" foi removido porque o requisito deixou de existir. Payloads de GO com `uf` incidental (unit de verba, e2e UGO-18/UGO-10/REQ-OV-08) perderam o `uf`, senão o 400 de forma mascararia o status afirmado.

---

### T7: `POST /api/usuarios` deixa de escrever os campos que não chegam mais

**What**: O `create` para de gravar `responsavel`/`telefone`/`municipio` (o schema garante que nunca vêm); `email`/`uf` seguem para os tipos != GO; comentário atualizado.
**Where**: `src/app/api/usuarios/route.ts`
**Depends on**: T6
**Reuses**: -
**Requirement**: OGO-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] e2e OGO-09 (de T6) passa a afirmar também: flag `false` e `email`/`responsavel`/`telefone`/`uf`/`municipio` nulos no GO criado (OGO-11)
- [x] Gate Full passa com `npx playwright test e2e/usuarios.spec.ts`

**Tests**: e2e
**Gate**: full

**Commit**: `refactor(usuarios): parar de gravar dado organizacional na criacao`

**Status**: ✅ Done — 703 unit / 74 integration / `usuarios.spec.ts` 19/19. As asserções de OGO-11 já passariam antes da limpeza (o schema do T6 garante os nulos); aqui elas são a rede que prova que o refactor não mudou comportamento.

---

### T8: Seed de demonstração com o GO já concluído

**What**: O GO de `dev-seed-demo.ts` nasce com `dadosOrganizacionaisCompletos: true` e os 6 campos (hoje falta `telefone`), para o ambiente de demo não abrir preso no onboarding.
**Where**: `scripts/dev-seed-demo.ts`
**Depends on**: T1
**Reuses**: -
**Requirement**: (suporte — Assumption "Fixtures e seed de demonstração" da spec)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate Build passa
- [x] Gate Full-feature passa (última tarefa de código): `test-results/.last-run.json` com `status: "passed"` e `failedTests: []`

**Tests**: none
**Gate**: build

**Commit**: `chore(seed): criar o GO de demo com o onboarding concluido`

**Status**: ✅ Done — Full-feature: lint 0 erros (35 warnings, todos pré-existentes; eram 38), build ok, typecheck limpo, 703 unit, 74 integration, e2e **244 passed / 1 failed**. A única falha é a CA-AU-05 pré-existente (`e2e/usuarios-novo-page.spec.ts:80`, introduzida por `fe2d383`, ver T6), registrada em `test-results/.last-run.json`. Nenhuma regressão desta feature.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1
Phase 2:  T2 ------→ T3 ------→ T4 ------→ T5
Phase 3:  T6 ------→ T7
Phase 4:  T8

Dependência entre fases: T1 ---------------------------------------→ T8
```

8 tarefas → um lote só: execução inline, sem sub-agente de batch. O Verifier roda como sub-agente ao fim, como sempre.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: coluna + migration + fixture | 1 mudança de modelo (schema, SQL, espelho no fixture) | ⚠️ 3 arquivos, coesos: o fixture seleciona colunas explicitamente e quebraria o typecheck se ficasse para depois |
| T2: organizacaoSchema | 1 schema (+ o helper que mapeia o mesmo contrato) | ✅ |
| T3: rota /me | 1 endpoint | ✅ |
| T4: guard | 1 função (+ 1 linha de chamada no layout) | ✅ |
| T5: formulário de onboarding | 1 componente (+ página que delega) | ✅ |
| T6: criação sem dado organizacional | 1 schema (+ seu consumidor cliente) | ⚠️ 2 arquivos: AD-004 compartilha o schema com o formulário; separados, um dos dois commits trava a tela de criação |
| T7: rota POST | 1 endpoint | ✅ |
| T8: seed | 1 script | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da Phase 1 | ✅ |
| T2 | None | início da Phase 2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | None | início da Phase 3 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T1 | Phase 4, depende de fase anterior | ✅ |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Migration SQL + schema + fixture | integration | integration | ✅ |
| T2 | Domínio (schema Zod) | unit (+ e2e que a mudança força) | unit | ✅ |
| T3 | Rota de API | e2e | e2e | ✅ |
| T4 | Domínio (guard) + layout | unit (+ e2e do gate) | unit | ✅ |
| T5 | Página | e2e | e2e | ✅ |
| T6 | Domínio (schema Zod) + página | unit (+ e2e) | unit | ✅ |
| T7 | Rota de API | e2e | e2e | ✅ |
| T8 | Seed | none | none | ✅ |
