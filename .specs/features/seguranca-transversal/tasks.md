# seguranca-transversal Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/seguranca-transversal/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Herdada de `auth-e-usuarios/tasks.md` (mesmo projeto, mesma stack já aprovada e em uso): Vitest (unit/integration) + Playwright (e2e). Linhas abaixo mapeiam os componentes NOVOS/MODIFICADOS desta feature nas mesmas camadas já estabelecidas.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain/pure logic (`lib/log/mask.ts`, `lib/auth/password.ts` DUMMY_HASH, `lib/auth/guards.ts` `podeAcessarOfertante`, `lib/errors/api-error.ts`, `lib/security/csrf-client.ts`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Security logic dependendo de APIs de requisição do Next (`lib/security/csrf.ts`) | unit (mocked `next/headers`) | Todos os ramos: token ausente, presente e igual, presente e diferente, tamanhos diferentes | `src/lib/security/csrf.test.ts` | `npm run test:unit` |
| Service/data-access com banco real (`lib/auth/rate-limit-ip.ts`, `lib/auth/session.ts` sliding window, migration) | integration | Key paths + error handling, contra `spma_test` real via Prisma | `src/**/*.integration.test.ts` | `npm run test:integration` |
| API routes + Pages (fluxos completos de segurança) | e2e | Todas as rotas tocadas: happy path + cada edge case listado + paths de erro, via browser/API context contra `spma_test` real | `e2e/*.spec.ts` | `npm run test:e2e` |
| Config/scaffold (`next.config.ts` headers, `proxy.ts` nonce/CSP, `error.tsx`/`global-error.tsx`) | none | - (build gate only; comportamento observável coberto indiretamente por `e2e/security-headers.spec.ts`) | - | build gate only |

## Gate Check Commands

> Herdada de `auth-e-usuarios/tasks.md` - mesma ordem de build (Next 16 gera `LayoutProps` durante o build; `typecheck` antes de um build prévio falha em checkout limpo).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test:unit` |
| Full | After tasks with integration/e2e tests | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | After phase completion or config/scaffold-only tasks | `npm run lint && npm run build && npm run typecheck` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Each phase's dependency diagram is embedded directly above its tasks in the **Task Breakdown** section below.

## Task Breakdown

**22 tasks total** → Phase 1 (7), Phase 2 (4), Phase 3 (5), Phase 4 (4), Phase 5 (2). Exact batch grouping decidida no Execute via offer-then-confirm.

---

### Phase 1: Fundações (módulos novos, sem tocar rotas existentes)

```
T1 → T4
```

#### T1: Model `TentativaLoginIp` + migration

**What**: Adicionar model `TentativaLoginIp` (`@@map("TB_Tentativa_Login_Ip")`) ao `schema.prisma`: `ip String @id @db.VarChar(45)`, `tentativas Int @default(0)`, `bloqueadoAte DateTime?`, `atualizadoEm DateTime @updatedAt`. Gerar migration incremental (`prisma migrate dev`).
**Where**: `prisma/schema.prisma`, `prisma/migrations/`
**Depends on**: None
**Reuses**: convenção `@@map`/nomes de coluna já usada em `Usuario.tentativasFalhas`/`bloqueadoAte`
**Requirement**: REQ-SEC-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npx prisma validate` passa
- [x] Migration aplicada em `spma_test` sem erro
- [x] Nenhum model/enum existente alterado (diff restrito à adição do novo model)

**Tests**: none
**Gate**: build

**Commit**: `feat(seguranca): add TentativaLoginIp model for IP rate limiting`

---

#### T2: `src/lib/log/mask.ts` - `mascararCPF`

**What**: Função pura `mascararCPF(cpf: string): string` que mantém os 3 primeiros e 2 últimos dígitos, mascarando o resto (ex.: `52998224725` → `529******25`).
**Where**: `src/lib/log/mask.ts`
**Depends on**: None
**Reuses**: nenhum
**Requirement**: REQ-SEC-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] CPF de 11 dígitos mascarado corretamente
- [x] CPF formatado (com pontuação) também mascarado corretamente
- [x] Entrada mais curta que o esperado não lança exceção (edge case defensivo - log nunca pode derrubar o processo)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(seguranca): add CPF log masking utility`

---

#### T3: `src/lib/auth/password.ts` - `DUMMY_HASH`

**What**: Exportar constante `DUMMY_HASH`, um hash argon2id pré-computado de uma string fixa (não é senha de ninguém), usado para normalizar o tempo do login quando não há hash real para comparar.
**Where**: `src/lib/auth/password.ts` (modificar)
**Depends on**: None
**Reuses**: `hashPassword`/`verifyPassword` já existentes
**Requirement**: REQ-SEC-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `verifyPassword(DUMMY_HASH, "qualquer coisa")` resolve `false` sem lançar
- [x] Nenhuma função existente de `password.ts` alterada

**Tests**: unit
**Gate**: quick

**Commit**: `feat(seguranca): add dummy hash constant for login timing normalization`

---

#### T4: `src/lib/auth/rate-limit-ip.ts`

**What**: `obterIpCliente(request: Request): string` (lê `x-forwarded-for`, primeiro IP da lista; `"desconhecido"` se ausente), `ipEstaBloqueado(ip): Promise<boolean>`, `registrarFalhaIp(ip): Promise<void>` (mesma mecânica de `rate-limit.ts`: incrementa `tentativas`, bloqueia por `BLOQUEIO_MS` ao atingir `MAX_TENTATIVAS_IP = 20`).
**Where**: `src/lib/auth/rate-limit-ip.ts`
**Depends on**: T1
**Reuses**: `BLOQUEIO_MS` de `src/lib/auth/rate-limit.ts`; mesmo padrão de `estaBloqueado`/`registrarFalha`
**Requirement**: REQ-SEC-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `obterIpCliente` extrai o primeiro IP de uma lista `x-forwarded-for` com múltiplos IPs (proxy encadeado)
- [x] `obterIpCliente` retorna `"desconhecido"` quando o header está ausente
- [x] IP sem histórico não está bloqueado
- [x] IP com 20 falhas fica bloqueado por `BLOQUEIO_MS`, contra `spma_test` real

**Tests**: integration
**Gate**: full

**Commit**: `feat(seguranca): add IP-based login rate limiting`

---

#### T5: `src/lib/security/csrf.ts`

**What**: `COOKIE_CSRF = "spma_csrf"`; `setCookieCSRF(): Promise<string>` (gera token via `crypto.randomUUID()`, grava cookie secure/sameSite=lax/**não** httpOnly, retorna o valor); `verificarCSRF(request: Request): Promise<boolean>` (compara cookie da requisição com header `x-csrf-token` em tempo constante via `crypto.timingSafeEqual`, com checagem de tamanho antes de comparar); `limparCookieCSRF(): Promise<void>`.
**Where**: `src/lib/security/csrf.ts`
**Depends on**: None
**Reuses**: padrão de `lib/auth/session.ts` para leitura/escrita de cookie via `next/headers`
**Requirement**: REQ-SEC-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `verificarCSRF` retorna `true` quando cookie e header coincidem
- [x] `verificarCSRF` retorna `false` quando o header está ausente
- [x] `verificarCSRF` retorna `false` quando cookie e header têm valores diferentes (inclusive tamanhos diferentes, sem lançar exceção do `timingSafeEqual`)
- [x] `verificarCSRF` retorna `false` quando o cookie está ausente

**Tests**: unit
**Gate**: quick

**Commit**: `feat(seguranca): add double-submit CSRF cookie helpers`

---

#### T6: `src/lib/security/csrf-client.ts`

**What**: `headerCSRF(cookieString = typeof document !== "undefined" ? document.cookie : ""): Record<string, string>` - extrai o valor de `spma_csrf` da string de cookies informada e devolve `{ "x-csrf-token": valor }`, ou `{}` se ausente. Parâmetro opcional injetável para ser testável sem jsdom (ambiente Vitest do projeto é `node`).
**Where**: `src/lib/security/csrf-client.ts`
**Depends on**: None
**Reuses**: nenhum
**Requirement**: REQ-SEC-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Extrai o token corretamente de uma string de cookies com múltiplos cookies
- [x] Devolve `{}` quando `spma_csrf` não está presente

**Tests**: unit
**Gate**: quick

**Commit**: `feat(seguranca): add client-side CSRF header helper`

---

#### T7: `src/lib/auth/guards.ts` - `podeAcessarOfertante`

**What**: `podeAcessarOfertante(usuario: { tipo: TipoUsuario; cdOfertante: number | null }, cdOfertanteAlvo: number): boolean` - AM/GT sempre `true` (escopo nacional, AD-012); GO/VO só `true` se `usuario.cdOfertante === cdOfertanteAlvo`; AL sempre `false` (escopo por curso, não por ofertante). Guarda reutilizável para a próxima feature que expuser um recurso escopado por Ofertante (`ofertante-e-verba`) - ver design.md Riscos.
**Where**: `src/lib/auth/guards.ts` (modificar)
**Depends on**: None
**Reuses**: mesmo estilo de função pura de `cascata.ts` (`podeCriar`)
**Requirement**: REQ-SEC-14 (fundação; consumo real na próxima feature)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] AM e GT: `true` para qualquer `cdOfertanteAlvo`
- [x] GO/VO vinculado ao ofertante 1 pedindo ofertante 2: `false`
- [x] GO/VO vinculado ao ofertante 1 pedindo ofertante 1: `true`
- [x] AL: sempre `false`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(seguranca): add reusable ofertante-scope guard`

---

### Phase 2: Camadas transversais (erro genérico, headers, CSP)

```
T8 (independente de T9, T10, T11 - todos independentes entre si nesta fase)
```

#### T8: `src/lib/errors/api-error.ts` - `comTratamentoDeErro`

**What**: Higher-order function `comTratamentoDeErro<H extends (...args: any[]) => Promise<Response>>(handler: H): H` que envolve um Route Handler, captura qualquer exceção não tratada, gera `idCorrelacao` (`crypto.randomUUID()`), loga `console.error(idCorrelacao, erro)` no servidor com `mascararCPF` aplicado a qualquer CPF reconhecível no contexto logado, e devolve `NextResponse.json({ erro: "Erro interno. Contate o suporte informando o código.", idCorrelacao }, { status: 500 })`.
**Where**: `src/lib/errors/api-error.ts`
**Depends on**: T2
**Reuses**: `mascararCPF` (T2)
**Requirement**: REQ-SEC-11, REQ-SEC-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Handler que lança uma exceção qualquer é capturado e devolve 500 com `erro` genérico + `idCorrelacao` (uuid), nunca a mensagem/stack original no corpo da resposta
- [x] Handler que responde normalmente (não lança) passa através sem alteração

**Tests**: unit
**Gate**: quick

**Commit**: `feat(seguranca): add generic error wrapper with correlation id`

---

#### T9: `next.config.ts` - cabeçalhos de segurança estáticos

**What**: `headers()` assíncrono aplicado a `/(.*)`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`. **Não** inclui `Content-Security-Policy` aqui (é dinâmico, por nonce, emitido em `proxy.ts` - T10).
**Where**: `next.config.ts`
**Depends on**: None
**Reuses**: nenhum
**Requirement**: REQ-SEC-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npm run build` compila sem erro
- [x] Cada header listado presente na resposta de `GET /login` (verificado manualmente ou por `curl -I`)

**Tests**: none
**Gate**: build

**Commit**: `feat(seguranca): add static security response headers`

---

#### T10: `src/proxy.ts` - nonce + CSP por requisição

**What**: Gerar um nonce por requisição (`crypto.randomUUID()` em base64), montar o header `Content-Security-Policy` (receita oficial do Next para App Router: `script-src 'self' 'nonce-X' 'strict-dynamic'` + `'unsafe-eval'` só em dev, `style-src` análogo, `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`), aplicar no header da requisição (`x-nonce`) e da resposta. Ampliar `config.matcher` para cobrir quase todas as rotas de página (excluir `api`, `_next/static`, `_next/image`, `favicon.ico`, prefetch), mantendo a checagem de cookie-presença restrita por `pathname` às rotas hoje protegidas (não pelo matcher).
**Where**: `src/proxy.ts` (modificar)
**Depends on**: None
**Reuses**: lógica de redirect existente (preservada, agora condicionada por `pathname` dentro da função em vez de só pelo matcher); `COOKIE_SESSAO` de `session-cookie.ts` (zero dependência de Prisma mantida)
**Requirement**: REQ-SEC-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `GET /login` recebe `Content-Security-Policy` com um nonce diferente a cada requisição
- [x] Rotas antes protegidas continuam redirecionando para `/login` sem cookie de sessão (comportamento existente preservado)
- [x] `proxy.ts` continua sem importar nada de `lib/db/prisma.ts` (checagem por leitura de código)

**Tests**: none
**Gate**: build

**Commit**: `feat(seguranca): add per-request CSP nonce via proxy`

---

#### T11: `src/app/error.tsx` + `src/app/global-error.tsx`

**What**: Fronteiras de erro do React (Client Components, convenção do App Router) para exceções de renderização não capturadas. Exibem mensagem genérica + `error.digest` (id de correlação que o próprio Next já gera e já loga no servidor) - nunca `error.message`/stack.
**Where**: `src/app/error.tsx`, `src/app/global-error.tsx`
**Depends on**: None
**Reuses**: mecanismo nativo do Next (`digest`) - nenhum componente de log próprio necessário aqui
**Requirement**: REQ-SEC-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npm run build` compila sem erro
- [x] Nenhum dos dois componentes referencia `error.message` ou `error.stack` no JSX renderizado

**Tests**: none
**Gate**: build

**Commit**: `feat(seguranca): add generic error boundaries for render exceptions`

---

### Phase 3: Hardening das rotas de API existentes

```
T3 → T12
T4 → T12
T5 → T12
T8 → T12
T5 → T13
T8 → T13
T5 → T14
T8 → T14
T5 → T15
T8 → T15
T5 → T16
T8 → T16
```

#### T12: `src/app/api/auth/login/route.ts` - normalização de tempo + rate-limit IP + CSRF

**What**: (a) sempre rodar `verifyPassword` (hash real se existir e não for primeiro acesso, senão `DUMMY_HASH`) antes de decidir o veredito de erro, para que CPF inexistente/bloqueado/senha errada levem tempo aproximado igual (REQ-SEC-04); (b) checar `ipEstaBloqueado` no início e chamar `registrarFalhaIp` em toda falha de credencial (REQ-SEC-03); (c) chamar `setCookieCSRF()` após emitir o cookie de sessão (REQ-SEC-15); (d) envolver o handler com `comTratamentoDeErro`.
**Where**: `src/app/api/auth/login/route.ts` (modificar)
**Depends on**: T3, T4, T5, T8
**Reuses**: `DUMMY_HASH` (T3), `rate-limit-ip.ts` (T4), `csrf.ts` (T5), `comTratamentoDeErro` (T8); lógica de login existente (REQ-AU-01..04) preservada
**Requirement**: REQ-SEC-03, REQ-SEC-04, REQ-SEC-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e/integration: CPF inexistente e CPF existente+senha errada respondem com corpo e status idênticos (já existia) e tempo de resposta na mesma ordem de grandeza (diferença bem menor que o custo de um `argon2.verify`, tolerância generosa para evitar flakiness)
- [x] integration: IP com 20 falhas registradas é bloqueado mesmo com credenciais corretas
- [x] e2e: resposta de login bem-sucedido inclui `Set-Cookie` para `spma_csrf` além de `spma_sessao`
- [x] Testes existentes de `auth-e-usuarios` para este arquivo continuam verdes (137 testes prévios não regridem)

**Tests**: e2e
**Gate**: full

**Commit**: `fix(seguranca): normalize login timing and add IP rate limit + CSRF issuance`

---

#### T13: `src/app/api/auth/primeiro-acesso/route.ts` - CSRF + erro genérico

**What**: Exigir `verificarCSRF(request)` (403 genérico se inválido) e envolver com `comTratamentoDeErro`.
**Where**: `src/app/api/auth/primeiro-acesso/route.ts` (modificar)
**Depends on**: T5, T8
**Reuses**: `csrf.ts` (T5), `comTratamentoDeErro` (T8)
**Requirement**: REQ-SEC-15, REQ-SEC-11, REQ-SEC-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: POST sem token CSRF (ou com token divergente do cookie) é rejeitado com 403 genérico, sem alterar `senhaHash`
- [x] e2e: POST direto à API com `senha !== confirmacaoSenha` (bypassando qualquer validação client-side) é rejeitado com 400 - prova concreta de CA-SEC-17 usando a regra condicional já existente nesta rota (substitui o exemplo P9/P9.Qual, que pertence a uma feature futura - ver design.md Riscos)
- [ ] Testes existentes deste arquivo continuam verdes após atualização do helper e2e (T19/T20) - **ainda vermelho de propósito**: os 3 testes pré-existentes deste arquivo, mais `e2e/logout.spec.ts:24` (usa esta rota como sonda de "rota protegida" genérica) e `e2e/primeiro-acesso-page.spec.ts:21` (fetch client-side ainda não anexa CSRF) falham com 403/erro em vez do status esperado - regressão documentada em design.md (Riscos) e explicitamente diferida para T18-T20 (Fase 4, fora deste batch). Nenhuma outra falha fora dessas 5 foi observada na suíte completa.

**Tests**: e2e
**Gate**: full

**Commit**: `fix(seguranca): require CSRF on primeiro-acesso and wrap in generic error handler`

---

#### T14: `src/app/api/auth/logout/route.ts` - CSRF + erro genérico

**What**: Exigir `verificarCSRF(request)`, chamar `limparCookieCSRF()` junto com a remoção do cookie de sessão existente, envolver com `comTratamentoDeErro`.
**Where**: `src/app/api/auth/logout/route.ts` (modificar)
**Depends on**: T5, T8
**Reuses**: `csrf.ts` (T5), `comTratamentoDeErro` (T8)
**Requirement**: REQ-SEC-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: POST sem token CSRF válido é rejeitado com 403, sessão permanece ativa
- [x] e2e: POST com CSRF válido remove `spma_sessao` e `spma_csrf` (ambos com `Max-Age=0`/`Expires` no passado)

Nota: os 2 testes pré-existentes deste arquivo (que só enviam o cookie de sessão) agora falham com 403 - mesma regressão documentada em T13/design.md (Riscos), diferida para T18-T20 (Fase 4). `api/auth/logout` não é usado por nenhum outro spec e2e (verificado por busca), então esta mudança não tem efeito cruzado além deste arquivo.

**Tests**: e2e
**Gate**: full

**Commit**: `fix(seguranca): require CSRF on logout and clear CSRF cookie`

---

#### T15: `src/app/api/usuarios/route.ts` - CSRF + erro genérico

**What**: Exigir `verificarCSRF(request)`, envolver com `comTratamentoDeErro`.
**Where**: `src/app/api/usuarios/route.ts` (modificar)
**Depends on**: T5, T8
**Reuses**: `csrf.ts` (T5), `comTratamentoDeErro` (T8)
**Requirement**: REQ-SEC-15, REQ-SEC-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: POST sem token CSRF válido é rejeitado com 403, nenhum usuário criado
- [x] integration/e2e: POST com CPF já existente (violação de unicidade no banco, hoje não tratada) devolve o erro genérico + `idCorrelacao` de `comTratamentoDeErro`, nunca o erro cru do Prisma - prova concreta de REQ-SEC-11 usando um caminho de exceção real já existente na base

Nota: 3 testes pré-existentes deste arquivo (CA-AU-05, REQ-AU-08, "sem sessão válida") agora falham com 403 - mesma regressão documentada em T13/T14, diferida para T18-T20. Um 4º teste pré-existente (CA-AU-06, que já esperava 403 por outro motivo - permissão negada) continua "passando", mas agora por interceptação do CSRF antes da checagem de permissão - anotado para quando T20 atualizar este arquivo, não é uma falha nova.

**Tests**: e2e
**Gate**: full

**Commit**: `fix(seguranca): require CSRF on user creation and wrap in generic error handler`

---

#### T16: `src/app/api/ofertantes/route.ts` - CSRF + erro genérico

**What**: Exigir `verificarCSRF(request)`, envolver com `comTratamentoDeErro`.
**Where**: `src/app/api/ofertantes/route.ts` (modificar)
**Depends on**: T5, T8
**Reuses**: `csrf.ts` (T5), `comTratamentoDeErro` (T8)
**Requirement**: REQ-SEC-15, REQ-SEC-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: POST sem token CSRF válido é rejeitado com 403, nenhum ofertante criado

Nota: 3 testes pré-existentes deste arquivo agora falham com 403 - mesma regressão documentada em T13-T15, diferida para T18-T20. "perfil diferente de GO recebe 403" continua "passando", agora por interceptação do CSRF em vez da checagem de perfil que originalmente exercitava - mesmo padrão observado em T15/CA-AU-06.

**Tests**: e2e
**Gate**: full

**Commit**: `fix(seguranca): require CSRF on ofertante creation and wrap in generic error handler`

---

### Phase 4: Sessão deslizante + propagação do CSRF no cliente e nos testes e2e

```
T5 → T19
T6 → T18
T13 → T18
T15 → T18
T16 → T18
T12 → T20
T13 → T20
T14 → T20
T15 → T20
T16 → T20
T19 → T20
```

#### T17: `src/lib/auth/session.ts` - expiração por inatividade (sliding window)

**What**: `buscarSessaoValida` estende `expiraEm` para `now + SESSAO_TTL_MS` a cada leitura de sessão vigente (sliding window - REQ-SEC-09). `setCookieSessao` deixa de fixar `expires` no cookie (vira cookie de sessão do navegador); a autoridade de expiração passa a ser inteiramente o `expiraEm` no banco (Server Components não conseguem reemitir `Set-Cookie` a cada leitura).
**Where**: `src/lib/auth/session.ts` (modificar)
**Depends on**: None
**Reuses**: `SESSAO_TTL_MS` (constante inalterada), `criarSessao`/`rotacionarSessao`/`destruirSessao` inalterados
**Requirement**: REQ-SEC-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] integration: `buscarSessaoValida` chamado duas vezes com intervalo empurra `expiraEm` para frente na segunda chamada
- [x] integration: sessão com `expiraEm` no passado continua retornando `null` (comportamento existente preservado)
- [x] Cookie emitido por `setCookieSessao` não carrega mais o atributo `Expires`/`Max-Age` (checagem via `Set-Cookie` em teste e2e existente ou novo)
- [x] Testes existentes de `session.integration.test.ts` continuam verdes

**Tests**: integration
**Gate**: full

**Commit**: `fix(seguranca): implement sliding session expiration on inactivity`

---

#### T18: Anexar header CSRF nas mutações client-side

**What**: Em `src/app/(onboarding)/primeiro-acesso/page.tsx`, `src/app/(onboarding)/cadastro-ofertante/page.tsx` e `src/app/(protegido)/usuarios/novo/NovoUsuarioForm.tsx`, anexar `headerCSRF()` (T6) aos `headers` do `fetch` existente. `login/page.tsx` fica de fora (rota pré-sessão, sem CSRF exigido - T12).
**Where**: `src/app/(onboarding)/primeiro-acesso/page.tsx`, `src/app/(onboarding)/cadastro-ofertante/page.tsx`, `src/app/(protegido)/usuarios/novo/NovoUsuarioForm.tsx`
**Depends on**: T6, T13, T15, T16
**Reuses**: `headerCSRF` (T6)
**Requirement**: REQ-SEC-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Os 3 formulários continuam funcionando ponta a ponta pela UI (fluxo de primeiro acesso, cadastro de ofertante e criação de usuário) - cobertos pelos e2e `*-page.spec.ts` já existentes, que devem continuar verdes

**Tests**: e2e
**Gate**: full

**Commit**: `fix(seguranca): attach CSRF header to authenticated client mutations`

---

#### T19: `e2e/helpers/http.ts` - suporte a CSRF

**What**: Adicionar `COOKIE_CSRF = "spma_csrf"`, `idCsrfDaResposta(res): string | null` (mesmo padrão de `idSessaoDaResposta`), e `cabecalhosAutenticados(idSessao: string, idCsrf: string): Record<string,string>` (combina `Cookie: spma_sessao=X; spma_csrf=Y` com o header `x-csrf-token: Y`) para as chamadas e2e autenticadas que mutam estado.
**Where**: `e2e/helpers/http.ts` (modificar)
**Depends on**: T5
**Reuses**: `cookiesDaResposta`, padrão de `idSessaoDaResposta`/`cabecalhoCookie` já existentes
**Requirement**: REQ-SEC-15 (suporte de teste)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `idCsrfDaResposta` extrai corretamente o valor do cookie `spma_csrf` de uma resposta de login
- [ ] `cabecalhosAutenticados` produz um objeto com `Cookie` e `x-csrf-token` consistentes entre si

**Tests**: unit
**Gate**: quick

**Commit**: `test(seguranca): add CSRF support to e2e http helper`

---

#### T20: Atualizar specs e2e existentes para enviar CSRF

**What**: Trocar `cabecalhoCookie(idSessao)` por `cabecalhosAutenticados(idSessao, idCsrf)` em toda chamada e2e que faz POST/DELETE autenticado a uma rota agora protegida por CSRF, nos arquivos: `e2e/primeiro-acesso.spec.ts`, `e2e/usuarios.spec.ts`, `e2e/ofertantes.spec.ts`, `e2e/logout.spec.ts`, `e2e/cadastro-ofertante-page.spec.ts`, `e2e/usuarios-novo-page.spec.ts`.
**Where**: os 6 arquivos listados acima
**Depends on**: T12, T13, T14, T15, T16, T19
**Reuses**: `cabecalhosAutenticados`/`idCsrfDaResposta` (T19)
**Requirement**: REQ-SEC-15 (regressão evitada)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `npm run test:e2e` verde nos 6 arquivos (nenhuma quebra causada pela exigência de CSRF introduzida nas Phases 2-3)
- [ ] Contagem total de testes e2e não diminui em relação ao HEAD anterior a esta feature (nenhuma exclusão silenciosa de teste)

**Tests**: e2e
**Gate**: full

**Commit**: `test(seguranca): update existing e2e specs to send CSRF token`

---

### Phase 5: Provas e2e transversais finais

```
T20 → T21
T9 → T22
T10 → T22
T12 → T22
T13 → T22
```

#### T21: `e2e/csrf.spec.ts` - CA-SEC-15

**What**: Novo spec e2e provando CA-SEC-15 numa rota representativa (`/api/auth/primeiro-acesso`): POST sem header `x-csrf-token`, POST com header divergente do cookie, e POST com header igual ao cookie (controle positivo, já coberto por T13 mas repetido aqui para o cenário ficar completo no mesmo arquivo).
**Where**: `e2e/csrf.spec.ts`
**Depends on**: T20
**Reuses**: `cabecalhosAutenticados`, `idCsrfDaResposta` (T19)
**Requirement**: REQ-SEC-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] CA-SEC-15: POST sem token → 403; POST com token divergente → 403; POST com token correto → 200

**Tests**: e2e
**Gate**: full

**Commit**: `test(seguranca): add e2e coverage for CSRF enforcement`

---

#### T22: `e2e/security-headers.spec.ts` - CA-SEC-16, CA-SEC-13, CA-SEC-10

**What**: Novo spec e2e, via browser (Playwright `page`, não `APIRequestContext`, para capturar console e navegação real): (a) CA-SEC-16 - `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` presentes na resposta de `/login`; (b) CA-SEC-13 - nenhuma URL visitada durante o fluxo login→primeiro-acesso contém `cpf`, `senha` ou token de sessão/CSRF; (c) CA-SEC-10 - `page.on("console")` e `page.on("response")` não capturam `senhaHash`, `$argon2` nem o CPF de outro usuário durante o mesmo fluxo.
**Where**: `e2e/security-headers.spec.ts`
**Depends on**: T9, T10, T12, T13
**Reuses**: fluxo de login/primeiro-acesso já exercitado por `e2e/login.spec.ts`/`e2e/primeiro-acesso.spec.ts`, agora observado pela camada de página em vez de só pela API
**Requirement**: REQ-SEC-16, REQ-SEC-13, REQ-SEC-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Os três grupos de asserção (headers, URLs, console/rede) passam para o fluxo completo login→primeiro-acesso

**Tests**: e2e
**Gate**: full

**Commit**: `test(seguranca): add e2e coverage for security headers and no-leak flows`

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Model TentativaLoginIp + migration | 1 schema change | ✅ Granular |
| T2: mascararCPF | 1 função | ✅ Granular |
| T3: DUMMY_HASH | 1 constante | ✅ Granular |
| T4: rate-limit-ip.ts | 1 módulo coeso (3 funções, 1 responsabilidade) | ✅ Granular |
| T5: csrf.ts | 1 módulo coeso (3 funções, 1 responsabilidade) | ✅ Granular |
| T6: csrf-client.ts | 1 função | ✅ Granular |
| T7: podeAcessarOfertante | 1 função | ✅ Granular |
| T8: comTratamentoDeErro | 1 função | ✅ Granular |
| T9: next.config.ts headers | 1 arquivo, 1 concern | ✅ Granular |
| T10: proxy.ts nonce+CSP | 1 arquivo, 1 concern | ✅ Granular |
| T11: error.tsx + global-error.tsx | 2 arquivos triviais, mesmo concern (fronteira de erro) | ✅ Granular (coeso) |
| T12: login/route.ts | 1 endpoint | ✅ Granular |
| T13: primeiro-acesso/route.ts | 1 endpoint | ✅ Granular |
| T14: logout/route.ts | 1 endpoint | ✅ Granular |
| T15: usuarios/route.ts | 1 endpoint | ✅ Granular |
| T16: ofertantes/route.ts | 1 endpoint | ✅ Granular |
| T17: session.ts sliding window | 1 arquivo, 1 concern | ✅ Granular |
| T18: CSRF nos 3 fetch client-side | 3 arquivos, mesma mudança mecânica única (anexar 1 header) | ✅ Granular (coeso) |
| T19: http.ts helper CSRF | 1 arquivo, 1 concern | ✅ Granular |
| T20: atualizar 6 specs e2e | 6 arquivos, mesma mudança mecânica única (trocar 1 helper) | ✅ Granular (coeso - propagação de T19) |
| T21: csrf.spec.ts | 1 arquivo de teste | ✅ Granular |
| T22: security-headers.spec.ts | 1 arquivo de teste | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (sem seta de entrada) | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T2, T3, T5, T6, T7 | None | (sem seta de entrada) | ✅ Match |
| T8 | T2 | (Phase 2 nota: T8 independente de T9-T11; dependência em T2 é cross-phase, não desenhada no diagrama intra-fase - válida, aponta para trás) | ✅ Match |
| T9, T10, T11 | None | (sem seta de entrada) | ✅ Match |
| T12 | T3, T4, T5, T8 | T3→T12, T4→T12, T5→T12, T8→T12 | ✅ Match |
| T13 | T5, T8 | T5→T13, T8→T13 | ✅ Match |
| T14 | T5, T8 | T5→T14, T8→T14 | ✅ Match |
| T15 | T5, T8 | T5→T15, T8→T15 | ✅ Match |
| T16 | T5, T8 | T5→T16, T8→T16 | ✅ Match |
| T17 | None | (sem seta de entrada) | ✅ Match |
| T18 | T6, T13, T15, T16 | T6→T18, T13→T18, T15→T18, T16→T18 | ✅ Match |
| T19 | T5 | T5→T19 | ✅ Match |
| T20 | T12, T13, T14, T15, T16, T19 | todas presentes no diagrama da Phase 4 | ✅ Match |
| T21 | T20 | T20→T21 | ✅ Match |
| T22 | T9, T10, T12, T13 | todas presentes no diagrama da Phase 5 | ✅ Match |

Dependências cross-phase (T8→T12/T13/T14/T15/T16, apontando de Phase 2 para Phase 3) não precisam de seta no diagrama intra-fase da fase de destino - são validadas pela regra "nunca aponta para uma fase posterior" (todas apontam para trás, de fases anteriores), não pela paridade de diagrama, que cobre apenas arestas dentro da mesma fase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: TentativaLoginIp | Config/scaffold (schema) | none | none | ✅ OK |
| T2: mascararCPF | Domain/pure logic | unit | unit | ✅ OK |
| T3: DUMMY_HASH | Domain/pure logic | unit | unit | ✅ OK |
| T4: rate-limit-ip.ts | Service/data-access (banco real) | integration | integration | ✅ OK |
| T5: csrf.ts | Security logic (Next request APIs) | unit (mocked) | unit | ✅ OK |
| T6: csrf-client.ts | Domain/pure logic | unit | unit | ✅ OK |
| T7: podeAcessarOfertante | Domain/pure logic | unit | unit | ✅ OK |
| T8: comTratamentoDeErro | Domain/pure logic | unit | unit | ✅ OK |
| T9: next.config.ts headers | Config/scaffold | none | none | ✅ OK |
| T10: proxy.ts | Config/scaffold | none | none | ✅ OK |
| T11: error.tsx/global-error.tsx | Config/scaffold | none | none | ✅ OK |
| T12: login/route.ts | API route | e2e | e2e | ✅ OK |
| T13: primeiro-acesso/route.ts | API route | e2e | e2e | ✅ OK |
| T14: logout/route.ts | API route | e2e | e2e | ✅ OK |
| T15: usuarios/route.ts | API route | e2e | e2e | ✅ OK |
| T16: ofertantes/route.ts | API route | e2e | e2e | ✅ OK |
| T17: session.ts | Service/data-access (banco real) | integration | integration | ✅ OK |
| T18: fetch client-side | Page (consumida por e2e existente) | e2e | e2e | ✅ OK |
| T19: http.ts helper | Domain/pure logic (helper de teste) | unit | unit | ✅ OK |
| T20: specs e2e existentes | API routes + Pages | e2e | e2e | ✅ OK |
| T21: csrf.spec.ts | API routes | e2e | e2e | ✅ OK |
| T22: security-headers.spec.ts | API routes + Pages | e2e | e2e | ✅ OK |

---

## Requirement Traceability

| Requirement | Acceptance Criteria | Covered by |
| --- | --- | --- |
| REQ-SEC-01, REQ-SEC-02 | CA-SEC-01, CA-SEC-02 | Já implementado em `auth-e-usuarios` (`rate-limit.ts`) - sem tarefa nesta feature |
| REQ-SEC-03 | CA-SEC-03 | T1, T4, T12 |
| REQ-SEC-04 | CA-SEC-04 | T3, T12 |
| REQ-SEC-05, REQ-SEC-06 | CA-SEC-05, CA-SEC-06 | Já implementado em `auth-e-usuarios` - sem tarefa nesta feature |
| REQ-SEC-07, REQ-SEC-08 | CA-SEC-07, CA-SEC-08 | Já implementado em `auth-e-usuarios` - sem tarefa nesta feature |
| REQ-SEC-09 | CA-SEC-09 | T17 |
| REQ-SEC-10 | CA-SEC-10 | T22 |
| REQ-SEC-11 | CA-SEC-11 | T8, T11, T12-T16 (aplicação), T15 (prova concreta via CPF duplicado) |
| REQ-SEC-12 | CA-SEC-12 | T2, T8 |
| REQ-SEC-13 | CA-SEC-13 | T22 |
| REQ-SEC-14 | CA-SEC-14 | T7 (fundação, unit-tested); fechamento e2e adiado para `ofertante-e-verba` - ver design.md Riscos |
| REQ-SEC-15 | CA-SEC-15 | T5, T6, T12-T16 (aplicação), T18, T19, T20, T21 |
| REQ-SEC-16 | CA-SEC-16 | T9, T10, T22 |
| REQ-SEC-17 | CA-SEC-17 | T13 (prova concreta via `primeiroAcessoSchema`); exemplo literal P9/P9.Qual adiado para `formularios` - ver design.md Riscos |
