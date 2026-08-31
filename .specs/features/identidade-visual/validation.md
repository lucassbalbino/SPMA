# identidade-visual Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/identidade-visual/spec.md`
**Diff range**: `56ec10e..ed7c892` (10 commits — os 8 da iteração 1 mais `0dbbbb1` (correções) e `ed7c892` (relatório da iteração 1))
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Iteração**: 2 de 3 (máximo)
**Result**: ❌ **FAIL** — os 4 mutantes da iteração 1 morrem e todos os ramos novos discriminam; **2 mutantes novos sobrevivem**, ambos em cláusulas de AC que a iteração 1 já havia sinalizado e que a correção não fechou

> **Recorte verificado.** Somente **UI-01…UI-07, UI-20 e UI-21**. UI-08…UI-19 e UI-22 seguem `Pending` no recorte de `design.md`/`tasks.md` e **não** foram tratados como lacuna.

---

## O que mudou desde a iteração 1

`0dbbbb1` (test-side, exceto o texto de UI-05 em `spec.md:78`) — nenhuma linha de produção alterada. Conferido por `git diff --stat 9121be7..ed7c892`: `spec.md` (+1/-1), `e2e/identidade-visual.spec.ts` (+107/-8), `src/lib/ui/navegacao.test.ts` (+9). `ed7c892` só acrescenta documentação.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1–T8 | ✅ Done | Inalterados desde a iteração 1; nenhum arquivo de produção tocado por `0dbbbb1` |
| Fix 1 (M2) | ✅ Done | `src/lib/ui/navegacao.test.ts:137-141` |
| Fix 2 (E8) | ✅ Done | `e2e/identidade-visual.spec.ts:177-195` |
| Fix 3 (E7) | ⚠️ Parcial | `e2e/…:146-167` fecha "centralizado e largura máxima"; **não** fecha "mesmo espaçamento vertical em todas elas" (ver N1) |
| Fix 4 (E9) | ✅ Done | `e2e/…:198-212` + fixture `NOME_LONGO` em `:66-67` |
| Fix 5a (texto de UI-05) | ✅ Done | `spec.md:78` — reescrita julgada **legítima** (ver abaixo) |
| Fix 5b (ramo de rede) | ✅ Done | `e2e/…:431-444` |
| Fix 6 (sem JS) | ✅ Done | `e2e/…:214-232` |
| Nota 1 da iteração 1 (contenção no `<header>`) | ❌ Não tratada | **N2 sobrevive** — ver sensor |

---

## Julgamento sobre a reescrita de UI-05 (régua movida ou contradição resolvida?)

**Veredito: reescrita legítima.** Não é a régua sendo movida para caber no código. Quatro fatos independentes sustentam isso:

1. **A contradição era interna à própria `spec.md`, e existia antes de qualquer código.** O texto antigo do AC ("401 de sessão ausente → manter na página") e o Edge Case (`spec.md:145`, "tratar a segunda resposta 401 como conclusão bem-sucedida … concluir a navegação para `/login`") entraram **no mesmo commit**, `56ec10e`. A spec nasceu se contradizendo; o AC nunca foi satisfazível como escrito.
2. **A decisão "401 = sucesso" é anterior ao código e está registrada em design aprovado.** `design.md:135`, `:144` e `:176` (linha de Tech Decisions: *"401 do logout | Tratado como sucesso no cliente | a rota responde 401 quando não há sessão — e 'não há sessão' é exatamente o objetivo do botão"*). `git log -- design.md` mostra um único commit: `56ec10e`, o primeiro da feature, antes de `BotaoSair.tsx` existir. Logo o texto do AC estava desalinhado do design **desde a origem**, não foi o código que se desviou.
3. **A reescrita não afrouxa: ela estreita por exatamente um caso, e esse caso continua preso.** As duas obrigações remanescentes (403 e falha de rede → permanecer na página + mensagem, sem navegar) sobrevivem literais, e **as duas passaram a ter teste** (`:427-428` e `:442-443` — a segunda não existia na iteração 1). O caso excluído não ficou sem régua: o texto novo o afirma explicitamente ("tratado como conclusão bem-sucedida") e ele tem teste próprio (`:458`). Contagem de comportamentos ancorados: **subiu**, de 2 para 3.
4. **A alternativa era pior.** A outra saída oferecida na iteração 1 (`// SPEC_DEVIATION` em `BotaoSair.tsx:31`) deixaria o AC afirmando algo que o produto deliberadamente não faz — dívida permanente em vez de correção.

O sinal de "régua movida" seria o comportamento do 401 ficar sem enunciado, ou a mudança ser silenciosa. Nem um nem outro: a mensagem de `0dbbbb1` declara a mudança, e o texto novo fixa a exceção. **Mantido o `spec_precision_gap` da iteração 1 como resolvido.**

---

## Spec-Anchored Acceptance Criteria

| Critério (WHEN X THEN Y) | Resultado definido pela spec | `file:line` + expressão da asserção | Resultado |
| --- | --- | --- | --- |
| **UI-01** cabeçalho no topo com marca "SPMA" | texto "SPMA" no cabeçalho de toda rota protegida | `e2e/identidade-visual.spec.ts:114` — `await expect(page.getByTestId("casca-cabecalho")).toContainText("SPMA")`; `:117` idem em `/avaliacoes` | ✅ PASS |
| **UI-01** cabeçalho com nome + sigla do perfil | `usuario.nome` e a sigla (`GT`) | `e2e/…:127` — `await expect(cabecalho).toContainText(NOME_CASCA)`; `:128` — `await expect(cabecalho).toContainText("GT")` (escopado em `casca-cabecalho`, `:126`) | ✅ PASS |
| **UI-01** cabeçalho com a navegação do perfil e o botão "Sair" | nav e botão **dentro** do cabeçalho | `e2e/…:224` — `await expect(links).toHaveText([...])` escopado em `getByTestId("navegacao-perfil")`; `:403` — `await page.getByRole("button", { name: "Sair" }).click()` escopado na **página** | ❌ GAP de contenção — **N2 sobreviveu**: mover nav e `BotaoSair` para fora do `<header>` mantém os 22 testes verdes |
| **UI-02** itens vêm de fonte única; perfil nunca recebe link fora da sua lista | conjunto exato de `href` por perfil (tabela do design) | `src/lib/ui/navegacao.test.ts:57` — `expect(hrefsDe(tipo)).toEqual(HREFS_ESPERADOS[tipo])` (6 perfis); `:68-70` — `expect(hrefsDe(TipoUsuario.VT)).not.toContain("/usuarios/novo")`; `:100` — `expect(modulosDoPerfil(tipo)).toEqual(MODULOS_ESPERADOS[tipo])`; e2e `:281`, `:296`, `:304-305`, `:313` | ✅ PASS |
| **UI-03** rota atual → `aria-current="page"` | atributo literal `aria-current="page"` no item ativo, e só nele | `e2e/…:325-328` — `await expect(menu.getByRole("link", { name: "Avaliações" })).toHaveAttribute("aria-current","page")`; `:329` — `await expect(menu.locator('a[aria-current="page"]')).toHaveCount(1)`; sub-rota `:337-340` | ✅ PASS |
| **UI-03** (lógica) `hrefAtivo` casa exato / sub-rota / mais longo / nada / **fronteira do separador** | `/avaliacoes/novo`→`/avaliacoes`; `/usuarios/novo` vence `/usuarios`; `/pre-cursos-antigos` → `null` | `navegacao.test.ts:115,119,123,127,131,135` + **novo** `:138` — `expect(hrefAtivo("/pre-cursos-antigos", itens)).toBeNull()`; `:139` `("/painelx")`; `:140` `("/usuarios-inativos")` | ✅ PASS — **M2 agora morre** |
| **UI-04** "Sair" → `POST /api/auth/logout` com `x-csrf-token`, e em sucesso navega para `/login` | URL final `/login` **e** cookie anterior deixa de autenticar | `e2e/…:404` — `await expect(page).toHaveURL(/\/login$/)`; `:411` — `await expect(pageAntiga).toHaveURL(/\/login$/)` (cookie salvo em `:399-401`) | ✅ PASS — header CSRF provado indiretamente por E1 na iteração 1 (a rota real valida CSRF em `src/app/api/auth/logout/route.ts:16-18`) |
| **UI-05** logout rejeitado por **CSRF (403)** → permanece na página + mensagem | segue em `/painel`, mensagem visível | `e2e/…:427` — `await expect(page.getByTestId("erro-sair")).toBeVisible()`; `:428` — `await expect(page).toHaveURL(/\/painel$/)` | ✅ PASS |
| **UI-05** logout que **falha por rede** → permanece na página + mensagem | mesma mensagem do 403 | `e2e/…:438` — `await page.route("**/api/auth/logout", (rota) => rota.abort())`; `:442` — `await expect(page.getByTestId("erro-sair")).toBeVisible()`; `:443` — `await expect(page).toHaveURL(/\/painel$/)` | ✅ PASS — ramo `catch` de `BotaoSair.tsx:38-40` coberto; mutante N-A2 (esvaziar o `catch`) morre em `:442` |
| **UI-05** o **401** é exceção deliberada, tratado como sucesso | navega para `/login` | `e2e/…:452-454` (rota fulfilled com 401) + `:458` — `await expect(page).toHaveURL(/\/login$/)` | ✅ PASS — texto do AC agora coincide com a asserção |
| **UI-06** conteúdo dentro de um contêiner **único** | exatamente um `<main>` por tela protegida | `e2e/…:146` — `await expect(page.locator("main")).toHaveCount(1)` em `/painel`; `:149` idem em `/avaliacoes` | ⚠️ PASS parcial — 2 das 11 telas |
| **UI-06** contêiner **centralizado e de largura máxima fixa** | `mx-auto` + `max-w-5xl` efetivos | `e2e/…:164` — `expect(medidas.maxWidth).not.toBe("none")`; `:166` — `expect(Math.abs(medidas.folgaEsquerda - medidas.folgaDireita)).toBeLessThanOrEqual(1)`; `:167` — `expect(medidas.folgaEsquerda).toBeGreaterThan(0)` | ✅ PASS — **E7 agora morre** |
| **UI-06** **mesmo espaçamento vertical em todas** as 11 telas | `py-8` idêntico nas 11 | `e2e/…:165` — `expect(medidas.paddingTop).not.toBe("0px")`, medido **numa rota só** (`/avaliacoes`) | ❌ GAP — **N1 sobreviveu**: dar a `/pre-cursos` um `<main className="py-2">` próprio (2 `<main>` aninhados e espaçamento diferente) mantém os 22 testes verdes. Também: `not.toBe("0px")` não fixa valor — `py-8`→`py-2` passaria |
| **UI-07** <640px sem scroll horizontal | `scrollWidth <= clientWidth` no elemento que pode estourar, a 375px | `e2e/…:184-188` — `expect(medidas.scrollWidth).toBeLessThanOrEqual(medidas.clientWidth)` medido no **cabeçalho**; `:192-195` — `expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(larguraViewport)` por link do menu | ✅ PASS — **E8 (versão forte) agora morre** |
| **UI-07** cabeçalho e navegação **legíveis** a <640px | header **e** nav visíveis | `e2e/…:178` — `await expect(cabecalho).toBeVisible()`; `:179` — `await expect(page.getByTestId("navegacao-perfil")).toBeVisible()` | ✅ PASS — as duas metades agora afirmadas (L-014) |
| **UI-07** **sem depender de JavaScript** para revelar a navegação | nav presente com JS desabilitado | `e2e/…:217` — `browser.newContext({ javaScriptEnabled: false })`; `:224-230` — `await expect(links).toHaveText(["Painel","Novo usuário","Pré-cursos","Pós-cursos","Avaliações"])` | ✅ PASS — mutante N-A1 (nav só após `useEffect`) morre em `:224` |
| **UI-07** nome longo trunca com reticências (edge case) | overflow real + `text-overflow: ellipsis` | `e2e/…:210` — `expect(medidas.scrollWidth).toBeGreaterThan(medidas.clientWidth)`; `:211` — `expect(medidas.textOverflow).toBe("ellipsis")` (fixture `NOME_LONGO`, 70 caracteres, `:66-67`) | ✅ PASS — **E9 agora morre** |
| **UI-20** `--font-sans` aponta para a variável real | `font-family` do `body` contém `Geist` e não é serifada | `e2e/…:29` — `expect(fontFamily).toContain("Geist")`; `:30` — `expect(fontFamily).not.toMatch(/Times\|^serif$/i)` | ✅ PASS |
| **UI-20** `--font-mono` aponta para `--font-geist-mono` | variável resolvida | **nenhuma** — `globals.css:53` declara, nenhum teste observa o mono | ⚠️ Meio conjunto não afirmado — consumidor é UI-11, `Pending`, fora do recorte |
| **UI-21** reset deixa de anular as utilidades de espaçamento | `padding-left` do `CardContent` ≠ `0px` | `e2e/…:49` — `expect(paddingLeft).not.toBe("0px")` (alvo: `px-(--card-spacing)` em `src/components/ui/card.tsx:76`) | ✅ PASS |

**Status**: ❌ 2 lacunas com mutante sobrevivente (UI-01 contenção, UI-06 breadth/espaçamento) · 1 spec-precision gap remanescente e fora do recorte (`--font-mono`) · o spec-precision gap do 401 está **resolvido**.

---

## Discrimination Sensor

**Isolamento**: cópia integral do projeto em `C:\Users\lucas\Desktop\Projetos\SPMA-verify2` via `robocopy /MIR` (fallback documentado em `validate.md`, escolhido em vez de `git worktree` porque o Turbopack recusa a junção `node_modules` de um worktree — o defeito que invalidou duas execuções na iteração 1). **Nunca `git stash`.** Baseline `git status --porcelain` da árvore real **vazio** antes e depois; HEAD intacto em `ed7c892`; os 5 arquivos mutados conferidos byte a byte contra a árvore real (`diff -q`) antes do descarte; scratch removido ao final.

**Baseline verde no scratch antes de qualquer mutação**: `npx vitest run src/lib/ui/navegacao.test.ts` → **25 passed**; `npx playwright test e2e/identidade-visual.spec.ts` → **22 passed (2.1 min)**.

### Re-injeção dos 4 sobreviventes da iteração 1

| # | File:line | Mutação | Morto? | Teste que matou (asserção) |
| --- | --- | --- | --- | --- |
| **M2** | `src/lib/ui/navegacao.ts:81` | `pathname.startsWith(\`${href}/\`)` → `pathname.startsWith(\`${href}\`)` | ✅ **Killed** | `src/lib/ui/navegacao.test.ts:137` *"rota irma que so compartilha o prefixo, sem a barra, nao casa"* — falhou em `:138`, `AssertionError: expected '/pre-cursos' to be null` (1 failed / 24 passed) |
| **E7** | `src/components/layout/CascaProtegida.tsx:38` | `<main>` perde `mx-auto` e `max-w-5xl` | ✅ **Killed** | `e2e/identidade-visual.spec.ts:140` *"UI-06: o conteudo fica num `<main>` unico, centralizado e de largura maxima"* — falhou em `:164`, `expect(received).not.toBe("none")` (1 failed / 21 passed) |
| **E8** | `CascaProtegida.tsx:27` **+** `NavegacaoPerfil.tsx:22` | **os dois** perdem `flex-wrap` (o mutante fraco da iteração 1, só no `<header>`, não estoura nada porque `NavegacaoPerfil` tem `flex-wrap` próprio) | ✅ **Killed** | `e2e/…:170` *"UI-07: a 375px o cabeçalho continua visível e não há scroll horizontal"* — falhou em `:188`, `Expected: <= 375 / Received: 569` (1 failed / 21 passed) |
| **E9** | `CascaProtegida.tsx:33` | nome perde `truncate` e `max-w-64` | ✅ **Killed** | `e2e/…:198` *"nome longo trunca com reticencias, sem quebrar o cabecalho"* — falhou em `:210`, `expect(received).toBeGreaterThan(expected)` (1 failed / 21 passed) |

**Confirmação sobre o E8.** O aviso do orquestrador procede e foi reproduzido: mutar **só** o `<header>` não produz overflow. O mutante válido remove o `flex-wrap` **nos dois** contêineres; aí o cabeçalho mede `scrollWidth = 569px` numa viewport de 375px e o teste falha. É esse mutante forte que está registrado acima.

### Mutantes novos — ramos acrescentados por `0dbbbb1` (confirmam que as asserções novas discriminam)

| # | File:line | Mutação | Morto? | Teste que matou |
| --- | --- | --- | --- | --- |
| N-A1 | `NavegacaoPerfil.tsx:15` | nav só renderiza após montar (`useState` + `useEffect`, `if (!montado) return null`) — a regressão "drawer revelado por JS" | ✅ **Killed** | `e2e/…:214` *"UI-07: a navegacao existe sem depender de JavaScript"* — falhou em `:224` (`toHaveText` recebeu 1 elemento em vez de 7) |
| N-A2 | `BotaoSair.tsx:38-40` | `catch` deixa de chamar `setFalhou(true)` | ✅ **Killed** | `e2e/…:431` *"UI-05: falha de rede no logout mantem a pagina e exibe a falha"* — falhou em `:442` (`erro-sair` não encontrado) |

### Mutantes novos — sondagem de lacuna (iteração 2)

| # | File:line | Mutação | Morto? | Consequência |
| --- | --- | --- | --- | --- |
| **N1** | `src/app/(protegido)/pre-cursos/page.tsx:37-38` | a página recupera `<main className="py-2">` próprio (2 `<main>` aninhados na rota; espaçamento vertical diferente do resto) | ❌ **SURVIVED** (22/22 passaram, 59.3s) | UI-06 ("contêiner **único**", "mesmo espaçamento vertical **em todas elas**") só é observado em `/painel` e `/avaliacoes`; **9 das 11 telas protegidas não têm nenhuma asserção** — e é exatamente essa a regressão que T4 desfez ao remover o `<main>` das 11 páginas |
| **N2** | `CascaProtegida.tsx:31,35` | `NavegacaoPerfil` e `BotaoSair` movidos para **fora** do `<header>`, num `<div>` irmão | ❌ **SURVIVED** (22/22 passaram, 59.3s) | UI-01 exige o cabeçalho **com** a navegação e o botão "Sair"; os localizadores são de documento (`getByTestId("navegacao-perfil")`, `getByRole("button", { name: "Sair" })`), nunca escopados em `casca-cabecalho`. É a "Nota 1" da iteração 1, agora com prova empírica |

**Sensor depth**: expandido (8 mutações nesta iteração; 15 na iteração 1)
**Resultado desta iteração**: **6 mortos, 2 sobreviventes** — ❌ FAIL
**Acumulado da feature**: 17 mortos / 19 injetados

---

## Edge Cases

- [x] Perfil com um único módulo (AL) — `e2e/…:296` `await expect(linksDoMenu(page)).toHaveText(["Painel", "Minha avaliação"])`
- [x] Sub-rota marca a rota-pai; nenhum item quando não há pai; **irmã que só compartilha o prefixo não casa** — `navegacao.test.ts:119,123,131,138-140` + `e2e/…:337-340`
- [x] `usuario.nome` longo trunca com reticências — `e2e/…:210-211` (fixture de 70 caracteres, `:66-67`) — **E9 morto**
- [x] Clique duplo → 401 tratado como sucesso — `e2e/…:458` `await expect(page).toHaveURL(/\/login$/)`
- [x] `(onboarding)` sem cabeçalho — `e2e/…:241` e `:248` `await expect(…getByTestId("casca-cabecalho")).toHaveCount(0)`

---

## Gate Check

- **Comando (Full + Build, ordem de `tasks.md:57-63`)**: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Onde**: executado na cópia isolada, pristina (idêntica a `ed7c892`), para não tocar a árvore real

| Gate | Resultado |
| --- | --- |
| `npm run lint` | ✅ **0 erros**, 34 warnings (todos pré-existentes: `_omitido`/`_a`/`_b`/`_c`) |
| `npm run build` | ✅ passa (`Compiled successfully in 7.0s`) |
| `npm run typecheck` | ✅ limpo |
| `npm run test:unit` | ✅ **486 passed** / 25 arquivos |
| `npm run test:integration` | ✅ **27 passed** / 6 arquivos |
| `npm run test:e2e` | ✅ **224 passed** (20.3 min), 0 falhas, 0 skips, 0 flaky |

- **Contagem antes da feature** (HEAD `56ec10e`): 461 unit / 27 integration / 202 e2e
- **Contagem na iteração 1** (`9121be7`): 485 / 27 / 221
- **Contagem agora** (`ed7c892`): **486 / 27 / 224** — delta acumulado **+25 unit, +22 e2e** sobre `56ec10e`; delta desta iteração **+1 unit, +3 e2e**
- **Integridade dos testes**: `git diff --name-status 56ec10e..ed7c892` traz **apenas `A`** para `e2e/identidade-visual.spec.ts` e `src/lib/ui/navegacao.test.ts`; nenhum arquivo de teste pré-existente foi modificado ou removido. `0dbbbb1` **só acrescenta** asserções — nenhuma foi enfraquecida (as duas asserções substituídas, `documentElement.scrollWidth` em UI-07 e a contagem isolada de `<main>` em UI-06, deram lugar a asserções estritamente mais fortes, comprovadas por E7 e E8 mortos).
- **Skipped**: nenhum
- **Failures**: nenhuma. O flake conhecido de `e2e/pre-cursos-formulario.spec.ts:304` (radio do Base UI) **não** ocorreu nesta execução

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ — `0dbbbb1` não toca produção |
| Mudanças cirúrgicas | ✅ — 3 arquivos, 2 de teste + 1 linha de spec |
| Sem scope creep | ✅ |
| Segue os padrões existentes | ✅ — mesmas helpers (`logar`, `upsertUsuario`, `deleteUsuarios`), mesmo estilo de comentário justificando a asserção |
| Spec-anchored outcome check | ⚠️ — UI-06 mede `paddingTop != "0px"` em vez do valor que a spec chama de "mesmo espaçamento"; UI-01 não afirma contenção |
| Per-layer Coverage Expectation | ⚠️ — módulo puro agora tem todos os ramos (M2 fechado); a camada e2e cobre 2 de 11 telas para UI-06 |
| Todo teste mapeia para um requisito (sem teste órfão) | ✅ — 22 e2e + 25 unit, todos rotulados por UI-NN ou edge case da spec |
| Guidelines do projeto seguidos | ✅ — `AGENTS.md`, `vitest.config.ts`, `playwright.config.ts` |

---

## Fix Plans

### Fix A — UI-06 é verificado em 2 das 11 telas (N1 sobreviveu)
- **Severidade**: Major
- **Root cause**: `e2e/…:146,149` conta `<main>` em `/painel` e `/avaliacoes`; `:153-167` mede o contêiner numa rota só. As outras 9 telas protegidas (`/pre-cursos`, `/pre-cursos/novo`, `/pos-cursos`, `/pos-cursos/novo`, `/usuarios/novo`, e as rotas dinâmicas) não têm nenhuma asserção — a regressão que T4 desfez (cada página com seu próprio `<main>`) volta sem ser notada. Além disso `not.toBe("0px")` não fixa valor, então `py-8`→`py-2` também passa.
- **Fix**: iterar sobre a lista de rotas estáticas do grupo `(protegido)` num único teste, afirmando por rota `toHaveCount(1)` para `main` **e** o mesmo `paddingTop`/`paddingBottom` computado (comparar contra o valor da primeira rota, ou contra `"32px"`). Re-injetar N1 e confirmar que morre.

### Fix B — UI-01 não afirma que nav e "Sair" estão **dentro** do cabeçalho (N2 sobreviveu)
- **Severidade**: Minor
- **Root cause**: os localizadores são de documento. `e2e/…:224` usa `getByTestId("navegacao-perfil")` e `:403` usa `page.getByRole("button", { name: "Sair" })`; nenhum é escopado em `getByTestId("casca-cabecalho")`.
- **Fix**: escopar — `const cabecalho = page.getByTestId("casca-cabecalho")` e afirmar `await expect(cabecalho.getByTestId("navegacao-perfil")).toHaveCount(1)` e `await expect(cabecalho.getByRole("button", { name: "Sair" })).toHaveCount(1)` em ao menos um teste de UI-01. Re-injetar N2 e confirmar que morre.

**Ambos os fixes são test-side. Nenhuma mudança de produção é necessária — o produto está correto nos dois casos.**

---

## Requirement Traceability Update

| Requirement | Status atual na spec | Status apurado (iteração 2) |
| --- | --- | --- |
| UI-01 | Verified | ❌ Needs Fix (N2 — contenção no `<header>` não afirmada) |
| UI-02 | Verified | ✅ Verified |
| UI-03 | Verified | ✅ Verified (M2 fechado) |
| UI-04 | Verified | ✅ Verified |
| UI-05 | Verified | ✅ Verified (403, rede e 401 cobertos; texto do AC reconciliado) |
| UI-06 | Verified | ❌ Needs Fix (N1 — 2 de 11 telas; espaçamento não fixado) |
| UI-07 | Verified | ✅ Verified (E8 forte morto; "sem JS" coberto e discriminante) |
| UI-20 | Verified | ✅ Verified (`--font-mono` sem observação — consumidor `Pending`) |
| UI-21 | Verified | ✅ Verified |
| UI-08…UI-19, UI-22 | Pending | Fora do recorte — não avaliados |

---

## O que continua NÃO verificado

- **UI-06 nas 9 telas protegidas restantes** (contêiner único e espaçamento) — Fix A.
- **UI-01: contenção estrutural** de nav e "Sair" dentro do `<header>` — Fix B.
- **UI-20 `--font-mono`**: declarada em `globals.css:53`, sem consumidor no recorte (UI-11 é `Pending`). Fora de escopo, registrado.
- **UI-08…UI-19 e UI-22**: `Pending` por decisão de recorte.
- **Aparência**: nenhum snapshot visual foi tirado; toda a verificação é de valor computado (`getComputedStyle`, `getBoundingClientRect`) e de estrutura.

---

## Summary

**Overall**: ⚠️ Issues — a correção da iteração 1 funcionou: os 4 mutantes que sobreviveram morreram, reproduzidos de forma independente, e os ramos novos (rede, JS desligado, truncamento, contêiner) discriminam de verdade. Restam **duas lacunas de largura**, ambas já sinalizadas na iteração 1 e não fechadas: UI-06 verificado em 2 de 11 telas, e a contenção de UI-01 nunca afirmada.

**Spec-anchored check**: 14 ACs/meios-ACs plenamente casados · 2 com mutante sobrevivente (UI-01, UI-06) · 1 spec-precision gap remanescente e fora do recorte (`--font-mono`) · o gap do 401 **resolvido** por reescrita julgada legítima
**Sensor (iteração 2)**: 8 mutações injetadas — **6 mortas, 2 sobreviventes** (N1, N2). Acumulado: 17/19.
**Gate**: 486 unit + 27 integration + 224 e2e, 0 falhas; lint 0 erros; build e typecheck limpos; nenhum arquivo de teste pré-existente alterado

**O que funciona**: tudo o que a iteração 1 já provava, mais — fronteira do separador em `hrefAtivo`; contêiner centralizado com largura máxima efetiva; cabeçalho que não estoura a 375px (medido no elemento que pode estourar); nome longo truncado com reticências; navegação presente sem JavaScript; falha de rede no logout mantendo a página com mensagem.

**Problemas** (ranqueados): (1) **N1** — UI-06 verificado em 2 de 11 telas, e o espaçamento não é fixado em valor; (2) **N2** — UI-01 não afirma que a navegação e o "Sair" vivem dentro do `<header>`.

**Next steps**: aplicar Fix A e Fix B (ambos test-side, ~10 linhas em `e2e/identidade-visual.spec.ts`) e re-despachar o Verifier. **Iteração 2 de no máximo 3** — resta uma.
