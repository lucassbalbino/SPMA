# dashboard-powerbi Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/dashboard-powerbi/design.md`
**Status**: Draft

---

## Pré-condição de Execute (antes da T1)

1. Branch `feat/dashboard-powerbi` a partir da `main`. A árvore tem alterações não commitadas da identidade visual (`git status` de 2026-11-25): **não** entram nesta feature; o usuário decide antes se elas vão para um commit próprio.
2. Linha de base no HEAD, pelo **PowerShell** (pelo Git Bash o Vitest não carrega): `npm run typecheck`, `npm run lint`, `npm run test:unit`, e os dois specs e2e tocados (`e2e/painel.spec.ts`, `e2e/security-headers.spec.ts`). Anotar as contagens aqui. Se algo já vier vermelho, parar e reportar.
3. MySQL do Docker de pé (`docker compose up -d`) para o e2e.

---

## Test Coverage Matrix

> Guidelines encontradas: `AGENTS.md` (sem regra de teste), `vitest.config.ts` (ambiente `node`, sem jsdom), `playwright.config.ts`, memória do projeto "teste enxuto, sobretudo e2e: a camada mais barata que prova o AC". Sem threshold de cobertura: vale 1:1 com os ACs, com o e2e restrito ao que só o navegador prova.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Módulos puros `src/lib/powerbi/*` | unit | Todos os ramos; 1:1 com os PBI de cada módulo; cada edge case da spec com teste próprio (L-045) | `src/lib/powerbi/*.test.ts` | `npm run test:unit` |
| Rota `GET /api/powerbi/embed` | unit (sessão e serviço mockados com `vi.mock`) | Cada status (200/401/403/429/502/503) com corpo exato; cabeçalho `no-store`; identidade por perfil; query ignorada; log sem dado pessoal | `src/app/api/powerbi/embed/route.test.ts` | `npm run test:unit` |
| Tabela de navegação | unit | Módulos e hrefs dos 6 perfis; coerência menu ⇔ catálogo | `src/lib/ui/navegacao.test.ts` | `npm run test:unit` |
| Página `/relatorios`, Client Component, CSP | e2e | Só o que a unidade não prova: a página monta e mostra a mensagem de indisponível (sem config), o AL vê o card de sem acesso, o cabeçalho CSP tem `frame-src`, o GT vê o módulo no painel | `e2e/relatorios.spec.ts`, `e2e/painel.spec.ts` | `npx playwright test <arquivos>` |
| Docs, `.env.example`, `STATE.md` | none | build gate | - | build gate |
| Homologação com o Power BI real | manual (UAT do usuário) | Roteiro da T11 | - | - |

## Gate Check Commands

> Rodar no **PowerShell**, em `C:\Users\lucas\Desktop\Projetos\SPMA`. Saída do Playwright para arquivo (`*> e2e-saida.txt`) e ler depois.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só com unit | `npm run typecheck; npm run test:unit` |
| Full | Tasks com e2e | `npm run typecheck; npm run test:unit; npx playwright test e2e/relatorios.spec.ts e2e/painel.spec.ts *> e2e-saida.txt` |
| Build | Fim de fase e T10 | `npm run lint; npm run build; npm run typecheck; npm run test:unit` |

---

## Execution Plan

### Phase 1: Núcleo no servidor (módulos puros)

```
T1 → T2 → T3
T4
```

### Phase 2: Endpoint

```
T3 → T5
T4 → T5
```

### Phase 3: Tela, navegação e CSP

```
T6 → T7 → T8
T7 → T9
```

### Phase 4: Documentação e homologação

```
T9 → T10 → T11
```

---

## Task Breakdown

### T1: Catálogo de painéis por perfil

**What**: `PAINEL_POR_PERFIL`, `ROLE_POR_PAINEL`, `painelDoPerfil` e `identidadePowerBi`.
**Where**: `src/lib/powerbi/catalogo.ts` (+ `catalogo.test.ts`)
**Depends on**: None
**Reuses**: `resolverEscopoOfertante` (`src/lib/auth/permissoes.ts`)
**Requirement**: PBI-03, PBI-08, PBI-09

**Done when**:

- [x] AM/GT/VT → `nacional`; GO/VO → `ofertante`; AL → `null`
- [x] Os dois painéis com role `"segurança_SPMA"` (asserção da string exata, com "ç")
- [x] `identidadePowerBi`: AM/GT/VT e GO → o próprio documento; VO → `cdOfertante`; VO sem `cdOfertante` → `null`; AL → `null`
- [x] Documento com zero à esquerda sai igual, como string (edge case)
- [x] O módulo não importa Prisma nem `next/*`
- [x] Gate quick passa; test count = base + N novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(powerbi): add the profile to dashboard catalog`
**Status**: ✅ Done. catalogo.test.ts: 17 testes; unit 962 → 979.

---

### T2: Leitura e validação da configuração

**What**: `lerConfiguracaoPowerBi(env)` com as regras de GUID e embed URL da rotina do cliente e os pares opcionais por painel.
**Where**: `src/lib/powerbi/configuracao.ts` (+ `configuracao.test.ts`)
**Depends on**: T1
**Reuses**: validações do `powerbi.service.mjs`
**Requirement**: PBI-06, PBI-15

**Done when**:

- [x] Todas as 6 obrigatórias válidas → `ok: true`, os dois painéis com o relatório padrão
- [x] Cada obrigatória ausente ou só espaços → `{ ok: false, motivo: "ausente", variavel: <nome> }` (um caso por variável)
- [x] GUID malformado, embed URL de outra origem, outro caminho ou outro `reportId` → `motivo: "invalida"`
- [x] `reportId` da URL em maiúsculas é aceito
- [x] Par `SPMA_REPORT_ID_OFERTANTE` + `SPMA_EMBED_URL_OFERTANTE` → só o painel `ofertante` usa o relatório próprio; `nacional` segue no padrão
- [x] Só um lado do par → `motivo: "invalida"` (edge case)
- [x] Nenhum resultado contém o valor do segredo
- [x] Gate quick passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(powerbi): read and validate the power bi settings`
**Status**: ✅ Done. configuracao.test.ts: 33 testes; unit 979 → 1012.

---

### T3: Serviço de embed (Entra + GenerateToken)

**What**: `criarServicoPowerBi` e `obterServicoPowerBi` (singleton preguiçoso), portados do `powerbi.service.mjs` com relatório, identidade e role por pedido, timeout de 10 s e uma nova tentativa em 429/503.
**Where**: `src/lib/powerbi/servico.ts` (+ `servico.test.ts`)
**Depends on**: T2
**Reuses**: `powerbi.service.mjs`; cenários do teste de concorrência de 2026-11-25
**Requirement**: PBI-04, PBI-16, PBI-17, PBI-18, PBI-19, PBI-23

**Done when**:

- [x] Corpo do `GenerateToken`: `datasets[0].id`, `reports[0].id` do relatório pedido, `allowEdit: false`, `identities[0]` com `username`, `roles: [role]` e `datasets`
- [x] 200 pedidos simultâneos com cache frio → 1 chamada ao Entra, 200 ao `GenerateToken`, cada resposta com o token do próprio `username`
- [x] Token do Entra reaproveitado até `expires_in − 120 s`; vencido no meio de uma rajada → 1 renovação
- [x] Entra falha com 50 pedidos esperando → os 50 rejeitam com `ErroMicrosoft`; o pedido seguinte chama o Entra de novo
- [x] 429/503 → 1 nova tentativa após `Retry-After` (2 → espera 2000 ms; 30 → 5000 ms; ausente/inválido → 1000 ms); segunda falha → `ErroMicrosoft`; 403 não tenta de novo
- [x] `AbortSignal.timeout(10000)` em cada chamada; timeout → `ErroMicrosoft` com `status: null`
- [x] Resposta sem `token` ou com `expiration` inválida → `ErroMicrosoft`
- [x] O retorno tem só `reportId`, `embedUrl`, `embedToken`, `expiration`; a mensagem de nenhum erro contém o segredo nem o token do Entra
- [x] `obterServicoPowerBi` sem config → `{ ok: false }` sem lançar; com config → a mesma instância nas chamadas seguintes
- [x] Gate quick passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(powerbi): generate embed tokens with a shared entra token`
**Status**: ✅ Done. servico.test.ts: 24 testes; unit 1012 → 1036.

---

### T4: Limitador de pedidos

**What**: `criarLimitador({ maximo, janelaMs, agora })`.
**Where**: `src/lib/powerbi/limite.ts` (+ `limite.test.ts`)
**Depends on**: None
**Reuses**: -
**Requirement**: PBI-20

**Done when**:

- [x] 20 pedidos na janela passam; o 21º é negado
- [x] Depois de 60 000 ms a chave volta a passar
- [x] Chaves diferentes não se afetam
- [x] Entradas vencidas são removidas (o tamanho interno volta a 0 depois da janela)
- [x] Gate quick passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(powerbi): limit embed requests per session`
**Status**: ✅ Done. limite.test.ts: 4 testes; unit 1036 → 1040; build gate da Fase 1 verde.

---

### T5: Rota `GET /api/powerbi/embed`

**What**: O endpoint, na ordem 401 → 403 → 429 → 503 → 502/200.
**Where**: `src/app/api/powerbi/embed/route.ts` (+ `route.test.ts`)
**Depends on**: T3, T4
**Reuses**: `exigirSessao`, `comTratamentoDeErro`, `erroHttp`
**Requirement**: PBI-02, PBI-05, PBI-07, PBI-08, PBI-09, PBI-15, PBI-16, PBI-20, PBI-22

**Done when**:

- [ ] Sem sessão → 401 `{ erro: "Não autenticado" }`, serviço não chamado
- [ ] AL → 403 `{ erro: "Acesso negado" }`; VO sem vínculo → 403; serviço não chamado
- [ ] 21º pedido da mesma sessão em 60 s → 429 com a mensagem da spec, serviço não chamado
- [ ] Config ausente ou inválida → 503 `{ erro: "Dashboard não configurado" }`, log com o nome da variável e sem valor
- [ ] `ErroMicrosoft` → 502 `{ erro: "Dashboard temporariamente indisponível" }`, sem detalhe no corpo; log com id de correlação e status
- [ ] 200 para cada um de AM, GT, VT, GO, VO: corpo com exatamente as 4 chaves (asserção das chaves e de cada valor, L-030), `Cache-Control: no-store`, `username` enviado = documento (AM/GT/VT/GO) ou CNPJ do GO (VO), relatório do painel do perfil
- [ ] Pedido com `?documento=…&reportId=…&username=…` produz exatamente a mesma chamada ao serviço que o pedido sem query
- [ ] Log de sucesso tem perfil e painel; nenhuma chamada de `console.*` recebe documento, token ou segredo
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(powerbi): add the embed token endpoint`

---

### T6: Controlador do painel no navegador

**What**: `iniciarPainelPowerBi` e `calcularEspera`, portados do `dashboard.mjs` com dependências injetadas.
**Where**: `src/lib/powerbi/painel-cliente.ts` (+ `painel-cliente.test.ts`)
**Depends on**: None (fica na Fase 3 porque só serve à página)
**Reuses**: `dashboard.mjs`
**Requirement**: PBI-11, PBI-12, PBI-13, PBI-14

**Done when**:

- [ ] `calcularEspera`: 3 600 000 → 3 480 000; 180 000 → 90 000; 40 000 → 20 000; 1 500 → 1 000
- [ ] Primeiro ingresso → `sdk.embed` uma vez, com `tokenType` Embed e `permissions` Read; o renovado → `setAccessToken`, sem novo `embed`
- [ ] Próximo pedido agendado com `calcularEspera(restante)`
- [ ] 401, 403, 502, erro de rede ou validade < 30 000 ms → `sdk.reset` e status = `MENSAGEM_INDISPONIVEL` (um teste por causa)
- [ ] `parar()` → `reset`, timer cancelado, fetch abortado; resposta que chega depois não chama `embed` nem altera o status
- [ ] Evento `error` do relatório → `MENSAGEM_FALHA_RELATORIO`; depois de `parar()` não altera mais nada
- [ ] `fetch` com `credentials: "same-origin"` e `cache: "no-store"`
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(powerbi): port the dashboard renewal controller`

---

### T7: Página `/relatorios`

**What**: `page.tsx` (guarda + card de sem acesso + título) e `PainelPowerBi.tsx` (import dinâmico do SDK); dependência `powerbi-client`; linha `SPMA_TENANT_ID=""` no `.env.test`; `e2e/relatorios.spec.ts`.
**Where**: `src/app/(protegido)/relatorios/page.tsx` (+ `PainelPowerBi.tsx`, `package.json`, `.env.test`, `e2e/relatorios.spec.ts`)
**Depends on**: T6
**Reuses**: padrão de `/verbas` (card de sem acesso); `requireSession`
**Requirement**: PBI-01, PBI-08, PBI-12

**Done when**:

- [ ] `npm i powerbi-client@^2.25.0` (só ele no diff do lock, mais as 4 dependências dele)
- [ ] O SDK é importado só dentro do `useEffect`; o `usuario` não é passado ao Client Component
- [ ] Nenhuma cor literal e nenhum `style=` no `.tsx` (AD-039)
- [ ] e2e: GT abre `/relatorios` e vê o título "Visualização de Relatórios", o contêiner `relatorio-powerbi` e, como o `.env.test` desliga o Power BI, o status "Dashboard indisponível. Entre novamente ou tente mais tarde."
- [ ] e2e: AL abre `/relatorios` e vê "Seu perfil não tem acesso a relatórios." e nenhum contêiner `relatorio-powerbi`
- [ ] Conferido que, com credenciais no `.env` local, `npm run dev:test` continua respondendo 503 (a linha do `.env.test` vence)
- [ ] CPFs do spec novo não usados em nenhum outro arquivo e2e
- [ ] Gate full passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(powerbi): add the reports page with the embedded dashboard`

---

### T8: Módulo "Visualização de Relatórios" no menu e no painel

**What**: Item `/relatorios` em `navegacao.ts`, ícone em `icones-navegacao.ts`, testes de navegação e lista do GT em `e2e/painel.spec.ts`.
**Where**: `src/lib/ui/navegacao.ts` (+ `navegacao.test.ts`, `icones-navegacao.ts`, `e2e/painel.spec.ts`)
**Depends on**: T7
**Reuses**: `MODULOS_POR_PERFIL`, `ROTAS_COM_SESSAO`
**Requirement**: PBI-10

**Done when**:

- [ ] AM e VT: módulo com link para `/relatorios` (antes sem tela)
- [ ] GT: módulo depois de "Gestão de Formações"; GO e VO: depois de "Minhas Formações"; AL: sem o módulo
- [ ] Teste de coerência: para os 6 perfis, módulo presente ⇔ `painelDoPerfil(tipo) !== null`
- [ ] `/relatorios` em `ROTAS_COM_SESSAO` e em `ROTAS_IMPLEMENTADAS` do teste
- [ ] `navegacao.ts` continua importando só `generated/prisma/enums`
- [ ] e2e do GT no painel lista os 6 módulos na ordem nova
- [ ] Gate full passa

**Tests**: unit + e2e
**Gate**: full
**Commit**: `feat(navegacao): link the reports module for every profile but the student`

---

### T9: CSP com `frame-src` do Power BI

**What**: Acrescentar `frame-src https://app.powerbi.com;` à CSP do proxy.
**Where**: `src/proxy.ts` (+ caso novo em `e2e/relatorios.spec.ts`)
**Depends on**: T7
**Reuses**: -
**Requirement**: PBI-21

**Done when**:

- [ ] e2e: o cabeçalho `content-security-policy` de `/relatorios` contém `frame-src https://app.powerbi.com`
- [ ] e2e: as demais diretivas continuam presentes, cada uma conferida pelo valor (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `script-src` com nonce)
- [ ] `e2e/security-headers.spec.ts` passa sem alteração
- [ ] Gate full passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(seguranca): allow the power bi frame in the csp`

---

### T10: Documentação e decisão

**What**: Variáveis em `.env.example` (só nomes, valores vazios, aviso do segredo), seção "Dashboard Power BI" em `docs/DEPLOY_PRODUCAO.md` (variáveis no `.env.production`, troca do segredo antes de vencer, refresh do dataset, `frame-src` amplo se precisar), AD-056 e Handoff no `.specs/STATE.md`.
**Where**: `.specs/STATE.md` (+ `.env.example`, `docs/DEPLOY_PRODUCAO.md`)
**Depends on**: T9
**Reuses**: texto da AD-056 em design.md
**Requirement**: PBI-15, PBI-23

**Done when**:

- [ ] Nenhum valor real (ID ou segredo) em arquivo versionado: `git grep` pelos GUIDs do `.txt` do cliente não acha nada
- [ ] AD-056 registrada, com a AD-024 marcada como superada
- [ ] Gate build passa (`npm run build` sem nenhuma variável `SPMA_*` no ambiente)

**Tests**: none
**Gate**: build
**Commit**: `docs(powerbi): document the power bi settings and record ad-056`

---

### T11: Homologação com o Power BI real (UAT do usuário)

**What**: Roteiro executado pelo usuário com o segredo já trocado no `.env` local e `npm run dev`; resultados anotados em `validation.md`.
**Where**: `.specs/features/dashboard-powerbi/validation.md`
**Depends on**: T10
**Reuses**: matriz de homologação do Manual Técnico V2
**Requirement**: PBI-01, PBI-03, PBI-11, PBI-13, PBI-21

**Done when** (cada item com ✅/❌ e observação):

- [ ] GT e VT veem o relatório com visão nacional
- [ ] AM vê o mesmo
- [ ] GO vê só os cursos do próprio CNPJ; um segundo GO não vê os do primeiro
- [ ] VO vê o mesmo recorte do GO dele
- [ ] AL não vê o módulo; `/relatorios` mostra o card de sem acesso
- [ ] Nenhum erro de CSP no console (se houver `frame-src` bloqueado, ampliar para `https://*.powerbi.com` e repetir)
- [ ] Sair pelo menu remove o relatório; voltar sem logar cai no login
- [ ] Renovação: com o DevTools, confirmar o segundo `GET /api/powerbi/embed` agendado e o relatório seguindo sem recarregar (ou forçar com um token de validade curta)
- [ ] Desligar a rede por um instante na renovação → mensagem de indisponível
- [ ] Usuário criado depois do último refresh do dataset: anotar o que ele vê (documenta o comportamento da role do cliente)

**Tests**: none
**Gate**: manual
**Commit**: `docs(powerbi): record the real power bi acceptance run`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ──→ T2 ──→ T3
Phase 1:  T4
Phase 2:  T3 ──→ T5
Phase 2:  T4 ──→ T5
Phase 3:  T6 ──→ T7 ──→ T8
Phase 3:  T7 ──→ T9
Phase 4:  T9 ──→ T10 ──→ T11
```

Execução sequencial, uma task por vez. São 11 tasks: dois lotes de ~7 se o usuário aceitar sub-agentes (Fases 1-2 e Fases 3-4), ou execução direta nesta janela. O Verifier roda sozinho depois da T10 e antes da T11 (a T11 depende do usuário e das credenciais reais).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 catálogo | 1 módulo puro | ✅ |
| T2 configuração | 1 função | ✅ |
| T3 serviço | 1 módulo (o port do serviço do cliente) | ✅ |
| T4 limitador | 1 função | ✅ |
| T5 rota | 1 endpoint | ✅ |
| T6 controlador do cliente | 1 módulo | ✅ |
| T7 página | 1 rota de página (page + seu Client Component; a dependência npm e a linha do `.env.test` existem só para ela) | ⚠️ coesa: dividir deixaria o Client Component sem teste |
| T8 navegação | 1 tabela + o ícone do href novo | ⚠️ coesa: o ícone e os testes das listas mudam junto com a tabela |
| T9 CSP | 1 linha | ✅ |
| T10 docs | 3 documentos, sem código | ⚠️ coesa |
| T11 UAT | roteiro manual | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da Fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | None | isolada na Fase 1 | ✅ |
| T5 | T3, T4 | Fase 2, depois de T3 e T4 (fase anterior) | ✅ |
| T6 | None | início da Fase 3 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T7 | T7 → T9 | ✅ |
| T10 | T9 | início da Fase 4 (T9 na fase anterior) | ✅ |
| T11 | T10 | T10 → T11 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | módulo puro `lib/powerbi` | unit | unit | ✅ |
| T2 | módulo puro `lib/powerbi` | unit | unit | ✅ |
| T3 | módulo puro `lib/powerbi` | unit | unit | ✅ |
| T4 | módulo puro `lib/powerbi` | unit | unit | ✅ |
| T5 | rota | unit | unit | ✅ |
| T6 | módulo puro `lib/powerbi` | unit | unit | ✅ |
| T7 | página + Client Component | e2e | e2e | ✅ |
| T8 | tabela de navegação + painel | unit + e2e | unit + e2e | ✅ |
| T9 | CSP | e2e | e2e | ✅ |
| T10 | docs | none | none | ✅ |
| T11 | homologação real | manual | none (manual) | ✅ |

---

## Tools

- **MCP**: nenhum obrigatório. Claude in Chrome é opcional para acompanhar a T11 junto com o usuário.
- **Skill**: `tlc-spec-driven` (Execute + Verifier). Nenhuma outra.
