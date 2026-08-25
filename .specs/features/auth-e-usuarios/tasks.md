# auth-e-usuarios Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/auth-e-usuarios/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from user decision (no existing tests/guidelines - project not yet bootstrapped). User chose **Vitest (unit/integration) + Playwright (e2e)**.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain/pure logic (`lib/validation/*`, `lib/auth/cascata.ts`, `lib/auth/password.ts`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Auth branch logic depending on Next.js request APIs (`lib/auth/guards.ts`) | unit (mocked `next/headers`, `next/navigation`, `session.ts`) | All 3 guard branches (valid/invalid session, primeiro-acesso gate, ofertante gate) | `src/lib/auth/guards.test.ts` | `npm run test:unit` |
| Service/data-access with real DB (`lib/auth/rate-limit.ts`, `lib/auth/session.ts` DB-facing functions, `prisma/seed.ts`) | integration | Key paths + error handling, against real `spma_test` MySQL via Prisma | `src/**/*.integration.test.ts`, `prisma/seed.integration.test.ts` | `npm run test:integration` |
| API routes + Pages (full auth flows) | e2e | All routes/pages in scope: happy path + every listed edge case + error paths, via browser against real `spma_test` DB | `e2e/*.spec.ts` | `npm run test:e2e` |
| Config/scaffold (Next.js/Tailwind/shadcn/Vitest/Playwright bootstrap, `lib/db/prisma.ts` singleton, `proxy.ts`) | none | - (build gate only; `proxy.ts`'s redirect behavior is asserted indirectly by the e2e tests in T30/T25) | - | build gate only |

## Gate Check Commands

> Generated from the stack chosen above - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test:unit` |
| Full | After tasks with integration/e2e tests | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | After phase completion or config/scaffold-only tasks | `npm run lint && npm run typecheck && npm run build` |

npm scripts to create in T1/T4/T5:
- `lint` → `next lint`
- `typecheck` → `tsc --noEmit`
- `build` → `next build`
- `test:unit` → `vitest run --exclude "**/*.integration.test.ts"`
- `test:integration` → `vitest run -c vitest.integration.config.ts` (loads `.env.test`, `DATABASE_URL` → `spma_test`)
- `test:e2e` → `playwright test` (webServer boots the app against `spma_test`, global setup runs `prisma migrate deploy` + seed)

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Each phase's dependency diagram is embedded directly above its tasks in the **Task Breakdown** section below (kept together so phase membership and dependency arrows stay unambiguous).

## Task Breakdown

Tasks are grouped by phase below (each phase's dependency diagram sits directly above its tasks). Phases run in sequence; tasks within a phase execute in order. **30 tasks total** → packs into batches at whole-phase boundaries (~7 tasks/worker budget): Phase 0 (7), Phase 1 (7), Phase 2 (4), Phase 3 (5), Phase 4 (7). Exact batch grouping is decided at Execute time via the skill's offer-then-confirm step.

---

### Phase 0: Bootstrap do Projeto

Nada existe ainda (`package.json` ausente). Scaffolding do zero.

```
T1 → T2
T1 → T3
T1 → T4
T1 → T5
T2 → T6
T2 → T7
T6 → T7
```

#### T1: Inicializar projeto Next.js 16

**What**: Scaffold do projeto com `create-next-app` (Next.js 16.3.2, React 19, TypeScript, App Router, `src/`, ESLint), sem Tailwind ainda (T3 cuida disso via shadcn init).
**Where**: raiz do repo (`package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`)
**Depends on**: None
**Reuses**: nenhum código existente (apenas `.env.example`/`docker-compose.yml` já presentes)
**Requirement**: infraestrutura (pré-requisito de todos os REQ-AU-*)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npm run dev` sobe sem erro
- [x] `npx tsc --noEmit` passa
- [x] Estrutura `src/app/` presente conforme App Router

**Tests**: none
**Gate**: build

**Commit**: `chore(scaffold): initialize Next.js 16 project`

---

#### T2: Instalar e configurar Prisma

**What**: Instalar `prisma`/`@prisma/client` 7.9.1 + `@prisma/adapter-mysql2`. Prisma 7 exige: (1) `prisma.config.ts` na raiz carregando `DATABASE_URL` (schema não aceita mais `datasource.url` - erro P1012); (2) `generator client` em `schema.prisma` com `provider = "prisma-client"` (não mais `prisma-client-js`) e `output` explícito; (3) todo `PrismaClient` instanciado com `{ adapter }` via `@prisma/adapter-mysql2`, sem fallback. Ajustar SOMENTE o bloco `datasource`/`generator` de `prisma/schema.prisma` (remover `url` do datasource, atualizar `generator`) - os modelos de domínio (`Usuario`, `Sessao`, `Ofertante`, etc.) não mudam. Decisão confirmada com o usuário em Execute - ver design.md Tech Decisions ("Configuração do Prisma 7"). Rodar `prisma generate`, adicionar scripts `db:generate`/`db:migrate` no `package.json`.
**Where**: `package.json`, `prisma.config.ts`, `prisma/schema.prisma` (só o cabeçalho `datasource`/`generator`)
**Depends on**: T1
**Reuses**: `prisma/schema.prisma` (modelos já definidos - ver design.md Code Reuse Analysis)
**Requirement**: infraestrutura

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npx prisma generate` executa sem erro
- [x] `npx prisma validate` passa
- [x] Nenhum model/enum de domínio alterado (diff de `schema.prisma` restrito ao bloco `datasource`/`generator`)

**Tests**: none
**Gate**: build

**Nota de execução**: o pacote `@prisma/adapter-mysql2` citado no `What` não existe no registro npm. O adapter oficial da Prisma para MySQL é `@prisma/adapter-mariadb` (driver `mariadb`, compatível com o protocolo MySQL — confirmado na doc oficial `prisma.io/docs/orm/overview/databases/mysql`). `output` do generator definido como `../src/generated/prisma` (não especificado no design; caminho gerado dentro de `src/`, ignorado no git, acessível via alias `@/generated/prisma/*`). T7 e T15 devem usar `@prisma/adapter-mariadb`, não `@prisma/adapter-mysql2`.

**Commit**: `chore(scaffold): configure Prisma 7 client with driver adapter`

---

#### T3: Configurar Tailwind + shadcn/ui

**What**: `npx shadcn@latest init`, instalar componentes base (`button`, `input`, `label`, `form`, `card`).
**Where**: `src/components/ui/`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: AD-006

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npm run build` compila com os componentes shadcn importáveis
- [x] `Button`, `Input`, `Label`, `Form`, `Card` disponíveis em `src/components/ui/` (SPEC_DEVIATION: shadcn "form" foi descontinuado upstream — registry entry vazia; instalado `field` no lugar, sucessor oficial do shadcn/ui para blocos de formulário)

**Tests**: none
**Gate**: build

**Commit**: `chore(scaffold): configure Tailwind and shadcn/ui`

---

#### T4: Configurar Vitest

**What**: Instalar Vitest, criar `vitest.config.ts` (unit, exclui `*.integration.test.ts`) e script `test:unit`.
**Where**: `vitest.config.ts`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: infraestrutura (decisão do usuário: stack de testes)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npm run test:unit` executa (0 testes, exit 0)

**Tests**: none
**Gate**: build

**Commit**: `chore(scaffold): configure Vitest`

---

#### T5: Configurar Playwright

**What**: Instalar Playwright, `playwright.config.ts` com `webServer` apontando para o app Next.js, script `test:e2e`.
**Where**: `playwright.config.ts`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: infraestrutura (decisão do usuário: stack de testes)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npx playwright install --with-deps chromium` concluído
- [x] `npm run test:e2e` executa (0 testes, exit 0)

**Tests**: none
**Gate**: build

**Commit**: `chore(scaffold): configure Playwright`

---

#### T6: Banco de dados de teste (`spma_test`)

**What**: `.env.test` (`DATABASE_URL` → `spma_test` no mesmo MySQL do docker-compose - usuário `spma` já tem `GRANT ALL PRIVILEGES ON *.*`, nenhuma mudança de infra necessária), `vitest.integration.config.ts` carregando `.env.test`, script `db:test:reset` (`prisma migrate deploy` + truncate de tabelas de domínio) usado por `test:integration` e pelo global setup do Playwright.
**Where**: `.env.test`
**Depends on**: T2
**Reuses**: `docker-compose.yml` (MySQL já provisionado), `.env.example` como referência de formato
**Requirement**: infraestrutura (decisão do usuário: stack de testes)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npx prisma migrate deploy` com `DATABASE_URL` de `.env.test` cria o schema em `spma_test`
- [x] `scripts/db-test-reset.ts` executado manualmente limpa as tabelas sem erro

**Tests**: none
**Gate**: build

**Nota de execução**: nenhuma migration existia ainda no projeto (`prisma/migrations/` vazio) - `prisma migrate deploy` só aplica migrations existentes, não gera novas. Rodado `npx prisma migrate dev --name init` contra o banco `spma` (dev) para gerar a migration inicial (README passo 4); o resultado (`prisma/migrations/20260824194330_init/`) é commitado junto com T6, já que é o artefato que T6 precisa para `migrate deploy` funcionar em `spma_test`. `scripts/db-test-reset.ts` precisou de `tsx` (novo devDependency) para rodar: o client gerado pelo Prisma 7 (`output` customizado) usa imports relativos sem extensão (estilo bundler), que a execução nativa de TS do Node (sem bundler) não resolve. `SET FOREIGN_KEY_CHECKS` precisou ser envolvido em `prisma.$transaction(...)` - sem isso, cada `$executeRawUnsafe` podia pegar uma conexão diferente do pool do driver adapter, perdendo o efeito do `SET` entre um comando e outro.

**Commit**: `chore(scaffold): add spma_test database and integration test config`

---

#### T7: `prisma/seed.ts` - semente do Administrador Master

**What**: Script idempotente que cria o primeiro AM (`senhaHash: null`, `primeiraVez: true`) se nenhum `Usuario` com `tipo='AM'` existir; CPF/nome via variáveis de ambiente (`SEED_AM_CPF`, `SEED_AM_NOME`). Instancia seu próprio `PrismaClient` com o driver adapter do Prisma 7 (`@prisma/adapter-mysql2`, via T2) - script standalone, não usa o singleton de `lib/db/prisma.ts` (que só existe a partir de T15, fase posterior).
**Where**: `prisma/seed.ts`
**Depends on**: T2, T6
**Reuses**: nenhum (validação de formato de CPF é mínima/inline aqui - a regra módulo-11 completa em `lib/validation/cpf.ts` só existe a partir de T8; se necessário, revisitar o import depois é troca de uma linha)
**Requirement**: README passo 5 / pré-condição de REQ-AU-01 (login exige uma conta existente)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Rodar duas vezes seguidas não duplica o AM (idempotência)
- [x] AM criado tem `senhaHash=null`, `primeiraVez=true`, `tipo='AM'`
- [x] Teste de integração cobre: primeira execução cria; segunda execução não duplica

**Tests**: integration
**Gate**: full

**Commit**: `feat(seed): add idempotent Admin Master seed script`

---

### Phase 1: Domínio Puro (validação e autorização)

Sem I/O, sem banco - testável em isolamento.

```
T8 → T9
T8 → T11
```

*(T10, T12, T13, T14 dependem apenas de T1/T4, fora desta fase - sem dependência intra-fase.)*

#### T8: `lib/validation/cpf.ts` - validação de CPF (módulo 11)

**What**: `validarCPF(cpf: string): boolean` - algoritmo padrão módulo 11.
**Where**: `src/lib/validation/cpf.ts`
**Depends on**: T1, T4
**Reuses**: nenhum
**Requirement**: REQ-AU-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] CPFs válidos conhecidos retornam `true`
- [x] CPF com dígito verificador alterado retorna `false`
- [x] CPFs com todos os dígitos iguais (ex.: `111.111.111-11`) retornam `false`
- [x] CPF com tamanho incorreto retorna `false`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): add CPF mod-11 validator`

---

#### T9: `lib/validation/schemas/login.schema.ts`

**What**: Schema Zod `{ cpf: string, senha: string }`, `cpf` validado via `validarCPF`.
**Where**: `src/lib/validation/schemas/login.schema.ts`
**Depends on**: T8
**Reuses**: `lib/validation/cpf.ts`
**Requirement**: REQ-AU-01, REQ-AU-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] CPF inválido rejeitado pelo schema
- [x] Senha vazia rejeitada
- [x] Payload válido passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): add login schema`

---

#### T10: `lib/validation/schemas/primeiro-acesso.schema.ts`

**What**: Schema Zod `{ senha: string, confirmacaoSenha: string }`, senha mínimo 8 caracteres (AD-030/REQ-SEC-06), `.refine` confirmando igualdade.
**Where**: `src/lib/validation/schemas/primeiro-acesso.schema.ts`
**Depends on**: T1, T4
**Reuses**: nenhum
**Requirement**: REQ-AU-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Senha com menos de 8 caracteres rejeitada
- [x] Confirmação diferente da senha rejeitada
- [x] Payload válido passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): add primeiro-acesso schema`

---

#### T11: `lib/validation/schemas/usuario.schema.ts`

**What**: Schema Zod para criação de usuário em cascata `{ cpf, nome, email?, tipo, cdOfertante? }`, `cpf` validado via `validarCPF`.
**Where**: `src/lib/validation/schemas/usuario.schema.ts`
**Depends on**: T8
**Reuses**: `lib/validation/cpf.ts`
**Requirement**: REQ-AU-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] CPF inválido rejeitado
- [x] `tipo` fora do enum `TipoUsuario` rejeitado
- [x] Payload válido para cada `tipo` passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): add usuario schema`

---

#### T12: `lib/validation/schemas/ofertante.schema.ts`

**What**: Schema Zod para auto-cadastro de Ofertante `{ nome, responsavel?, email?, telefone?, uf, municipio? }`.
**Where**: `src/lib/validation/schemas/ofertante.schema.ts`
**Depends on**: T1, T4
**Reuses**: nenhum
**Requirement**: REQ-AU-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `nome` e `uf` obrigatórios; `uf` com 2 caracteres
- [x] Payload válido passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validation): add ofertante schema`

---

#### T13: `lib/auth/cascata.ts` - matriz de autorização de criação

**What**: `TIPOS_PERMITIDOS`, `podeCriar(criador, alvo): boolean`, `resolverOfertante(criador, alvoTipo, cdOfertanteInformado?): number | null`.
**Where**: `src/lib/auth/cascata.ts`
**Depends on**: T1, T4
**Reuses**: enum `TipoUsuario` do Prisma Client
**Requirement**: REQ-AU-05, REQ-AU-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `podeCriar` cobre as 6x6 combinações da matriz (AM→todos; GT→GT/VT/GO; GO→GO/VO/AL; VT/VO/AL→nenhum)
- [x] `resolverOfertante` ignora `cdOfertanteInformado` quando criador é GO (usa o próprio `cdOfertante`)
- [x] `resolverOfertante` usa `cdOfertanteInformado` quando criador é AM/GT e alvo é GO/VO
- [x] `resolverOfertante` retorna `null` para alvo AM/GT/VT/AL

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): add cascade authorization matrix`

---

#### T14: `lib/auth/password.ts` - hash de senha

**What**: `hashPassword(senha): Promise<string>` / `verifyPassword(hash, senha): Promise<boolean>` via `argon2` (argon2id).
**Where**: `src/lib/auth/password.ts`
**Depends on**: T1, T4
**Reuses**: nenhum
**Requirement**: REQ-SEC-05 (AD-030), usado por REQ-AU-01/02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Hash de uma senha não é igual ao texto original nem reversível por inspeção simples
- [x] `verifyPassword` retorna `true` para a senha correta e `false` para incorreta
- [x] Dois hashes da mesma senha são diferentes entre si (salt)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): add argon2id password hashing`

---

### Phase 2: Sessão e Persistência

```
T15 → T16
T15 → T17
T17 → T18
```

#### T15: `lib/db/prisma.ts` - singleton do Prisma Client

**What**: Singleton que evita múltiplas instâncias em hot-reload de dev. Instancia `PrismaClient` com `{ adapter }` via `@prisma/adapter-mysql2` (obrigatório no Prisma 7, sem fallback - ver design.md Tech Decisions).
**Where**: `src/lib/db/prisma.ts`
**Depends on**: T2
**Reuses**: client gerado em T2 (`provider = "prisma-client"`, caminho de `output` do schema)
**Requirement**: infraestrutura

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Import repetido do módulo não cria nova conexão (padrão `globalThis` documentado no arquivo)
- [x] `npx tsc --noEmit` passa

**Tests**: none
**Gate**: build

**Commit**: `feat(db): add Prisma client singleton`

---

#### T16: `lib/auth/rate-limit.ts` - bloqueio por tentativas

**What**: `estaBloqueado(usuario): boolean`, `registrarFalha(cpf): Promise<void>` (incrementa `tentativasFalhas`; na 5ª falha seta `bloqueadoAte = now + 15min`), `resetarTentativas(cpf): Promise<void>`.
**Where**: `src/lib/auth/rate-limit.ts`
**Depends on**: T15, T6
**Reuses**: `Usuario.tentativasFalhas`, `Usuario.bloqueadoAte` (schema existente)
**Requirement**: REQ-AU-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Teste de integração (contra `spma_test`): 5 chamadas a `registrarFalha` setam `bloqueadoAte` ~15min no futuro
- [x] `estaBloqueado` retorna `true` enquanto `bloqueadoAte > now`, `false` após expirar
- [x] `resetarTentativas` zera `tentativasFalhas` e limpa `bloqueadoAte`

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): add account-level login rate limiting`

---

#### T17: `lib/auth/session.ts` - ciclo de vida da sessão

**What**: `criarSessao(cpf): Promise<{id, expiraEm}>` (TTL fixo de 60min - ver design.md Tech Decisions), `rotacionarSessao(sessaoAnteriorId, cpf): Promise<{id}>` (destrói a anterior, cria nova), `destruirSessao(id): Promise<void>`, `buscarSessaoValida(id): Promise<{usuario, sessao} | null>` (parte testável em isolamento), `obterSessao()` e `setCookieSessao(id, expiraEm): void` (wrappers finos sobre `next/headers`, exercidos via e2e nas rotas que os consomem - T19/T21, não testados isoladamente aqui).
**Where**: `src/lib/auth/session.ts`
**Depends on**: T15, T6
**Reuses**: modelo `Sessao`
**Requirement**: REQ-AU-01, REQ-AU-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Teste de integração: `criarSessao` grava linha em `TB_Sessao` com `expiraEm` ~60min no futuro
- [x] Teste de integração: `rotacionarSessao` remove a sessão anterior e cria uma nova com id diferente
- [x] Teste de integração: `buscarSessaoValida` retorna `null` para id inexistente e para sessão com `expiraEm` no passado
- [x] Teste de integração: `destruirSessao` remove a linha

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): add session lifecycle management`

---

#### T18: `lib/auth/guards.ts` - guardas de rota

**What**: `requireSession()` (redireciona/401 se sessão inválida), `requirePrimeiroAcessoConcluido(usuario)` (força `/primeiro-acesso` enquanto `primeiraVez`), `requireOfertanteVinculado(usuario)` (força `/cadastro-ofertante` para GO sem `cdOfertante`).
**Where**: `src/lib/auth/guards.ts`
**Depends on**: T17
**Reuses**: `lib/auth/session.ts`
**Requirement**: REQ-AU-02, REQ-AU-09, REQ-SEC-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Teste unitário (mock de `session.ts`, `next/navigation.redirect`, `next/headers.cookies`): sessão ausente/expirada dispara redirect para `/login`
- [x] Teste unitário: `primeiraVez=true` dispara redirect para `/primeiro-acesso`
- [x] Teste unitário: GO com `cdOfertante=null` dispara redirect para `/cadastro-ofertante`
- [x] Teste unitário: usuário válido, sem pendências, não dispara nenhum redirect

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): add route guard helpers`

---

### Phase 3: Rotas de API

Todas as dependências desta fase apontam para fases anteriores (nenhuma dependência real entre as rotas entre si) - execução segue a ordem da lista, sem arestas intra-fase.

```
T19
T20
T21
T22
T23
```

#### T19: `POST /api/auth/login`

**What**: Route handler: valida `login.schema`, checa `estaBloqueado`, verifica senha (ou detecta 1º acesso quando `senhaHash` é null), cria sessão, seta cookie via `setCookieSessao`.
**Where**: `src/app/api/auth/login/route.ts`
**Depends on**: T9, T14, T16, T17
**Reuses**: todos os módulos de `lib/auth` e `lib/validation` acima
**Requirement**: REQ-AU-01, REQ-AU-02 (gatilho), REQ-AU-03, REQ-AU-04, REQ-AU-11, REQ-AU-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e CA-AU-01: CPF+senha corretos → 200, cookie de sessão com `HttpOnly`, `Secure`, `SameSite=Lax` no header `Set-Cookie`
- [x] e2e CA-AU-02 (gatilho): conta com `senhaHash=null` → sessão "pendente" criada, resposta indica necessidade de definir senha
- [x] e2e CA-AU-03: CPF com dígito verificador inválido → erro específico de CPF inválido, sem tocar o banco (a parte "sem tocar o banco" não é observável por HTTP: garantida por construção — `safeParse` e o retorno 400 precedem o primeiro acesso ao Prisma em `route.ts`)
- [x] e2e CA-AU-04: CPF inexistente e CPF existente com senha errada → mesma resposta (corpo e status) nos dois casos
- [x] e2e CA-AU-08: 5 falhas consecutivas → 6ª tentativa (mesmo com senha certa) rejeitada com a mesma mensagem genérica
- [x] e2e CA-AU-09: login rotaciona o id de sessão (cookie anterior, se enviado, deixa de ser aceito)
- [x] e2e CA-AU-10: resposta de login não contém `senhaHash` nem `senha`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add login API route`

---

#### T20: `POST /api/auth/primeiro-acesso`

**What**: Route handler: exige sessão válida (pendente ou não) via `requireSession()`, valida `primeiro-acesso.schema`, grava `senhaHash` (via `hashPassword`) e `primeiraVez=false`, mantém a sessão ativa.
**Where**: `src/app/api/auth/primeiro-acesso/route.ts`
**Depends on**: T10, T14, T17, T18
**Reuses**: `lib/auth/guards.ts`, `lib/auth/password.ts`
**Requirement**: REQ-AU-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e CA-AU-02: usuário em 1º acesso, ao concluir, tem `primeiraVez=false` e `senhaHash` preenchido no banco
- [x] e2e: sem sessão válida → 401, não altera nenhum usuário
- [x] e2e: senha menor que 8 caracteres → rejeitada, `primeiraVez` continua `true`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add primeiro-acesso API route`

---

#### T21: `POST /api/auth/logout`

**What**: Route handler: `requireSession()` + `destruirSessao()`, limpa cookie.
**Where**: `src/app/api/auth/logout/route.ts`
**Depends on**: T17
**Reuses**: `lib/auth/session.ts`
**Requirement**: REQ-AU-12 (encerramento de sessão, complementa rotação)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: após logout, o cookie de sessão anterior não autentica mais requisições protegidas
- [x] e2e: logout sem sessão ativa não gera erro 500 (idempotente/401 tratado — escolhido 401, documentado no route handler)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add logout API route`

---

#### T22: `POST /api/usuarios` - criação em cascata

**What**: Route handler: `requireSession()`, valida `usuario.schema`, checa `podeCriar(criador.tipo, alvo.tipo)` → 403 se negado, resolve `cdOfertante` via `resolverOfertante`, cria `Usuario` com `criadoPor`/`dataCriacao`.
**Where**: `src/app/api/usuarios/route.ts`
**Depends on**: T11, T13, T18
**Reuses**: `lib/auth/cascata.ts`, `lib/validation/schemas/usuario.schema.ts`
**Requirement**: REQ-AU-05, REQ-AU-06, REQ-AU-07, REQ-AU-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e CA-AU-05: GO autenticado cria AL → 201, `criadoPor`/`dataCriacao` registrados
- [x] e2e CA-AU-06: GO autenticado forja criação de GT → 403, nenhum usuário criado
- [x] e2e REQ-AU-08: GO cria GO/VO → `cdOfertante` do novo usuário é sempre o do criador, mesmo se o payload enviar outro valor
- [x] e2e: sem sessão válida → 401

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add cascading user creation API route`

---

#### T23: `POST /api/ofertantes` - auto-cadastro do GO

**What**: Route handler: `requireSession()`, só permite quando `usuario.tipo === 'GO' && usuario.cdOfertante === null`, valida `ofertante.schema`, cria `Ofertante` e vincula `cdOfertante` ao usuário.
**Where**: `src/app/api/ofertantes/route.ts`
**Depends on**: T12, T18
**Reuses**: `lib/validation/schemas/ofertante.schema.ts`
**Requirement**: REQ-AU-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO sem `cdOfertante` cadastra Ofertante → 201, usuário passa a ter `cdOfertante` preenchido
- [x] e2e: GO que já tem `cdOfertante` tentando cadastrar outro → rejeitado (escolhido 409, documentado no route handler)
- [x] e2e: perfil diferente de GO tentando usar a rota → 403

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add self-service Ofertante registration route`

---

### Phase 4: Páginas e Integração Final

```
T25 → T26
T25 → T27
T25 → T28
T25 → T29
```

*(T24 e T30 dependem apenas de tarefas de fases anteriores - sem dependência intra-fase.)*

#### T24: `/login` page

**What**: Página pública com formulário CPF+senha (shadcn `Form`/`Input`/`Button`), consome `POST /api/auth/login`, redireciona conforme resposta (sessão pendente → `/primeiro-acesso`; sessão completa → área protegida).
**Where**: `src/app/(public)/login/page.tsx`
**Depends on**: T3, T9, T19
**Reuses**: componentes shadcn (T3), `login.schema` (T9) para validação no cliente (AD-004 - conveniência, servidor é autoridade)
**Requirement**: REQ-AU-01, REQ-AU-03, REQ-AU-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: fluxo completo pela UI real (não só API) cobre CA-AU-01, CA-AU-03, CA-AU-04

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add login page`

---

#### T25: `(protegido)/layout.tsx` - wiring das guardas

**What**: Layout Server Component que chama, em ordem, `requireSession()` → `requirePrimeiroAcessoConcluido()` → `requireOfertanteVinculado()`.
**Where**: `src/app/(protegido)/layout.tsx`
**Depends on**: T18, T3
**Reuses**: `lib/auth/guards.ts`
**Requirement**: REQ-AU-02, REQ-AU-09, REQ-SEC-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: visitar qualquer rota protegida sem sessão → redireciona para `/login`
- [x] e2e: sessão válida mas `primeiraVez=true` → redireciona para `/primeiro-acesso` mesmo tentando acessar outra rota protegida diretamente
- [x] e2e: `primeiraVez=false` mas GO sem `cdOfertante` → redireciona para `/cadastro-ofertante`

**Tests**: e2e
**Gate**: full

**Nota de execução**: confirmado empiricamente (curl direto ao dev server) que `/primeiro-acesso` e `/cadastro-ofertante` NÃO podem viver sob este mesmo `(protegido)/layout.tsx` como design.md original descrevia: como os dois guards redirecionam incondicionalmente para essas rotas sempre que a pendência existe, visitar a própria rota-alvo (ex.: `/primeiro-acesso` com `primeiraVez=true`) faz o guard redirecionar para si mesma - Server Components não expõem o pathname da requisição atual (`next/headers` não tem isso; só `usePathname`, client-side), então o layout não tem como pular o guard "estou indo exatamente para lá". Resultado observado: HTTP 307 com `location: /primeiro-acesso` ao pedir `/primeiro-acesso` - loop infinito no mundo real. Resolução: `/primeiro-acesso` (T26) e `/cadastro-ofertante` (T27) passam a viver em `src/app/(onboarding)/`, grupo irmão guardado só por `requireSession()` (mesmas URLs finais - grupos de rota não aparecem na URL). `src/app/(protegido)/layout.tsx` continua chamando as três guardas exatamente na ordem definida. Um stub mínimo de `/painel` (`src/app/(protegido)/painel/page.tsx`, substituído em T28) foi adicionado neste commit: o App Router não invoca o layout de um segmento sem uma página folha casando com a URL, então o guard chain só é testável e2e com pelo menos uma rota real sob `(protegido)`.

**Commit**: `feat(auth): wire route guards into protected layout`

---

#### T26: `/primeiro-acesso` page

**What**: Página com formulário de nova senha + confirmação, consome `POST /api/auth/primeiro-acesso`.
**Where**: `src/app/(protegido)/primeiro-acesso/page.tsx`
**Depends on**: T25, T10, T20
**Reuses**: `primeiro-acesso.schema` (T10), componentes shadcn
**Requirement**: REQ-AU-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e CA-AU-02 completo pela UI: usuário em 1º acesso define senha, é liberado para o restante do sistema

**Tests**: e2e
**Gate**: full

**Nota de execução**: path real é `src/app/(onboarding)/primeiro-acesso/page.tsx` + `src/app/(onboarding)/layout.tsx` (novo, guarda só com `requireSession()`), não `src/app/(protegido)/...` como declarado acima - ver nota de execução de T25 (self-redirect loop confirmado empiricamente). Mesma URL final `/primeiro-acesso`; `primeiro-acesso.schema` e os componentes shadcn são reusados exatamente como previsto.

**Commit**: `feat(auth): add primeiro-acesso page`

---

#### T27: `/cadastro-ofertante` page

**What**: Página com formulário de cadastro de Ofertante, consome `POST /api/ofertantes`.
**Where**: `src/app/(protegido)/cadastro-ofertante/page.tsx`
**Depends on**: T25, T12, T23
**Reuses**: `ofertante.schema` (T12), componentes shadcn
**Requirement**: REQ-AU-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e CA-AU-07 completo pela UI: GO sem Ofertante é barrado, cadastra, e passa a acessar o restante do sistema

**Tests**: e2e
**Gate**: full

**Nota de execução**: path real é `src/app/(onboarding)/cadastro-ofertante/page.tsx`, não `src/app/(protegido)/...` como declarado acima - mesma causa e mesma resolução de T26 (ver nota de execução de T25). Reusa o `(onboarding)/layout.tsx` já criado em T26, sem arquivo de layout novo.

**Commit**: `feat(auth): add cadastro-ofertante page`

---

#### T28: `/painel` page - roteamento por perfil

**What**: Landing pós-login/pós-gates; conteúdo mínimo condicionado a `usuario.tipo` (lista de módulos disponíveis ao perfil - base para próximas features, sem lógica de negócio adicional).
**Where**: `src/app/(protegido)/painel/page.tsx`
**Depends on**: T25
**Reuses**: nenhum
**Requirement**: REQ-AU-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e: usuários de perfis diferentes (AM vs AL, por exemplo) veem conteúdo/opções diferentes no painel

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add profile-routed painel page`

---

#### T29: `/usuarios/novo` page - formulário de cascata

**What**: Formulário de criação de usuário, opções de `tipo` filtradas por `TIPOS_PERMITIDOS[usuarioLogado.tipo]`, consome `POST /api/usuarios`.
**Where**: `src/app/(protegido)/usuarios/novo/page.tsx`
**Depends on**: T25, T11, T13, T22
**Reuses**: `usuario.schema` (T11), `cascata.ts` (T13, para filtrar opções no client), componentes shadcn
**Requirement**: REQ-AU-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e CA-AU-05 completo pela UI: GO logado só vê GO/VO/AL como opções e consegue criar um AL

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add cascading user creation page`

---

#### T30: `src/proxy.ts` - redirect leve por cookie

**What**: Proxy Next.js 16 (Node.js runtime por padrão) que redireciona para `/login` quando a rota está no grupo protegido e não há cookie de sessão presente - só UX, não autoridade (ver design.md).
**Where**: `src/proxy.ts`
**Depends on**: T17
**Reuses**: nome do cookie definido em `lib/auth/session.ts`
**Requirement**: REQ-AU-12 (suporte), REQ-SEC-14 (não substitui a checagem em `requireSession`)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e: requisição sem cookie a uma rota protegida é redirecionada para `/login` antes mesmo de renderizar o layout
- [ ] Confirmado por leitura de código que `proxy.ts` não faz nenhuma chamada a `prisma`/banco (mantém-se "thin")

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add lightweight cookie-presence proxy`

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Next.js scaffold | 1 setup action (indivisible) | ✅ Granular |
| T2: Prisma config | 1 setup action | ✅ Granular |
| T3: Tailwind+shadcn | 1 setup action | ✅ Granular |
| T4: Vitest config | 1 config file | ✅ Granular |
| T5: Playwright config | 1 config file | ✅ Granular |
| T6: Test DB setup | 1 setup concern (env+config+script) | ✅ Granular |
| T7: seed.ts | 1 file | ✅ Granular |
| T8: cpf.ts | 1 function | ✅ Granular |
| T9: login.schema.ts | 1 file | ✅ Granular |
| T10: primeiro-acesso.schema.ts | 1 file | ✅ Granular |
| T11: usuario.schema.ts | 1 file | ✅ Granular |
| T12: ofertante.schema.ts | 1 file | ✅ Granular |
| T13: cascata.ts | 1 file (3 related exports) | ✅ Granular |
| T14: password.ts | 1 file (2 related functions) | ✅ Granular |
| T15: prisma.ts singleton | 1 file | ✅ Granular |
| T16: rate-limit.ts | 1 file | ✅ Granular |
| T17: session.ts | 1 file (5 related functions, one concern: session lifecycle) | ✅ Granular |
| T18: guards.ts | 1 file (3 related guards) | ✅ Granular |
| T19: login route | 1 endpoint | ✅ Granular |
| T20: primeiro-acesso route | 1 endpoint | ✅ Granular |
| T21: logout route | 1 endpoint | ✅ Granular |
| T22: usuarios route | 1 endpoint | ✅ Granular |
| T23: ofertantes route | 1 endpoint | ✅ Granular |
| T24: login page | 1 page | ✅ Granular |
| T25: protected layout | 1 file | ✅ Granular |
| T26: primeiro-acesso page | 1 page | ✅ Granular |
| T27: cadastro-ofertante page | 1 page | ✅ Granular |
| T28: painel page | 1 page | ✅ Granular |
| T29: usuarios/novo page | 1 page | ✅ Granular |
| T30: proxy.ts | 1 file | ✅ Granular |

*(T1-T6 legitimately touch more than one config file each - indivisible setup actions, not a granularity smell; confirmed against the Test Coverage Matrix's "Config/scaffold" row, which requires no dedicated tests for this layer.)*

---

## Diagram-Definition Cross-Check

Parity is required only for **intra-phase** edges (same phase on both ends) - a cross-phase dependency is validated separately by the forward-phase-order rule (a task may only depend on the same phase or an earlier one) and needs no diagram arrow.

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T5 | T1 | T1 → T5 | ✅ Match |
| T6 | T2 | T2 → T6 | ✅ Match |
| T7 | T2, T6 | T2 → T7, T6 → T7 | ✅ Match |
| T8 | T1, T4 | cross-phase (Phase 0 → Phase 1) | ✅ Exempt |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T1, T4 | cross-phase | ✅ Exempt |
| T11 | T8 | T8 → T11 | ✅ Match |
| T12 | T1, T4 | cross-phase | ✅ Exempt |
| T13 | T1, T4 | cross-phase | ✅ Exempt |
| T14 | T1, T4 | cross-phase | ✅ Exempt |
| T15 | T2 | cross-phase | ✅ Exempt |
| T16 | T15, T6 | T15 → T16 (intra-phase); T6 cross-phase | ✅ Match |
| T17 | T15, T6 | T15 → T17 (intra-phase); T6 cross-phase | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T9, T14, T16, T17 | cross-phase (Phase 1/2 → Phase 3) | ✅ Exempt |
| T20 | T10, T14, T17, T18 | cross-phase | ✅ Exempt |
| T21 | T17 | cross-phase | ✅ Exempt |
| T22 | T11, T13, T18 | cross-phase | ✅ Exempt |
| T23 | T12, T18 | cross-phase | ✅ Exempt |
| T24 | T3, T9, T19 | cross-phase (Phase 0/1/3 → Phase 4) | ✅ Exempt |
| T25 | T18, T3 | cross-phase | ✅ Exempt |
| T26 | T25, T10, T20 | T25 → T26 (intra-phase); T10/T20 cross-phase | ✅ Match |
| T27 | T25, T12, T23 | T25 → T27 (intra-phase); T12/T23 cross-phase | ✅ Match |
| T28 | T25 | T25 → T28 | ✅ Match |
| T29 | T25, T11, T13, T22 | T25 → T29 (intra-phase); rest cross-phase | ✅ Match |
| T30 | T17 | cross-phase | ✅ Exempt |

No task depends on a later phase. All dependencies point backward or within the same phase. `python3 validate_tasks.py` confirms this structurally (see below).

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1-T6 | Config/scaffold | none | none | ✅ OK |
| T7 | Service/data-access (seed) | integration | integration | ✅ OK |
| T8-T14 | Domain/pure logic | unit | unit | ✅ OK |
| T15 | Config/scaffold (singleton) | none | none | ✅ OK |
| T16, T17 | Service/data-access | integration | integration | ✅ OK |
| T18 | Auth branch logic (guards) | unit (mocked) | unit | ✅ OK |
| T19-T23 | API routes | e2e | e2e | ✅ OK |
| T24, T26-T29 | Pages | e2e | e2e | ✅ OK |
| T25 | Protected layout (routes/guards wiring) | e2e | e2e | ✅ OK |
| T30 | Config/scaffold (proxy, thin) | none | e2e | ✅ OK (stricter than matrix minimum - acceptable) |

No violations. No task claims `Tests: none` for a layer the matrix requires a real test type for.

---

## Requirement Traceability

| Requirement | Covered by |
| --- | --- |
| REQ-AU-01 | T17, T19, T24 |
| REQ-AU-02 | T10, T18, T20, T25, T26 |
| REQ-AU-03 | T8, T9, T11, T19, T24 |
| REQ-AU-04 | T19, T24 |
| REQ-AU-05 | T11, T13, T22, T29 |
| REQ-AU-06 | T13, T22 |
| REQ-AU-07 | T22 |
| REQ-AU-08 | T13, T22, T23 |
| REQ-AU-09 | T12, T18, T23, T25, T27 |
| REQ-AU-10 | T28 |
| REQ-AU-11 | T16, T19 |
| REQ-AU-12 | T17, T19, T21, T30 |

All 12 requirements have at least one task. All 10 acceptance criteria (CA-AU-01 to CA-AU-10) are referenced in `Done when` blocks above.
