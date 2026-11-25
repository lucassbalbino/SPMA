# dashboard-powerbi Design

**Spec**: `.specs/features/dashboard-powerbi/spec.md`
**Context**: `.specs/features/dashboard-powerbi/context.md`
**Status**: Draft

---

## Abordagens consideradas

As três entregam o mesmo escopo (spec PBI-01..23). A escolha é pelo critério do usuário: **o mínimo de alteração no sistema**.

| | A. Portar a rotina para TS, rota de API + página (**escolhida**) | B. Usar os `.mjs` da rotina como estão | C. Token gerado no Server Component + Server Action para renovar |
|---|---|---|---|
| Arquivos existentes alterados | 3 de código (`proxy.ts`, `navegacao.ts`, `icones-navegacao.ts`) + testes/docs | Os mesmos 3 + `public/vendor/` + CSP para script externo | Os mesmos 3 |
| Contrato do manual (`GET /api/powerbi/embed`) | Mantido | Mantido | Trocado por Server Action |
| CSP | Só `frame-src` | O `<script type="module">` inline do HTML é bloqueado pelo nonce; exige reescrever o HTML de qualquer jeito | Só `frame-src` |
| SDK | Pacote npm `powerbi-client`, versionado no lock | `powerbi.min.js` solto em `public/`, fora do lock e do `npm audit` | npm |
| Testes | Vitest no padrão do projeto | `node:test` paralelo ao Vitest | Vitest, mas Server Action é mais difícil de testar isolada |
| Token no HTML | Não (vem por fetch) | Não | **Sim**, serializado no payload da página |

**A** é a menor alteração que respeita o que já existe: mesmo contrato do manual, mesma convenção de rota (`comTratamentoDeErro` + `exigirSessao`), mesmo runner de teste, e a CSP ganha uma diretiva só. **B** parece "não mexer em nada", mas o HTML da rotina não roda sob a CSP por nonce do SPMA e o SDK ficaria fora do controle de versão. **C** economiza o arquivo da rota, mas põe o embed token dentro do HTML da página e se afasta do contrato que o cliente documentou.

---

## Architecture Overview

```mermaid
sequenceDiagram
    participant N as Navegador (/relatorios)
    participant R as GET /api/powerbi/embed
    participant L as lib/powerbi
    participant E as Entra ID
    participant P as Power BI REST
    N->>R: fetch (cookie spma_sessao)
    R->>R: exigirSessao() → 401
    R->>L: painelDoPerfil + identidadePowerBi → 403
    R->>L: limitador.permitir(sessao.id) → 429
    R->>L: obterServicoPowerBi() → 503 se sem config
    L->>E: client_credentials (só se o cache venceu; 1 chamada por rajada)
    L->>P: GenerateToken(report do painel, username, role)
    P-->>L: token + expiration
    L-->>R: EmbedPowerBi
    R-->>N: 200 {reportId, embedUrl, embedToken, expiration} no-store
    N->>N: powerbi-client monta o iframe app.powerbi.com
    N->>R: renova em max(1s, restante − min(2min, restante/2))
```

O que **não** muda: sessão, login, layout `(protegido)`, `CascaProtegida`, `globals.css`, `next.config.ts`, Prisma, banco, CI.

### Mapa de alterações (o "mínimo")

| Arquivo | Tipo | O que muda |
|---|---|---|
| `src/lib/powerbi/catalogo.ts` | novo | perfil → painel, role, identidade |
| `src/lib/powerbi/configuracao.ts` | novo | lê e valida as variáveis `SPMA_*` |
| `src/lib/powerbi/servico.ts` | novo | port do `powerbi.service.mjs` (cache Entra, GenerateToken, 1 nova tentativa) |
| `src/lib/powerbi/limite.ts` | novo | 20 pedidos / 60 s por sessão, em memória |
| `src/lib/powerbi/painel-cliente.ts` | novo | port do `dashboard.mjs` com dependências injetadas |
| `src/app/api/powerbi/embed/route.ts` | novo | o endpoint |
| `src/app/(protegido)/relatorios/page.tsx` | novo | página (Server Component) |
| `src/app/(protegido)/relatorios/PainelPowerBi.tsx` | novo | Client Component que carrega o SDK |
| `src/proxy.ts` | **alterado** | +1 diretiva CSP: `frame-src https://app.powerbi.com` |
| `src/lib/ui/navegacao.ts` | **alterado** | +1 item `/relatorios`, módulo ligado em AM/VT e acrescentado em GT/GO/VO |
| `src/components/layout/icones-navegacao.ts` | **alterado** | ícone `ChartColumn` passa do "módulo sem tela" para o href `/relatorios` |
| `package.json` / `package-lock.json` | **alterado** | +`powerbi-client` |
| `.env.test` | **alterado** | +1 linha que desliga o Power BI no e2e |
| `.env.example`, `docs/DEPLOY_PRODUCAO.md`, `.specs/STATE.md` | **alterado** | documentação das variáveis e AD-056 |
| testes existentes | **alterado** | `navegacao.test.ts` e `e2e/painel.spec.ts` (listas de módulos de GT) |

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `exigirSessao()` | `src/lib/api/guardas.ts` | 401 sem sessão; devolve `{ usuario, sessao }` |
| `comTratamentoDeErro` + `erroHttp` | `src/lib/errors/api-error.ts`, `src/lib/api/erro-http.ts` | Converte 403/429/502/503 em `{ erro }`; exceção imprevista vira 500 com id de correlação e CPF mascarado |
| `resolverEscopoOfertante` | `src/lib/auth/permissoes.ts` | Identidade do GO (próprio CNPJ) e do VO (CNPJ do GO) |
| `MODULOS_POR_PERFIL` / `ROTAS_COM_SESSAO` | `src/lib/ui/navegacao.ts` | O item novo entra sozinho no menu, no painel e no redirect do proxy |
| `requireSession()` | `src/lib/auth/guards.ts` | Guarda da página |
| Padrão "perfil sem acesso" | `src/app/(protegido)/verbas/page.tsx` | Card com "Seu perfil não tem acesso a …" |
| Singleton em `globalThis` | `src/lib/db/prisma.ts` | Serviço Power BI sobrevive ao hot reload sem perder o cache do Entra |
| Rotina do cliente | `powerbi.service.mjs`, `dashboard.mjs` | Portadas quase linha a linha; as validações de config e o cálculo da renovação são os do cliente |

### Integration Points

| System | Integration Method |
| --- | --- |
| Sessão SPMA | `exigirSessao()` (estende a sessão; decisão do usuário) |
| Entra ID | `POST login.microsoftonline.com/{tenant}/oauth2/v2.0/token`, client credentials |
| Power BI REST | `POST api.powerbi.com/v1.0/myorg/GenerateToken` |
| Power BI no navegador | `powerbi-client` 2.25.0 (MIT, Microsoft), `import()` dinâmico dentro de `useEffect` |
| CSP | `src/proxy.ts`, `frame-src` |
| Banco | Nenhuma |

---

## Components

### catalogo (`src/lib/powerbi/catalogo.ts`)

- **Purpose**: Decidir, só a partir do usuário da sessão, qual painel, role e identidade valem.
- **Interfaces**:
  - `type Painel = "nacional" | "ofertante"`
  - `PAINEL_POR_PERFIL: Record<TipoUsuario, Painel | null>` - AM/GT/VT → `nacional`, GO/VO → `ofertante`, AL → `null`
  - `ROLE_POR_PAINEL: Record<Painel, string>` - os dois `"segurança_SPMA"` (constante no código, UTF-8)
  - `painelDoPerfil(tipo: TipoUsuario): Painel | null`
  - `identidadePowerBi(usuario: { tipo; documento; cdOfertante }): string | null` - `null` para AL e para VO sem vínculo
- **Dependencies**: `generated/prisma/enums`, `lib/auth/permissoes` (puro, sem Prisma).
- **Reuses**: `resolverEscopoOfertante`.

### configuracao (`src/lib/powerbi/configuracao.ts`)

- **Purpose**: Ler e validar as variáveis de ambiente, sem nunca lançar no carregamento do módulo (o CI compila sem elas).
- **Interfaces**:
  - `interface RelatorioPowerBi { reportId: string; embedUrl: string }`
  - `interface ConfiguracaoPowerBi { tenantId; clientId; clientSecret; datasetId: string; relatorios: Record<Painel, RelatorioPowerBi> }`
  - `type LeituraConfiguracao = { ok: true; config: ConfiguracaoPowerBi } | { ok: false; motivo: "ausente" | "invalida"; variavel: string }` - `variavel` é o **nome**, nunca o valor
  - `lerConfiguracaoPowerBi(env: Record<string, string | undefined>): LeituraConfiguracao`
- **Regras** (do `powerbi.service.mjs`): tenant, client, report e dataset em formato GUID; embed URL com origem `https://app.powerbi.com`, caminho `/reportEmbed` e `reportId` igual ao do relatório (sem diferenciar maiúsculas). O par `SPMA_REPORT_ID_<PAINEL>` / `SPMA_EMBED_URL_<PAINEL>` é tudo ou nada.

### servico (`src/lib/powerbi/servico.ts`)

- **Purpose**: Port do `powerbi.service.mjs`, generalizado para receber relatório, identidade e role por pedido.
- **Interfaces**:
  - `interface EmbedPowerBi { reportId; embedUrl; embedToken; expiration: string }`
  - `interface PedidoEmbed { relatorio: RelatorioPowerBi; username: string; role: string }`
  - `class ErroMicrosoft extends Error { status: number | null }` - mensagem `"Microsoft HTTP <status>"` ou `"Microsoft sem resposta"`; nunca contém corpo, token ou segredo
  - `criarServicoPowerBi(config, opcoes?: { http?: typeof fetch; agora?: () => number; esperar?: (ms: number) => Promise<void> }): { gerarEmbed(p: PedidoEmbed): Promise<EmbedPowerBi> }`
  - `obterServicoPowerBi(env = process.env): { ok: true; servico; config } | { ok: false; motivo; variavel }` - singleton preguiçoso em `globalThis`
- **Comportamento**: cache do token do Entra até `expires_in − 120 s`; `pending` compartilhado entre pedidos simultâneos e limpo no `finally` (a falha não fica guardada); `AbortSignal.timeout(10000)` por chamada; em 429/503, uma nova tentativa após `Retry-After` (≤ 5 s, 1 s se ausente/inválido); um `GenerateToken` por pedido; o retorno nunca traz o token do Entra.
- **Reuses**: o código da rotina, quase literal.

### limite (`src/lib/powerbi/limite.ts`)

- **Purpose**: 20 pedidos por chave a cada 60 s.
- **Interfaces**: `criarLimitador(opcoes?: { maximo?: number; janelaMs?: number; agora?: () => number }): { permitir(chave: string): boolean }`
- **Comportamento**: janela fixa por chave; entradas vencidas são descartadas a cada chamada (memória limitada ao número de sessões ativas). Chave = `sessao.id`, que só vive em memória e nunca vai a log.

### Rota (`src/app/api/powerbi/embed/route.ts`)

- **Purpose**: O endpoint do manual.
- **Interfaces**: `export const GET = comTratamentoDeErro(async () => Response)`
- **Ordem**: `exigirSessao` (401) → `painelDoPerfil` + `identidadePowerBi` (403) → `limitador.permitir(sessao.id)` (429) → `obterServicoPowerBi` (503, log com motivo e nome da variável) → `gerarEmbed` (502 em `ErroMicrosoft`, log com id de correlação e status) → log `powerbi.embed emitido` com `{ perfil, painel }` → `200` com os 4 campos e `Cache-Control: no-store`.
- **Não lê** `request`: nada do pedido influencia identidade ou relatório (PBI-05).

### painel-cliente (`src/lib/powerbi/painel-cliente.ts`)

- **Purpose**: Port do `dashboard.mjs` com SDK, `fetch` e relógio injetados, testável no Vitest em ambiente `node` (o projeto não tem jsdom).
- **Interfaces**:
  - `MENSAGEM_INDISPONIVEL = "Dashboard indisponível. Entre novamente ou tente mais tarde."`
  - `MENSAGEM_FALHA_RELATORIO = "Falha ao exibir relatório"`
  - `calcularEspera(restanteMs: number): number` - `max(1000, restante − min(120000, restante/2))`
  - `iniciarPainelPowerBi(container: unknown, aoMudarStatus: (texto: string) => void, deps: DependenciasPainel, endpoint = "/api/powerbi/embed"): () => void`
  - `DependenciasPainel = { sdk: { embed(el, config): { on(evento, fn): void; setAccessToken(t): Promise<unknown> }; reset(el): void }; models: { TokenType: { Embed }; Permissions: { Read } }; buscar: typeof fetch; agendar(fn, ms): unknown; cancelar(h): void; agora(): number }`
- **Reuses**: o algoritmo do `dashboard.mjs`, inclusive a margem de 30 s e o `stopped`.

### Página (`src/app/(protegido)/relatorios/page.tsx` + `PainelPowerBi.tsx`)

- **page.tsx** (Server Component): `requireSession()`; sem painel → Card "Seu perfil não tem acesso a relatórios." (padrão de `/verbas`); com painel → título "Visualização de Relatórios" + `<PainelPowerBi />`. Não passa `usuario` ao Client Component.
- **PainelPowerBi.tsx** (`"use client"`): `useEffect` faz `import("powerbi-client")`, cria um `service.Service` próprio e chama `iniciarPainelPowerBi`; o retorno do efeito é o `parar()`. Renderiza o contêiner `data-testid="relatorio-powerbi"` (`aspect-video w-full`, borda e raio por token) e `<p role="status" data-testid="relatorio-status">`.
- **Visual**: sem tela de referência no design system. Fica dentro do `<main>` da casca (máx. 60rem), com tipografia e cores `spma-*` já existentes; nada novo em `globals.css`. O iframe recebe o tamanho por `element.style` (CSSOM), que a CSP não bloqueia (verificado em `powerbi-client` 2.25.0, `setIframe`).

### Navegação (`navegacao.ts`, `icones-navegacao.ts`)

- `RELATORIOS = { rotulo: "Visualização de Relatórios", href: "/relatorios" }`; módulo "Visualização de Relatórios" com `[RELATORIOS]` em AM e VT (hoje vazio) e acrescentado em GT (depois de "Gestão de Formações"), GO e VO (depois de "Minhas Formações").
- `navegacao.ts` continua importando só `generated/prisma/enums` (o proxy o lê). A coerência com o catálogo é garantida por teste: módulo presente ⇔ `painelDoPerfil(tipo) !== null`.

### CSP (`src/proxy.ts`)

- `frame-src https://app.powerbi.com;` acrescentada; nenhuma outra diretiva muda. `frame-ancestors 'none'` e `X-Frame-Options: DENY` continuam: eles impedem o SPMA de ser embutido, não de embutir.

---

## Data Models

Nenhum modelo de banco. Só os tipos TypeScript acima. Variáveis de ambiente:

| Variável | Obrigatória | Uso |
|---|---|---|
| `SPMA_TENANT_ID` | sim | Entra ID (GUID) |
| `SPMA_CLIENT_ID` | sim | Registro de aplicativo (GUID) |
| `SPMA_CLIENT_SECRET` | sim | Segredo; só no `.env` / `.env.production` (chmod 600) |
| `SPMA_DATASET_ID` | sim | Modelo semântico (GUID) |
| `SPMA_REPORT_ID` | sim | Relatório padrão (GUID) |
| `SPMA_EMBED_URL` | sim | Embed URL do relatório padrão, entre aspas |
| `SPMA_REPORT_ID_NACIONAL` + `SPMA_EMBED_URL_NACIONAL` | não (par) | Relatório próprio de AM/GT/VT |
| `SPMA_REPORT_ID_OFERTANTE` + `SPMA_EMBED_URL_OFERTANTE` | não (par) | Relatório próprio de GO/VO |

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Sem sessão / sessão vencida | `exigirSessao` → 401 | "Dashboard indisponível. Entre novamente…" |
| AL, ou VO sem GO | 403 antes de qualquer chamada externa | AL: card "sem acesso" na página; VO sem vínculo: mensagem de indisponível |
| Mais de 20 pedidos/60 s na sessão | 429 | Mensagem de indisponível |
| Variáveis ausentes/inválidas | 503 + `console.error("powerbi.config", motivo, variavel)` | Mensagem de indisponível; resto do sistema intacto |
| Entra/GenerateToken com erro, resposta incompleta ou > 10 s | 1 nova tentativa se 429/503; depois `ErroMicrosoft` → 502 + `console.error(id, "powerbi.embed", status)` | Mensagem de indisponível |
| Exceção imprevista | `comTratamentoDeErro` → 500 + id de correlação | Mensagem de indisponível |
| Falha ao carregar o SDK no navegador | `catch` do `import()` | Mensagem de indisponível |
| Evento `error` do relatório | `aoMudarStatus(MENSAGEM_FALHA_RELATORIO)` | "Falha ao exibir relatório" |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| --- | --- | --- | --- |
| Segredo do cliente circulou em `.txt` e no chat | fora do repo | Quem tiver o arquivo gera tokens com visão nacional | Trocado pelo usuário antes da T11 (spec, Assumptions); só em `.env`/`.env.production`; PBI-23 testado |
| A renovação estende a sessão: aba esquecida nunca expira | `src/lib/auth/session.ts:62` (`buscarSessaoValida` desliza a janela) | Enfraquece REQ-SEC-09 só para quem deixa `/relatorios` aberta | Decisão do usuário; registrada na AD-056 |
| RLS do modelo não conhece VO; "VM" do manual não existe | modelo do cliente | VO veria vazio se mandasse o próprio CPF | Identidade = `resolverEscopoOfertante` (PBI-03); confirmar com o dono do `.pbix` na T11 |
| Usuário novo vê vazio até o refresh do dataset, se a role consultar `TB_Usuario` | modelo do cliente | Painel vazio nas primeiras horas | Documentado em DEPLOY_PRODUCAO; some se o cliente adotar roles por painel |
| O iframe pode navegar para outro host `*.powerbi.com` | `src/proxy.ts` (CSP) | Iframe bloqueado na homologação | T11 confere no console; se bloquear, trocar por `https://*.powerbi.com` (mesma diretiva) |
| `next dev` carrega `.env` mesmo com `dotenv -e .env.test`; com credenciais reais no `.env`, o e2e chamaria a Microsoft | `package.json` (`dev:test`) | e2e não determinístico na máquina do usuário | `.env.test` define `SPMA_TENANT_ID=""`. O dotenv-cli carrega antes, e o `@next/env` só preenche variável cujo valor inicial é `undefined` (`node_modules/@next/env/dist/index.js`, `processEnv`), então o vazio vence o `.env` → "ausente" → 503 determinístico; conferido na T7 |
| `powerbi-client` toca `window` ao ser importado | `node_modules/powerbi-client/dist/powerbi.js:13034` | Quebraria o SSR se importado no topo | `import()` dentro de `useEffect` |
| Token emitido vale até expirar mesmo após logout | API da Microsoft | Janela de até ~1 h | Limite aceito no manual do cliente; `parar()` remove o token da página |
| Cache do Entra é por processo | `src/lib/powerbi/servico.ts` | Com vários processos, 1 token por processo | Correto mesmo assim; produção é processo único (AD-047) |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Onde fica a autorização | Catálogo `PAINEL_POR_PERFIL` em `lib/powerbi`, não em `permissoes.ts` | Decide painel, role e acesso numa tabela só; `permissoes.ts` fica intocado |
| Identidade do VO | CNPJ do GO (`resolverEscopoOfertante`) | Funciona com a role única e com roles por painel |
| Relatório por painel | Par opcional de variáveis por painel | "Ainda não sei" vira configuração, sem código |
| Role | Constante no código | Igual em todos os ambientes; tem "ç"; muda só se o modelo mudar |
| Timeout | 10 s por chamada (a rotina usava 30 s) | Pior caso ≈ 10 + 10 + 5 + 10 = 35 s, abaixo dos 60 s do nginx |
| Nova tentativa | Uma, só em 429/503 | Absorve o throttling da Microsoft sem multiplicar a carga |
| Limitador | Em memória, por `sessao.id` | Sem tabela; produção é processo único |
| SDK | `powerbi-client` via npm, import dinâmico | Versionado no lock; compatível com a CSP por nonce |
| Teste do cliente | Controlador puro com dependências injetadas | O Vitest do projeto roda em `node`, sem jsdom |

**AD a registrar em `.specs/STATE.md` (T10):**

> **AD-056 (2026-11-25) - Dashboard via Power BI Embedded (*App owns data*). Supera a AD-024.** O SPMA emite o embed token em `GET /api/powerbi/embed` a partir da sessão; o RLS do Power BI filtra as linhas pela identidade enviada (`resolverEscopoOfertante(usuario) ?? documento`). AM/GT/VT/GO/VO acessam, AL não. O catálogo `src/lib/powerbi/catalogo.ts` é a fonte única de quem acessa qual painel; o menu acompanha por teste. A renovação automática do token mantém a sessão viva enquanto `/relatorios` está aberta (decisão do usuário). Nenhuma tabela nova; segredo só em `.env.production`.
