# identidade-visual Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/identidade-visual/design.md`
**Status**: Approved

> **Recorte.** Estas tarefas implementam **apenas** o recorte declarado no topo de `design.md`: a casca comum com o menu de navegação por perfil (UI-01 … UI-07) e os dois defeitos de base que são pré-requisito dele (UI-20, UI-21). UI-08 … UI-19 e UI-22 continuam `Pending` na traceability da spec e ganharão o próprio ciclo Design → Tasks.

---

## Pré-condição de Execute (ler antes da T1)

`STATE.md` registra que **`npm run test:e2e` não foi reexecutado** depois da troca dos questionários (AD-035/036/037) — a porta 3000 estava ocupada. Os números 382/27/199 da spec (UI-12) são anteriores a essa troca; a contagem unitária já subiu para 418.

Por isso o Execute **começa estabelecendo a linha de base**: rodar `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` no HEAD, **antes** da T1, e anotar as três contagens obtidas neste arquivo. Todo "Test count" abaixo é expresso como **delta sobre essa linha de base**, nunca como um absoluto herdado da spec. Se a linha de base já vier vermelha, parar e reportar — uma falha pré-existente não pode ser confundida com regressão desta feature.

**Linha de base estabelecida (2026-08-30, HEAD `56ec10e`).** A árvore foi limpa em 3 commits antes da medição (`e2a19b1` troca dos questionários, `b79500c` seed de demonstração, `56ec10e` artefatos desta feature), então a medição vale para um HEAD limpo.

| Gate | Resultado |
| --- | --- |
| `npm run lint` | 0 erros, 34 warnings pré-existentes (`_omitido`/`_a`/`_b`/`_c` em testes de completude) |
| `npm run build` | passa |
| `npm run typecheck` | limpo |
| `npm run test:unit` | **461** testes / 24 arquivos |
| `npm run test:integration` | **27** testes / 6 arquivos |
| `npm run test:e2e` | **202** testes / 20.1 min |

Os números 382/27/199 citados na spec (UI-12) são anteriores à troca dos questionários e **não** são a referência. Todo "Test count" abaixo é delta sobre **461 / 27 / 202**.

Nota de execução: o `next dev` que ocupava a porta 3000 tinha um processo supervisor que respawnava o worker; foi preciso encerrar o supervisor, não só o processo que detinha a porta.

---

## Test Coverage Matrix

> Herdada de `auth-e-usuarios` … `avaliacao-aluno` (mesma stack já aprovada e em uso): Vitest (unit, ambiente `node` — **sem jsdom**, ver `vitest.config.ts`) + Playwright (e2e). Guidelines encontradas: `AGENTS.md` (só regra de leitura da doc do Next), `vitest.config.ts`, `playwright.config.ts` — nenhum threshold de cobertura explícito, então vale o padrão forte (1:1 com ACs da spec + todo edge case listado), igual às 6 features anteriores.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Módulo puro (`src/lib/ui/navegacao.ts`) | unit | Todos os ramos; 1:1 com UI-02/UI-03; os 6 perfis e cada edge case de rota-pai listado na spec | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Componentes de casca e layout (`src/components/layout/*.tsx`, `src/app/(protegido)/layout.tsx`) | e2e | Cada AC de UI-01/02/03/04/05/06/07: happy path + o caminho de erro do logout + o edge case de sub-rota | `e2e/*.spec.ts` | `npm run test:e2e` |
| Tokens e reset (`src/app/globals.css`) | e2e | Os dois defeitos observados (UI-20, UI-21) verificados por `getComputedStyle`, não por inspeção visual | `e2e/*.spec.ts` | `npm run test:e2e` |
| Telas migradas (as 11 páginas de `(protegido)`) | e2e (regressão) | A suíte e2e existente passa **sem nenhum arquivo de teste alterado** (UI-12) | `e2e/*.spec.ts` | `npm run test:e2e` |
| Artefatos de `.specs/` e `AGENTS.md` | none | — (build gate apenas) | — | build gate apenas |

**Por que componente de UI não tem teste unitário aqui:** o ambiente do Vitest deste projeto é `node` e o projeto não tem `@testing-library` nem jsdom instalados. Introduzir uma stack de teste de componente é decisão de projeto, não escopo desta feature — e o comportamento em questão (link ativo, logout, quebra de linha) é observável de ponta a ponta. Toda a lógica pura do menu vive em `navegacao.ts`, que **tem** teste unitário.

## Gate Check Commands

> Herdada das features anteriores — mesma ordem de build (`lint` → `build` → `typecheck`, exigida pelo Next 16, que gera `LayoutProps` no build).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefas só com teste unitário | `npm run test:unit` |
| Full | Tarefas com teste e2e | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | Tarefas de documentação/config | `npm run lint && npm run build && npm run typecheck` |

---

## Execution Plan

Fases são ordenadas e rodam sequencialmente; tarefas dentro de uma fase rodam em ordem. **8 tarefas no total** → cabe num lote único (≤ ~8), execução inline, sem sub-agentes.

### Phase 1: Fundação (base visual utilizável + fonte única da navegação)

```
T2 → T3
```

T1 não depende de nada e abre a fase (é ela que estabelece a linha de base e destrava o espaçamento de que a casca depende).

### Phase 2: Casca e menu

```
T1 → T5
T4 → T5
T2 → T6
T5 → T6
T5 → T7
```

T4 não depende de nada.

### Phase 3: Registro de decisão

```
T6 → T8
T7 → T8
```

---

## Task Breakdown

### Phase 1: Fundação

#### T1: Corrigir os dois defeitos de base de `globals.css`

**What**: (a) Mover o reset `* { box-sizing: border-box; padding: 0; margin: 0 }` para dentro de `@layer base`, de modo que ele deixe de vencer `@layer utilities` e as utilidades de espaçamento do Tailwind voltem a valer; (b) trocar a autorreferência `--font-sans: var(--font-sans)` e o `--font-heading` que a acompanha por `var(--font-geist-sans)`, e declarar `--font-mono: var(--font-geist-mono)` — as duas variáveis que `src/app/layout.tsx` já emite. Nenhuma cor, raio ou outra linha do arquivo é tocada.
**Where**: `src/app/globals.css`
**Depends on**: None
**Reuses**: `--font-geist-sans` / `--font-geist-mono` já criadas em `src/app/layout.tsx:5-13`
**Requirement**: UI-20, UI-21

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Linha de base do Execute registrada neste arquivo (unit / integration / e2e) antes de qualquer alteração
- [x] Novo `e2e/identidade-visual.spec.ts` com 2 testes, em `/login` (tela sem sessão, mais barata e já coberta por `login-page.spec.ts`): `getComputedStyle(body).fontFamily` contém `Geist` e **não** cai na serifada de fallback; `getComputedStyle(CardContent).paddingLeft` é diferente de `0px`
- [x] Os dois testes **falham** contra o `globals.css` atual e passam depois da correção (verificado nessa ordem — é a evidência de que discriminam o defeito)
- [x] Gate full passa: `npm run test:unit && npm run test:integration && npm run test:e2e`
- [x] Test count: e2e = linha de base **+2**; unit e integration inalterados
- Evidência da discriminação: contra o `globals.css` do HEAD, `2 failed / 202 passed` (só os dois testes novos); com a correção, `204 passed`. A ordem T1/T2 foi invertida na execução (T2 foi commitada antes, por ser a única que fecha sem a porta 3000), então a contagem unitária de referência aqui é 485, não 461.

**Tests**: e2e
**Gate**: full

**Commit**: `fix(identidade-visual): restaurar fonte Geist e utilidades de espacamento`

---

#### T2: Fonte única da navegação por perfil

**What**: Criar `src/lib/ui/navegacao.ts` — módulo puro, sem `"use client"` e sem import de Prisma — com `ItemNavegacao`, `Modulo`, `MODULOS_POR_PERFIL: Record<TipoUsuario, Modulo[]>`, `navegacaoDoPerfil(tipo)`, `modulosDoPerfil(tipo)` e `hrefAtivo(pathname, itens)`, exatamente como o design especifica. Os sete rótulos de módulo são copiados **verbatim** do literal que hoje vive em `painel/page.tsx:10`. Comentário de topo citando a regra do STATE.md: a navegação é conveniência de UI e nunca autorização.
**Where**: `src/lib/ui/navegacao.ts`
**Depends on**: None
**Reuses**: literal `MODULOS_POR_PERFIL` de `src/app/(protegido)/painel/page.tsx:10`; `TipoUsuario` de `src/generated/prisma/enums`; padrão de `Record` exaustivo por perfil de `src/lib/auth/cascata.ts:7`
**Requirement**: UI-02, UI-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `src/lib/ui/navegacao.test.ts` cobre, no mínimo: os 6 perfis com o conjunto exato de `href` da tabela do design; AL **não** recebe `/pre-cursos` nem `/pos-cursos`; VT, VO e AL **não** recebem `/usuarios/novo`; o rótulo do item de `/avaliacoes` é "Minha avaliação" para AL e "Avaliações" para os outros 5; todo perfil recebe `/painel`
- [x] `modulosDoPerfil` devolve, para cada um dos 6 perfis, exatamente a mesma lista de strings do literal atual do painel (asserção literal, não estrutural — é o contrato que segura `e2e/painel.spec.ts`)
- [x] `hrefAtivo` coberto nos 5 casos: exato; sub-rota (`/avaliacoes/novo` → `/avaliacoes`, `/pre-cursos/12` → `/pre-cursos`); mais-longo vence (`/usuarios/novo` não é ofuscado por um `/usuarios`); pathname desconhecido → `null`; lista vazia → `null`
- [x] Nenhum `href` da tabela aponta para rota inexistente — teste que compara os `href` distintos contra a lista literal das rotas implementadas em `src/app/(protegido)`
- [x] Gate quick passa: `npm run test:unit`
- [x] Test count: unit = linha de base **+16** ou mais; nenhum teste existente removido

**Tests**: unit
**Gate**: quick

**Commit**: `feat(identidade-visual): adicionar fonte unica de navegacao por perfil`

---

#### T3: `/painel` passa a consumir a fonte única

**What**: Remover o literal `MODULOS_POR_PERFIL` de `painel/page.tsx` e renderizar `modulosDoPerfil(usuario.tipo)`. Nenhuma outra alteração na página: `data-testid="painel-perfil"`, `data-testid="painel-modulos"`, o `Card` e os textos ficam idênticos.
**Where**: `src/app/(protegido)/painel/page.tsx`
**Depends on**: T2
**Reuses**: `modulosDoPerfil` (T2)
**Requirement**: UI-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Nenhum literal de módulo sobra em `painel/page.tsx` (`grep` por "Ofertantes" no arquivo volta vazio)
- [ ] `e2e/painel.spec.ts` passa **sem nenhuma alteração no arquivo de teste** (UI-12) — é a prova de que os rótulos não mudaram
- [ ] Gate full passa
- [ ] Test count: unit, integration e e2e todos iguais aos da T2/T1 (esta tarefa não adiciona teste; ela é coberta pela regressão existente mais os testes literais de `modulosDoPerfil` da T2)

**Tests**: e2e
**Gate**: full

**Commit**: `refactor(identidade-visual): painel consome a fonte unica de navegacao`

---

### Phase 2: Casca e menu

#### T4: Devolver o `<main>` das 11 telas protegidas

**What**: Em cada uma das 11 páginas de `(protegido)`, trocar o wrapper `<main className="… min-h-screen …">` por um fragmento (`<>`), removendo com ele o `min-h-screen`, o `items-center`/`justify-center` e o `p-4` que existiam só porque não havia casca. Todo o resto — `Card`, `CardHeader`, textos, `data-testid`, `className` dos elementos internos — fica byte a byte igual. Nenhum arquivo de `(onboarding)` ou `(public)` é tocado.
**Where**: as 11 `page.tsx` de `src/app/(protegido)/` (painel, usuarios/novo, pre-cursos, pre-cursos/novo, pre-cursos/[id], pos-cursos, pos-cursos/novo, pos-cursos/[cdCurso], avaliacoes, avaliacoes/novo, avaliacoes/[cpf]/[cdCurso])
**Depends on**: None
**Reuses**: —
**Requirement**: UI-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `grep -rn "min-h-screen" "src/app/(protegido)"` volta vazio
- [ ] Nenhum `data-testid` e nenhum texto de rótulo alterado (conferido por `git diff` antes do commit)
- [ ] Gate full passa com **zero arquivo de teste alterado** — a suíte e2e existente é a rede de regressão desta tarefa (UI-12)
- [ ] Test count: as três contagens iguais às da T3

**Tests**: e2e (regressão)
**Gate**: full

**Commit**: `refactor(identidade-visual): remover wrapper main das telas protegidas`

---

#### T5: Casca comum das rotas protegidas

**What**: Criar `src/components/layout/CascaProtegida.tsx` (Server Component: `<header>` com a marca textual "SPMA", à direita `usuario.nome` truncado + a sigla do perfil, **sem CPF**; abaixo `<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>`; `header` com `flex flex-wrap` para UI-07) e passar `(protegido)/layout.tsx` a renderizar `<CascaProtegida usuario={usuario}>{children}</CascaProtegida>` no lugar de `<>{children}</>`. A ordem dos três guards do layout **não muda**. Navegação e "Sair" entram nas T6 e T7 — esta tarefa deixa os slots prontos.
**Where**: `src/components/layout/CascaProtegida.tsx`
**Depends on**: T1, T4
**Reuses**: `usuario` já resolvido por `requireSession()` em `src/app/(protegido)/layout.tsx:31` (nenhuma query nova); tokens de `globals.css` (nenhuma cor literal no `.tsx`)
**Requirement**: UI-01 (parcial: marca e identificação), UI-06, UI-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `e2e/identidade-visual.spec.ts` ganha 4 testes: o cabeçalho com "SPMA" aparece em `/painel` **e** em `/avaliacoes` (prova que é da casca, não da página); o nome e a sigla do perfil do usuário logado aparecem; o CPF do usuário logado **não** aparece em lugar nenhum do documento; existe exatamente **um** `<main>` na página (`page.locator("main")` → count 1)
- [ ] Teste de UI-07: com `viewport` de 375px de largura, `document.documentElement.scrollWidth <= clientWidth` em `/painel` (sem scroll horizontal) e o cabeçalho continua visível
- [ ] `/primeiro-acesso` e `/cadastro-ofertante` **não** renderizam o cabeçalho (edge case da spec) — 1 teste
- [ ] Gate full passa, zero arquivo de teste existente alterado
- [ ] Test count: e2e = contagem da T4 **+6**

**Tests**: e2e
**Gate**: full

**Commit**: `feat(identidade-visual): adicionar casca comum das telas protegidas`

---

#### T6: Menu de navegação por perfil

**What**: Criar `src/components/layout/NavegacaoPerfil.tsx` (`"use client"`, porque `usePathname` é hook de Client Component — ver `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md`): recebe `itens: ItemNavegacao[]`, renderiza `<nav aria-label="Navegação principal" data-testid="navegacao-perfil">` com um `next/link` por item, e marca com `aria-current="page"` o item devolvido por `hrefAtivo(usePathname(), itens)`. Montar dentro de `CascaProtegida`, que passa `navegacaoDoPerfil(usuario.tipo)`. `flex flex-wrap` — nenhum drawer, nenhum hambúrguer, nenhum JS para revelar a navegação.
**Where**: `src/components/layout/NavegacaoPerfil.tsx`
**Depends on**: T2, T5
**Reuses**: `navegacaoDoPerfil` e `hrefAtivo` (T2); `cn()` de `src/lib/utils.ts`; `CascaProtegida` (T5)
**Requirement**: UI-01, UI-02, UI-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e por perfil, em contextos separados (padrão de `e2e/painel.spec.ts`): GT vê os 5 itens da tabela do design; AL vê exatamente 2 ("Painel", "Minha avaliação"); AL **não** vê "Pré-cursos" nem "Pós-cursos"; VT **não** vê "Novo usuário" — 4 testes, um por asserção de conjunto (L-014: afirmar cada parte do critério, não só que a navegação renderizou)
- [ ] e2e de UI-03: em `/avaliacoes` o link de `/avaliacoes` tem `aria-current="page"` e os demais não têm; em `/avaliacoes/novo` (sub-rota) o mesmo link continua marcado — 2 testes
- [ ] e2e de navegação real: logado como GT, clicar em "Pós-cursos" no menu chega em `/pos-cursos` sem digitar URL — 1 teste
- [ ] Navegar entre duas rotas com o menu não produz erro de hidratação no console — asserção sobre `page.on("console")`, 1 teste
- [ ] Gate full passa, zero arquivo de teste existente alterado
- [ ] Test count: e2e = contagem da T5 **+8**

**Tests**: e2e
**Gate**: full

**Commit**: `feat(identidade-visual): adicionar menu de navegacao por perfil`

---

#### T7: Botão "Sair"

**What**: Criar `src/components/layout/BotaoSair.tsx` (`"use client"`): `POST /api/auth/logout` com `headers: { ...headerCSRF() }`; em `res.ok` **ou** `res.status === 401` → `router.replace("/login")` + `router.refresh()`; qualquer outra resposta ou erro de rede → permanece na página e exibe a mensagem de falha. Botão `disabled` enquanto a requisição está pendente. Montar em `CascaProtegida`.
**Where**: `src/components/layout/BotaoSair.tsx`
**Depends on**: T5
**Reuses**: `headerCSRF()` de `src/lib/security/csrf-client.ts`; `POST /api/auth/logout` (já implementado e testado em `e2e/logout.spec.ts`); `Button` de `src/components/ui/button.tsx`; `CascaProtegida` (T5)
**Requirement**: UI-04, UI-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e de UI-04: clicar em "Sair" leva a `/login` **e** o cookie de sessão anterior deixa de autenticar uma rota protegida (as duas metades do critério — L-014) — 1 teste com as duas asserções
- [ ] e2e de UI-05: com `page.route("**/api/auth/logout", …)` respondendo 403, clicar em "Sair" mantém a URL na tela atual **e** exibe a mensagem de falha — 1 teste com as duas asserções
- [ ] e2e do edge case do clique duplo: com a rota interceptada respondendo 401, o clique conclui em `/login` — 1 teste
- [ ] Gate full passa, zero arquivo de teste existente alterado
- [ ] Test count: e2e = contagem da T6 **+3**

**Tests**: e2e
**Gate**: full

**Commit**: `feat(identidade-visual): adicionar saida de sessao no cabecalho`

---

### Phase 3: Registro de decisão

#### T8: Registrar AD-039 e atualizar a traceability

**What**: Acrescentar **AD-039** ("Camada visual em arquivo único") à seção `## Decisões` de `.specs/STATE.md`, com o Handoff atualizado (linha da feature, contagens finais e o recorte que ficou de fora); corrigir no cabeçalho de `spec.md` a citação errada de "AD-035" (número já ocupado pelos questionários fonte desde 2026-08-29) para AD-039; marcar UI-01 … UI-07, UI-20 e UI-21 como `Verified` na tabela de Requirement Traceability, deixando os demais em `Pending`; citar a convenção em `AGENTS.md`.
**Where**: `.specs/STATE.md`
**Depends on**: T6, T7
**Reuses**: formato de AD e de Handoff já usado pelas 6 features anteriores
**Requirement**: UI-16 (apenas a parte de registro da decisão; a asserção de "zero cor literal em `.tsx`" pertence à história Base visual, fora deste recorte)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `AD-039` existe em `.specs/STATE.md` e nenhum outro AD duplica esse número
- [ ] Nenhuma ocorrência de "AD-035" sobra em `.specs/features/identidade-visual/` se referindo à camada visual
- [ ] Traceability da spec: 9 requisitos `Verified`, 13 `Pending`, contagem de cobertura atualizada no rodapé
- [ ] Gate build passa: `npm run lint && npm run build && npm run typecheck`

**Tests**: none (matriz: artefatos de `.specs/` e `AGENTS.md` → build gate apenas)
**Gate**: build

**Commit**: `docs(identidade-visual): registrar AD-039 e atualizar traceability`

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: corrigir `globals.css` | 1 arquivo, 2 defeitos coesos da mesma causa (camada/variável) | ✅ Granular |
| T2: `navegacao.ts` | 1 módulo puro | ✅ Granular |
| T3: painel consome a fonte única | 1 arquivo | ✅ Granular |
| T4: remover wrapper `<main>` | 11 arquivos, **uma** edição idêntica em cada | ⚠️ Coeso — dividir criaria 11 commits sem valor e um estado intermediário com `<main>` aninhado em parte das telas |
| T5: `CascaProtegida` | 1 componente + a linha que o monta no layout | ✅ Granular |
| T6: `NavegacaoPerfil` | 1 componente | ✅ Granular |
| T7: `BotaoSair` | 1 componente | ✅ Granular |
| T8: registro de decisão | documentação | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | (sem seta de entrada) | ✅ Match |
| T2 | None | (sem seta de entrada) | ✅ Match |
| T3 | T2 | `T2 → T3` | ✅ Match |
| T4 | None | (sem seta de entrada) | ✅ Match |
| T5 | T1, T4 | `T1 → T5`, `T4 → T5` | ✅ Match |
| T6 | T2, T5 | `T2 → T6`, `T5 → T6` | ✅ Match |
| T7 | T5 | `T5 → T7` | ✅ Match |
| T8 | T6, T7 | `T6 → T8`, `T7 → T8` | ✅ Match |

Nenhuma dependência aponta para uma fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Tarefa diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Tokens e reset (`globals.css`) | e2e | e2e | ✅ OK |
| T2 | Módulo puro (`src/lib/ui/`) | unit | unit | ✅ OK |
| T3 | Tela migrada (`painel/page.tsx`) | e2e (regressão) | e2e | ✅ OK |
| T4 | Telas migradas (11 páginas) | e2e (regressão) | e2e | ✅ OK |
| T5 | Componente de casca + layout | e2e | e2e | ✅ OK |
| T6 | Componente de casca | e2e | e2e | ✅ OK |
| T7 | Componente de casca | e2e | e2e | ✅ OK |
| T8 | Artefatos de `.specs/` | none | none | ✅ OK |

Nenhuma tarefa produz código não verificado: `NavegacaoPerfil` (T6) e `BotaoSair` (T7) já nascem montados na casca da T5, então são exercitáveis por e2e no mesmo commit que os cria — nenhum teste é adiado para uma tarefa posterior.

---

## Ferramentas por tarefa

Nenhuma tarefa precisa de MCP ou Skill além do próprio `tlc-spec-driven`. A única consulta externa prevista é a doc do Next já instalada em `node_modules/next/dist/docs/` (exigência do `AGENTS.md`), lida direto do disco.
