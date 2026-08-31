# identidade-visual Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/identidade-visual/spec.md`
**Diff range**: `56ec10e..9121be7` (8 commits: `43a9e17`, `becef03`, `0d71f21`, `b891320`, `a9ccc11`, `9461857`, `94c0c2e`, `9121be7`)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Result**: ❌ **FAIL** — o produto funciona, a rede de testes não discrimina três comportamentos que a spec exige

> **Recorte verificado.** Somente **UI-01…UI-07, UI-20 e UI-21**. UI-08…UI-19 e UI-22 estão declaradamente `Pending` no recorte de `design.md`/`tasks.md` e **não** foram tratados como lacuna.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1 | ✅ Done | `globals.css` — reset em `@layer base` (`src/app/globals.css:28-34`), fontes reapontadas (`:51-53`) |
| T2 | ✅ Done | `src/lib/ui/navegacao.ts` + 24 testes unitários |
| T3 | ✅ Done | `painel/page.tsx:7,15` consome `modulosDoPerfil`; literal removido |
| T4 | ✅ Done | 11 `page.tsx`; `grep -rn "min-h-screen" "src/app/(protegido)"` volta vazio; diff é só `<main …>` → `<>` |
| T5 | ✅ Done | `CascaProtegida.tsx` + `(protegido)/layout.tsx:38` |
| T6 | ✅ Done | `NavegacaoPerfil.tsx`, montado em `CascaProtegida.tsx:31` |
| T7 | ✅ Done | `BotaoSair.tsx`, montado em `CascaProtegida.tsx:35` |
| T8 | ✅ Done | AD-039 em `.specs/STATE.md:163-169`; convenção em `AGENTS.md:11-15`; traceability atualizada |

---

## Spec-Anchored Acceptance Criteria

| Critério (WHEN X THEN Y) | Resultado definido pela spec | `file:line` + expressão da asserção | Resultado |
| --- | --- | --- | --- |
| **UI-01** cabeçalho no topo com marca "SPMA" | texto "SPMA" no cabeçalho de toda rota protegida | `e2e/identidade-visual.spec.ts:99` — `await expect(page.getByTestId("casca-cabecalho")).toContainText("SPMA")`; `:102` idem em `/avaliacoes` | ✅ PASS |
| **UI-01** cabeçalho com nome + sigla do perfil | `usuario.nome` e a sigla (`GT`) | `e2e/…:112` — `await expect(cabecalho).toContainText(NOME_CASCA)`; `:113` — `await expect(cabecalho).toContainText("GT")` | ✅ PASS |
| **UI-01** cabeçalho com botão "Sair" | botão existe e é acionável | `e2e/…:317` — `await page.getByRole("button", { name: "Sair" }).click()` (o clique falha se o botão não existir) | ✅ PASS (ver nota 1) |
| **UI-01** cabeçalho com a navegação do perfil | nav renderizada dentro do cabeçalho | `e2e/…:195` — `await expect(linksDoMenu(page)).toHaveText(["Painel","Novo usuário","Pré-cursos","Pós-cursos","Avaliações"])` — **escopado em `getByTestId("navegacao-perfil")`, não no cabeçalho** | ⚠️ Conjunto de contenção não afirmado (nota 1) |
| **UI-02** itens vêm de fonte única; perfil nunca recebe link fora da sua lista | conjunto exato de `href` por perfil (tabela do design) | `src/lib/ui/navegacao.test.ts:57` — `expect(hrefsDe(tipo)).toEqual(HREFS_ESPERADOS[tipo])` (6 perfis); `:68-70` — `expect(hrefsDe(TipoUsuario.VT)).not.toContain("/usuarios/novo")`; `:100` — `expect(modulosDoPerfil(tipo)).toEqual(MODULOS_ESPERADOS[tipo])`; e2e `:210`, `:218-219`, `:227` | ✅ PASS |
| **UI-03** rota atual → `aria-current="page"` | atributo literal `aria-current="page"` no item ativo, e só nele | `e2e/…:239-242` — `await expect(menu.getByRole("link", { name: "Avaliações" })).toHaveAttribute("aria-current","page")`; `:243` — `await expect(menu.locator('a[aria-current="page"]')).toHaveCount(1)`; sub-rota `:251-254` | ✅ PASS (ver M2) |
| **UI-03** (lógica) `hrefAtivo` casa exato / sub-rota / mais longo / nada | `/avaliacoes/novo`→`/avaliacoes`; `/usuarios/novo` vence `/usuarios`; desconhecido → `null` | `navegacao.test.ts:115` — `expect(hrefAtivo("/avaliacoes", itens)).toBe("/avaliacoes")`; `:119` — `…("/avaliacoes/novo", itens)).toBe("/avaliacoes")`; `:123` — `…("/pre-cursos/12", itens)).toBe("/pre-cursos")`; `:127` — `…("/usuarios/novo", itens)).toBe("/usuarios/novo")`; `:131` — `…("/relatorios", itens)).toBeNull()`; `:135` — `…("/painel", [])).toBeNull()` | ⚠️ Fronteira do separador não discriminada (**M2 sobreviveu**) |
| **UI-04** "Sair" → `POST /api/auth/logout` com `x-csrf-token` de `headerCSRF()`, e em sucesso navega para `/login` | URL final `/login` **e** cookie anterior deixa de autenticar | `e2e/…:318` — `await expect(page).toHaveURL(/\/login$/)`; `:325` — `await expect(pageAntiga).toHaveURL(/\/login$/)` (cookie salvo em `:314-315`) | ✅ PASS — o header CSRF não é afirmado diretamente, mas **E1 provou** que sua remoção derruba `:318` (a rota real valida CSRF em `src/app/api/auth/logout/route.ts:16-18`) |
| **UI-05** logout rejeitado por **403** → permanece na página + mensagem | segue em `/painel`, mensagem de falha visível | `e2e/…:341` — `await expect(page.getByTestId("erro-sair")).toBeVisible()`; `:342` — `await expect(page).toHaveURL(/\/painel$/)` | ✅ PASS |
| **UI-05** logout que **falha por rede** → permanece na página + mensagem | mesma mensagem do 403 | **nenhuma** — nenhum teste aborta a rota; `src/components/layout/BotaoSair.tsx:38-40` (`catch`) não é exercitado | ❌ GAP — não coberto |
| **UI-05** logout **401** → permanece na página + mensagem, sem navegar | a spec exige ficar na página… | `e2e/…:357` — `await expect(page).toHaveURL(/\/login$/)` — o teste afirma **o oposto** do texto de UI-05 | ⚠️ Spec-precision gap (contradição interna da spec — ver nota 2) |
| **UI-06** conteúdo dentro de um contêiner **único** | exatamente um `<main>` | `e2e/…:129` — `await expect(page.locator("main")).toHaveCount(1)` (só em `/painel`) | ✅ PASS (parcial) |
| **UI-06** contêiner **centralizado e de largura máxima fixa** | `mx-auto` + `max-w-5xl` efetivos | **nenhuma** — **E7 sobreviveu**: remover `mx-auto max-w-5xl` de `CascaProtegida.tsx:38` mantém os 19 testes verdes | ❌ GAP |
| **UI-06** **mesmo espaçamento vertical em todas** as 11 telas | `py-8` idêntico em todas | **nenhuma** — nenhuma asserção de espaçamento; só `/painel` é inspecionado | ❌ GAP |
| **UI-07** <640px sem scroll horizontal | `scrollWidth <= clientWidth` a 375px | `e2e/…:145` — `expect(scrollWidth).toBeLessThanOrEqual(clientWidth)` — **asserção vácua**: `globals.css:11-15` fixa `html, body { max-width: 100vw; overflow-x: hidden }`, e **E8 sobreviveu** | ❌ GAP (asserção não discrimina) |
| **UI-07** cabeçalho e navegação **legíveis** a <640px | header e nav visíveis | `e2e/…:139` — `await expect(page.getByTestId("casca-cabecalho")).toBeVisible()` — só o header; a nav não é afirmada visível | ⚠️ Meio conjunto não afirmado |
| **UI-07** **sem depender de JavaScript** para revelar a navegação | nav presente com JS desabilitado | **nenhuma** — nenhum teste roda com JS desabilitado | ❌ GAP — não coberto |
| **UI-20** `--font-sans` aponta para a variável real; nada de serifada de fallback | `font-family` do `body` contém `Geist` e não é serifada | `e2e/…:29` — `expect(fontFamily).toContain("Geist")`; `:30` — `expect(fontFamily).not.toMatch(/Times|^serif$/i)` | ✅ PASS (E6 morto) |
| **UI-20** `--font-mono` aponta para `--font-geist-mono` | variável resolvida | **nenhuma** — `globals.css:53` declara, mas nenhum teste observa o mono | ⚠️ Meio conjunto não afirmado (consumidor é UI-11, `Pending`) |
| **UI-21** reset deixa de anular as utilidades de espaçamento | `padding-left` do `CardContent` ≠ `0px` | `e2e/…:49` — `expect(paddingLeft).not.toBe("0px")` (alvo: `px-(--card-spacing)` em `src/components/ui/card.tsx:76`) | ✅ PASS (E5 morto) |

**Nota 1.** `NavegacaoPerfil` e `BotaoSair` são montados dentro de `<header>` em `CascaProtegida.tsx:31,35` — a contenção é estrutural, mas nenhuma asserção a fixa. Um refactor que os tirasse do cabeçalho passaria. Severidade menor.

**Nota 2 (contradição na própria spec).** UI-05 diz *"IF a requisição de logout for rejeitada (403 de CSRF, **401 de sessão ausente**) … THEN manter o usuário na página atual e exibir uma mensagem de falha, sem navegar para `/login`"*. O **Edge Case** da mesma spec diz o contrário: *"tratar a segunda resposta 401 como conclusão bem-sucedida … e concluir a navegação para `/login`"*. `design.md` ("Tech Decisions": *401 do logout → tratado como sucesso*) e `BotaoSair.tsx:31` seguem o edge case. O comportamento implementado é o defensável; **o texto de UI-05 nunca foi corrigido** e mesmo assim UI-05 está marcado `Verified` na traceability. Isso não é defeito de produto — é um AC que, lido ao pé da letra, o código viola por decisão consciente e não registrada como `SPEC_DEVIATION`.

**Status**: ❌ Gaps presentes — 4 ACs/meios-ACs sem evidência, 2 spec-precision gaps.

---

## Discrimination Sensor

**Isolamento**: worktree temporário `git worktree add --detach <scratch> HEAD` (nunca `git stash`). Baseline `git status --porcelain` da árvore real **vazio** antes e depois; worktree removido e `git worktree prune` executado; HEAD intacto em `9121be7`.

> **Duas execuções anteriores foram descartadas como inválidas** e não constam abaixo: (a) o Turbopack recusou a junção `node_modules` do worktree (*"Symlink [project]/node_modules is invalid, it points out of the filesystem root"*), derrubando o `webServer` — todo mutante "morria" por infraestrutura; (b) o `|` das regex `--grep` era consumido pelo `cmd.exe`, e `No tests found` também produzia saída não-zero. Só valem os números abaixo, colhidos depois de um baseline verde no scratch (**19 passed em 1.7 min**) e com guarda explícita contra run sem sumário.

### Mutantes unitários — `src/lib/ui/navegacao.ts` (`npx vitest run src/lib/ui/navegacao.test.ts`)

| # | File:line | Mutação | Morto? | Teste que matou |
| --- | --- | --- | --- | --- |
| M1 | `navegacao.ts:87-89` | "href mais longo vence" → `return candidatos[0]` (primeiro que casar) | ✅ Killed | `navegacao.test.ts:126` *o href mais longo vence quando dois casam* |
| **M2** | **`navegacao.ts:81`** | **`pathname.startsWith(\`${href}/\`)` → `pathname.startsWith(\`${href}\`)`** | ❌ **SURVIVED** | — (24/24 passaram) |
| M3 | `navegacao.ts:51-54` | VT ganha `/usuarios/novo` | ✅ Killed | `:56` (VT), `:67`, `:99` (3 testes) |
| M4 | `navegacao.ts:60` | AL usa o item rotulado "Avaliações" | ✅ Killed | `:73` *o item de /avaliacoes se chama 'Minha avaliação' para AL* |
| M5 | `navegacao.ts:40` | rótulo de módulo "Ofertantes" → "Ofertante" | ✅ Killed | `:99` (AM) — contrato literal de `painel-modulos` |
| M6 | `navegacao.ts:65` | `navegacaoDoPerfil` não inclui "Painel" | ✅ Killed | `:56` (6 perfis) + `:83` — 7 testes |

### Mutantes e2e — `npx playwright test e2e/identidade-visual.spec.ts`

| # | File:line | Mutação | Morto? | Teste que matou |
| --- | --- | --- | --- | --- |
| E1 | `BotaoSair.tsx:25` | remove o spread `...headerCSRF()` do `fetch` | ✅ Killed | `e2e/identidade-visual.spec.ts:306` *UI-04: sair leva a /login e o cookie anterior deixa de autenticar* |
| E2 | `BotaoSair.tsx:31` | `res.ok \|\| res.status === 401` → `res \|\| …` (navega mesmo em 403) | ✅ Killed | `e2e/…:329` *UI-05: logout rejeitado mantém a página atual e exibe a falha* |
| E3 | `CascaProtegida.tsx:33` | renderiza o CPF ao lado do nome | ✅ Killed | `e2e/…:116` *REQ-SEC-12: o CPF … não aparece em lugar nenhum do documento* |
| E4 | `NavegacaoPerfil.tsx:30` | nunca emite `aria-current` | ✅ Killed | `e2e/…:232` **e** `:246` (os dois testes de UI-03) |
| E5 | `globals.css:28-34` | devolve o reset para fora de `@layer base` | ✅ Killed | `e2e/…:33` *UI-21: as utilidades de espaçamento do Tailwind valem* |
| E6 | `globals.css:52` | volta a autorreferência `--font-sans: var(--font-sans)` | ✅ Killed | `e2e/…:16` *UI-20: o corpo do documento renderiza na Geist* |
| **E7** | **`CascaProtegida.tsx:38`** | **`<main>` perde `mx-auto` e `max-w-5xl`** | ❌ **SURVIVED** | — (19/19 passaram, 53.6s) |
| **E8** | **`CascaProtegida.tsx:27`** | **header `flex-nowrap` + `whitespace-nowrap` (estoura a 375px)** | ❌ **SURVIVED** | — (19/19 passaram, 54.4s) |
| **E9** | **`CascaProtegida.tsx:33`** | **nome perde `truncate` e `max-w-64`** | ❌ **SURVIVED** | — (19/19 passaram, 53.7s) |

**Sensor depth**: expandido (15 mutações — acima do mínimo "lightweight" de 1-3)
**Resultado**: **11/15 mortos, 4 sobreviventes** — ❌ FAIL

**Suspeita do orquestrador sobre o `headerCSRF()`: REFUTADA.** Os 3 testes do `BotaoSair` de fato interceptam `/api/auth/logout` com `page.route`, mas **o teste de UI-04 (`e2e/…:306`) não intercepta nada** — ele bate na rota real, que valida CSRF em `src/app/api/auth/logout/route.ts:16-18` (double-submit em `src/lib/security/csrf.ts:34-50`). Sem o header, a rota devolve 403, `BotaoSair` não navega, e `:318` (`toHaveURL(/\/login$/)`) falha. E1 morreu com exatamente esse erro. Não há lacuna aqui.

**Por que E8 sobreviveu (achado de raiz).** `src/app/globals.css:11-15` fixa `html, body { max-width: 100vw; overflow-x: hidden }`. Com o overflow clipado na raiz, `document.documentElement.scrollWidth` não passa de `clientWidth` **qualquer que seja o conteúdo**, então `e2e/…:145` é uma tautologia: ela passaria mesmo com o cabeçalho estourando a viewport. UI-07 está, na prática, sem verificação de "sem scroll horizontal".

---

## Edge Cases

- [x] Perfil com um único módulo (AL) — `e2e/…:210` `await expect(linksDoMenu(page)).toHaveText(["Painel", "Minha avaliação"])`
- [x] Sub-rota marca a rota-pai; nenhum item quando não há pai — `navegacao.test.ts:119,123,131` + `e2e/…:251`
- [ ] **`usuario.nome` longo trunca com reticências** — ❌ nenhuma fixture usa nome longo; **E9 sobreviveu**
- [x] Clique duplo → 401 tratado como sucesso — `e2e/…:357` `await expect(page).toHaveURL(/\/login$/)`
- [x] `(onboarding)` sem cabeçalho — `e2e/…:155` e `:162` `await expect(…getByTestId("casca-cabecalho")).toHaveCount(0)`

---

## Gate Check

- **Comando (Build gate + Full)**: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

| Gate | Resultado |
| --- | --- |
| `npm run lint` | **0 erros**, 34 warnings (todos pré-existentes: `_omitido`/`_a`/`_b`/`_c`) |
| `npm run build` | ✅ passa |
| `npm run typecheck` | ✅ limpo |
| `npm run test:unit` | ✅ **485 passed** / 25 arquivos |
| `npm run test:integration` | ✅ **27 passed** / 6 arquivos |
| `npm run test:e2e` | ✅ **221 passed** (18.9 min), 0 falhas, 0 skips |

- **Contagem antes da feature** (linha de base do Execute, HEAD `56ec10e`): 461 / 27 / 202
- **Contagem depois**: 485 / 27 / 221 — **delta +24 unit, +19 e2e**
- **Integridade dos testes**: `git diff --name-status 56ec10e..HEAD` mostra **apenas `A`** (adicionados) para `e2e/identidade-visual.spec.ts` e `src/lib/ui/navegacao.test.ts`. **Nenhum arquivo de teste existente foi modificado ou removido** — a condição de não-regressão de UI-12 se sustenta para este recorte.
- **Skipped**: nenhum
- **Failures**: nenhuma

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ — nas 11 páginas o diff é só `<main …>` → `<>`; nenhum `data-testid` ou rótulo alterado |
| Sem scope creep | ✅ — 23 arquivos, todos previstos por T1–T8 |
| Segue os padrões existentes | ✅ — `Record<TipoUsuario, …>` exaustivo como `cascata.ts`; `cn()`; `data-testid` próprio |
| Sem cor literal em `.tsx` (AD-039) | ✅ — `grep -rE '#[0-9a-fA-F]{3,8}\|rgb\(\|oklch\(\|bg-(neutral\|slate\|zinc\|gray)-'` nos arquivos novos volta vazio |
| Fronteira servidor/cliente correta | ✅ — `usePathname` só em Client Component, confirmado em `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md:30,36`; `cacheComponents` ausente de `next.config.ts` (Next 16.3.2) |
| Spec-anchored outcome check | ❌ — UI-06 e UI-07 têm asserção que não mira o resultado da spec |
| Per-layer Coverage Expectation | ❌ — a matriz exige "todos os ramos" do módulo puro; a fronteira do separador em `hrefAtivo:81` não é exercitada |
| Todo teste mapeia para um requisito (sem teste órfão) | ✅ — 19 e2e + 24 unit, todos rotulados por UI-NN / edge case |
| Guidelines do projeto seguidos | ✅ — `AGENTS.md` (doc do Next lida do disco), `vitest.config.ts`, `playwright.config.ts` |

---

## Fix Plans

### Fix 1 — `hrefAtivo` não discrimina a fronteira do separador (M2)
- **Blocker?** Major
- **Root cause**: nenhum caso de teste usa um pathname que compartilha o prefixo sem a barra. `/relatorios` (`navegacao.test.ts:131`) não casa com nenhum `href`, então passa com as duas implementações.
- **Fix**: acrescentar em `navegacao.test.ts` `expect(hrefAtivo("/pre-cursos-antigos", itens)).toBeNull()` (ou `/painel-x`). Nenhuma mudança de produção — `navegacao.ts:81` já está correto.

### Fix 2 — UI-07 "sem scroll horizontal" é uma asserção vácua (E8)
- **Blocker?** Major
- **Root cause**: `globals.css:11-15` clipa o overflow na raiz, então `documentElement.scrollWidth` nunca excede `clientWidth`.
- **Fix**: medir o elemento que pode estourar, não a raiz — ex.: `const h = page.getByTestId("casca-cabecalho"); expect(await h.evaluate(e => e.scrollWidth)).toBeLessThanOrEqual(await h.evaluate(e => e.clientWidth))`, e afirmar também que a nav está visível a 375px. Re-rodar E8 e confirmar que morre.

### Fix 3 — UI-06 não afirma o contêiner (E7)
- **Blocker?** Major
- **Root cause**: `e2e/…:129` só conta `<main>`; centralização e largura máxima não são observadas, nem o espaçamento vertical comum.
- **Fix**: afirmar via `getComputedStyle` do `main` que `max-width` é finito (≠ `none`) e que as margens laterais são iguais; repetir a contagem de `<main>` em ao menos uma segunda rota (ex.: `/avaliacoes`).

### Fix 4 — nome longo nunca é exercitado (E9, edge case da spec)
- **Blocker?** Minor
- **Root cause**: `NOME_CASCA = "Fulana de Tal da Casca"` cabe no `max-w-64`.
- **Fix**: fixture com nome deliberadamente longo e asserção de que o `<span>` do nome tem `scrollWidth > clientWidth` com `text-overflow: ellipsis`.

### Fix 5 — UI-05: 401 contradiz o edge case; e o ramo de rede não é coberto
- **Blocker?** Major (spec) + Minor (teste)
- **Root cause**: o texto de UI-05 nunca foi corrigido depois de a decisão "401 = sucesso" ter sido tomada em `design.md`; e nenhum teste aborta a rota, deixando `BotaoSair.tsx:38-40` sem cobertura.
- **Fix**: (a) reescrever UI-05 excluindo o 401 (que passa a ser tratado só pelo edge case) — ou registrar `// SPEC_DEVIATION` em `BotaoSair.tsx:31`; (b) teste com `page.route("**/api/auth/logout", r => r.abort())` afirmando `erro-sair` visível e URL inalterada.

### Fix 6 — UI-07 "sem depender de JavaScript" não é verificado
- **Blocker?** Minor
- **Root cause**: nenhum teste desabilita JS.
- **Fix**: um teste em contexto com `javaScriptEnabled: false` afirmando que os links da nav estão presentes.

---

## Requirement Traceability Update

| Requirement | Status atual na spec | Status apurado |
| --- | --- | --- |
| UI-01 | Verified | ✅ Verified (com nota 1, menor) |
| UI-02 | Verified | ✅ Verified |
| UI-03 | Verified | ⚠️ Verified com lacuna de discriminação (M2) |
| UI-04 | Verified | ✅ Verified |
| UI-05 | Verified | ❌ Needs Fix (ramo de rede sem cobertura; 401 contradiz o texto do AC) |
| UI-06 | Verified | ❌ Needs Fix (E7) |
| UI-07 | Verified | ❌ Needs Fix (E8; "sem JS" sem cobertura) |
| UI-20 | Verified | ✅ Verified (`--font-mono` sem observação, menor) |
| UI-21 | Verified | ✅ Verified |
| UI-08…UI-19, UI-22 | Pending | Fora do recorte — não avaliados |

---

## Summary

**Overall**: ⚠️ Issues — a casca funciona e o gate está inteiro verde; a rede de testes é que não segura três comportamentos exigidos pela spec.

**Spec-anchored check**: 6 ACs plenamente casados com o resultado da spec · 3 com lacuna (UI-05, UI-06, UI-07) · 2 spec-precision gaps (401 de UI-05; `--font-mono` de UI-20)
**Sensor**: 15 mutações injetadas — **11 mortas, 4 sobreviventes** (M2, E7, E8, E9)
**Gate**: 485 unit + 27 integration + 221 e2e, 0 falhas; lint 0 erros; build e typecheck limpos; zero arquivo de teste existente alterado

**O que funciona**: cabeçalho em toda rota protegida com marca, nome e sigla (sem CPF — E3 morto); menu derivado de fonte única, exato por perfil nos 6 perfis; `aria-current="page"` no item ativo, inclusive em sub-rota (E4 morto); logout real com CSRF, que invalida a sessão e leva a `/login` (E1 morto), com 403 mantendo o usuário na página (E2 morto); os dois defeitos de base de `globals.css` corrigidos e provados por `getComputedStyle` (E5 e E6 mortos).

**Problemas** (ranqueados): (1) `hrefAtivo` aceita prefixo sem separador sem que nenhum teste perceba; (2) UI-07 mede scroll horizontal num elemento que não pode estourar; (3) UI-06 não afirma contêiner nem espaçamento; (4) UI-05 sem teste do ramo de rede e com o 401 contradizendo o próprio AC; (5) nome longo e "sem JS" sem cobertura.

**Next steps**: aplicar os Fixes 1–6 (todos são de **teste**, exceto o 5a, que é de **texto da spec** — nenhum exige mudança de produção) e re-despachar o Verifier. Iteração 1 de no máximo 3.
