# identidade-visual Validation

**Date**: 2026-09-01
**Spec**: `.specs/features/identidade-visual/spec.md`
**Diff range**: `56ec10e..08c7816` (12 commits — os 10 das iterações 1-2 mais `26d23ce` (correções de N1/N2/N3) e `08c7816` (relatório da iteração 2))
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero
**Iteração**: 3 de 3 (última do limite)
**Result**: ✅ **PASS** — os 2 mutantes reportados na iteração 2 (N1, N2) e o achado próprio do implementador (N3) foram reproduzidos de forma independente e **todos morrem**; 4 sondagens novas da mesma classe de falha nos ACs restantes: **3 morrem, 1 sobrevive** e é classificado como **observação**, não bloqueador (justificativa abaixo)

> **Recorte verificado.** Somente **UI-01…UI-07, UI-20 e UI-21**. UI-08…UI-19 e UI-22 seguem `Pending` por decisão explícita do usuário e **não** são tratados como lacuna.

---

## O que mudou desde a iteração 2

`26d23ce` — **test-side puro**: `git diff --name-status ed7c892..08c7816` traz `M e2e/identidade-visual.spec.ts` (+85/-15) e, em `08c7816`, só documentação (`validation.md`, `LESSONS.md`, `lessons.json`). Nenhuma linha de produção alterada.

Três mudanças de asserção, todas da mesma classe ("afirmar o conjunto, não uma instância"; "provar onde o elemento está, não só que existe"):

1. **UI-06** ganhou um teste que percorre **8 rotas estáticas** exigindo `main` único **e** `paddingTop === "32px"` (valor fixo, não `!= "0px"`) — `e2e/identidade-visual.spec.ts:173-204`.
2. **UI-01** ganhou as duas asserções de contenção — `:130-131` — e três helpers escopados no cabeçalho: `menuDaCasca` (`:301`), `linksDoMenu` (`:304`), `botaoSair` (`:306`). Os 15 pontos que antes usavam localizador de documento passaram a usá-los.
3. **UI-03** ganhou um teste que percorre **8 rotas** exigindo que o item marcado seja o **daquela** rota — `:387-411`. Achado do implementador, não do Verifier.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1–T8 | ✅ Done | Inalterados desde a iteração 1; nenhum arquivo de produção tocado por `0dbbbb1` nem por `26d23ce` |
| Fix A (iteração 2 → N1) | ✅ Done | `e2e/…:173-204` — mutante N1 reproduzido e **morto** |
| Fix B (iteração 2 → N2) | ✅ Done | `e2e/…:130-131` + helpers `:301-307` — mutante N2 reproduzido e **morto** |
| Fix C (achado próprio → N3) | ✅ Done | `e2e/…:387-411` — mutante N3 reproduzido e **morto** |

---

## Spec-Anchored Acceptance Criteria

| Critério (WHEN X THEN Y) | Resultado definido pela spec | `file:line` + expressão da asserção | Resultado |
| --- | --- | --- | --- |
| **UI-01** cabeçalho no topo com a marca "SPMA" | texto "SPMA" no cabeçalho de toda rota protegida | `e2e/identidade-visual.spec.ts:114` — `await expect(page.getByTestId("casca-cabecalho")).toContainText("SPMA")`; `:117` idem em `/avaliacoes` | ✅ PASS |
| **UI-01** cabeçalho com nome + sigla do perfil | `usuario.nome` e a sigla (`GT`) | `e2e/…:127` — `await expect(cabecalho).toContainText(NOME_CASCA)`; `:128` — `await expect(cabecalho).toContainText("GT")` (escopado em `casca-cabecalho`, `:126`) | ✅ PASS |
| **UI-01** cabeçalho **com** a navegação do perfil e o botão "Sair" | nav e botão **dentro** do `<header>` | `e2e/…:130` — `await expect(cabecalho.getByTestId("navegacao-perfil")).toHaveCount(1)`; `:131` — `await expect(cabecalho.getByRole("button", { name: "Sair" })).toHaveCount(1)` | ✅ PASS — **N2 morre** (15 testes falham) |
| **UI-02** itens vêm de fonte única; perfil nunca recebe link fora da sua lista | conjunto exato de `href` por perfil (tabela do design), nos 6 perfis | `src/lib/ui/navegacao.test.ts:57` — `expect(hrefsDe(tipo)).toEqual(HREFS_ESPERADOS[tipo])` (loop nos 6 perfis); `:63-64`, `:68-70` (`not.toContain`); `:100` — `expect(modulosDoPerfil(tipo)).toEqual(MODULOS_ESPERADOS[tipo])`; `:92` — nenhum href aponta para rota inexistente; renderizado: `e2e/…:325`, `:340`, `:348-349`, `:357`, `:359` | ✅ PASS — **sondagem P1 morre** (3 testes) |
| **UI-02** fonte **compartilhada com o painel** | painel e casca leem a mesma tabela | `src/app/(protegido)/painel/page.tsx:7,12` — `import { modulosDoPerfil } from "@/lib/ui/navegacao"`; `src/components/layout/CascaProtegida.tsx:11,31` — `navegacaoDoPerfil(usuario.tipo)`; contrato dos rótulos preso por `navegacao.test.ts:100` | ✅ PASS (estrutural + contrato de rótulos) |
| **UI-03** rota atual → `aria-current="page"`, **em toda rota que casa** | atributo literal no item daquela rota, e só nele | `e2e/…:408` — `await expect(marcados).toHaveCount(1)`; `:409` — `await expect(marcados).toHaveText(rotulo)`, ambos dentro do loop das 8 rotas (`:394-403`); reforço em `:369-373` e `:381` | ✅ PASS — **N3 morre** (só neste teste: os dois testes antigos de UI-03 não pegam) |
| **UI-03** (lógica) `hrefAtivo` casa exato / sub-rota / mais longo / nada / fronteira do separador | `/avaliacoes/novo`→`/avaliacoes`; `/usuarios/novo` vence `/usuarios`; `/pre-cursos-antigos` → `null` | `navegacao.test.ts:115,119,123,127,131` + `:138-140` — `expect(hrefAtivo("/pre-cursos-antigos", itens)).toBeNull()` etc.; `:144` lista vazia | ✅ PASS |
| **UI-04** "Sair" → `POST /api/auth/logout` com `x-csrf-token`, e em sucesso navega para `/login` | URL final `/login` **e** o cookie anterior deixa de autenticar; header CSRF presente | `e2e/…:474` — `await expect(page).toHaveURL(/\/login$/)`; `:481` — `await expect(pageAntiga).toHaveURL(/\/login$/)` (cookie salvo em `:469-471`) | ✅ PASS — **sondagem P2 morre**: remover `headers: { ...headerCSRF() }` faz a rota real responder 403 e o teste falha em `:474` (`Received string: "http://localhost:3000/painel"`). O header é afirmado de fato, ainda que pela rota real (`src/app/api/auth/logout/route.ts:16-18`) |
| **UI-05** logout rejeitado por **CSRF (403)** → permanece na página + mensagem | segue em `/painel`, mensagem visível | `e2e/…:497` — `await expect(page.getByTestId("erro-sair")).toBeVisible()`; `:498` — `await expect(page).toHaveURL(/\/painel$/)` | ✅ PASS |
| **UI-05** logout que **falha por rede** → permanece na página + mensagem | mesma mensagem do 403 | `e2e/…:508` — `await page.route("**/api/auth/logout", (rota) => rota.abort())`; `:512` — `toBeVisible()`; `:513` — `toHaveURL(/\/painel$/)` | ✅ PASS (ramo `catch` de `BotaoSair.tsx:38-40`) |
| **UI-05** o **401** é exceção deliberada, tratado como sucesso | navega para `/login` | `e2e/…:522-524` (rota fulfilled com 401) + `:528` — `await expect(page).toHaveURL(/\/login$/)` | ✅ PASS |
| **UI-06** conteúdo dentro de um contêiner **único** | exatamente um `<main>` por tela protegida | `e2e/…:195` — `await expect(page.locator("main")).toHaveCount(1)` dentro do loop das **8 rotas estáticas** (`:181-190`); reforço em `:149` e `:152` | ✅ PASS nas 8 rotas estáticas — **N1 morre** em `:195` (`Expected: 1 / Received: 2`). ⚠️ 3 rotas dinâmicas fora do loop (ver Observação 1) |
| **UI-06** contêiner **centralizado e de largura máxima fixa** | `mx-auto` + `max-w-5xl` efetivos | `e2e/…:167` — `expect(medidas.maxWidth).not.toBe("none")`; `:169` — `expect(Math.abs(medidas.folgaEsquerda - medidas.folgaDireita)).toBeLessThanOrEqual(1)`; `:170` — `expect(medidas.folgaEsquerda).toBeGreaterThan(0)` | ✅ PASS |
| **UI-06** **mesmo espaçamento vertical em todas** elas | `py-8` = 32px idêntico | `e2e/…:203` — `expect(espacamentos).toEqual(rotas.map(() => "32px"))` (valor fixo nas 8 rotas, não `!= "0px"`) | ✅ PASS — a metade que a iteração 2 apontou como não fixada agora é literal |
| **UI-07** <640px sem scroll horizontal | `scrollWidth <= clientWidth` no elemento que pode estourar, a 375px | `e2e/…:224` — `expect(medidas.scrollWidth).toBeLessThanOrEqual(medidas.clientWidth)` medido no cabeçalho; `:230` — `expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(larguraViewport)` por link do menu | ✅ PASS |
| **UI-07** cabeçalho e navegação **legíveis** a <640px | header **e** nav visíveis, a nav **dentro** do header | `e2e/…:214` — `await expect(cabecalho).toBeVisible()`; `:215` — `await expect(menuDaCasca(page)).toBeVisible()` (escopado desde `26d23ce`) | ✅ PASS |
| **UI-07** **sem depender de JavaScript** para revelar a navegação | nav presente com JS desabilitado | `e2e/…:253` — `browser.newContext({ javaScriptEnabled: false })`; `:260-266` — `await expect(links).toHaveText(["Painel","Novo usuário","Pré-cursos","Pós-cursos","Avaliações"])`, com `links = linksDoMenu(pagina)` escopado no cabeçalho | ✅ PASS |
| **UI-07** nome longo trunca com reticências (edge case) | overflow real + `text-overflow: ellipsis` | `e2e/…:246` — `expect(medidas.scrollWidth).toBeGreaterThan(medidas.clientWidth)`; `:247` — `expect(medidas.textOverflow).toBe("ellipsis")` (fixture `NOME_LONGO`, 70 caracteres, `:62-63`) | ✅ PASS |
| **UI-20** `--font-sans` aponta para a variável real | `font-family` do `body` contém `Geist` e não é serifada | `e2e/…:29` — `expect(fontFamily).toContain("Geist")`; `:30` — `expect(fontFamily).not.toMatch(/Times|^serif$/i)` | ✅ PASS |
| **UI-20** `--font-mono` aponta para `--font-geist-mono` | variável resolvida | **nenhuma** — `src/app/globals.css:53` declara, nenhum teste observa o mono | ⚠️ Spec-precision gap — o único consumidor previsto é UI-11, `Pending`, fora do recorte (mantido da iteração 1) |
| **UI-21** reset deixa de anular as utilidades de espaçamento (`p-*`, `gap-*`, `space-y-*`) | utilidades voltam a valer | `e2e/…:49` — `expect(paddingLeft).not.toBe("0px")` (metade `padding`, alvo `px-(--card-spacing)` em `src/components/ui/card.tsx:76`); metade **margin** afirmada indiretamente por `e2e/…:169` (simetria de `mx-auto`) | ✅ PASS — **sondagem P3 morre** (ver abaixo) |

**Status**: ✅ 20 das 21 linhas do quadro cobertas com evidência (`file:line` + expressão) · 1 spec-precision gap remanescente e fora do recorte (`--font-mono`) · 1 observação de largura (UI-06 nas 3 rotas dinâmicas)

---

## Item 2 — busca da mesma classe de falha nos ACs que sobraram

O padrão para o qual as três iterações convergiram: *asserção que verifica uma instância do que a spec exige do conjunto*, e *localizador que não prova onde o elemento está*. Apliquei a lente a **UI-02, UI-04, UI-05, UI-07, UI-20 e UI-21**. Resultado por AC, com a sondagem que usei para decidir:

| AC | Hipótese de lacuna testada | Achado |
| --- | --- | --- |
| **UI-02** | O conjunto são os **6 perfis**; o e2e só renderiza 3 (GT/AL/VT). E o análogo de N3: a casca poderia ignorar `usuario.tipo` e acertar por acidente. | **Não há lacuna.** O conjunto está fechado na camada pura — `navegacao.test.ts:57` percorre `Object.values(TipoUsuario)` com `toEqual`. A fiação foi sondada (**P1**: `navegacaoDoPerfil("GT" as TipoUsuario)` fixo) e **morre** em 3 testes. |
| **UI-04** | Regra payload/conjunção: o header `x-csrf-token` é **nomeado** pela spec e **nenhum** teste o inspeciona. | **Não há lacuna.** Sondagem **P2** (remover `headers: { ...headerCSRF() }`) **morre** em `:474` — o teste passa pela rota real, que rejeita com 403. A prova é indireta, mas empírica. |
| **UI-05** | Os 3 ramos (403 / rede / 401) já tinham teste na iteração 2; a lente aqui seria "a mensagem é afirmada por valor?". | **Não há lacuna no recorte.** Os 3 ramos de `BotaoSair.tsx:31-40` estão cobertos e mortos (403 e rede em `:497`/`:512`, 401 em `:528`). A spec não fixa o texto da mensagem — só "uma mensagem de falha" — então `toBeVisible()` sobre `erro-sair` é o outcome que a spec define, não um enfraquecimento. |
| **UI-07** | Mesmo argumento de N1: a medição a 375px é feita numa rota só (`/painel`, perfil GT). | **Não há lacuna.** Aqui a instância **é** o conjunto, e por um motivo estrutural, não por sorte: o `<header>` vem de `CascaProtegida.tsx:26-37` e nenhuma página injeta conteúdo nele (ao contrário do `<main>`, que recebe `children`). O único eixo de variação é o tamanho da lista de links, e GT é o pior caso (5 itens, o máximo da tabela do design). |
| **UI-20** | `--font-sans` é medido só em `/login`. | **Não há lacuna na metade coberta**: `html { @apply font-sans }` (`globals.css:170-172`) é declaração única e global; uma rota basta. A metade `--font-mono` continua sem observador — gap já registrado, consumidor `Pending`. |
| **UI-21** | **A lente acusou aqui.** O AC nomeia `p-*`, `gap-*` **e** `space-y-*`, mas `:49` mede só `padding-left`. Um reset parcial (`padding` dentro de `@layer base`, `margin: 0` fora) quebraria `mx-auto`/`space-y-*` e passaria despercebido. | **Hipótese refutada empiricamente.** Sondagem **P3** (`margin: 0` movido para fora de `@layer base`) **morre** em `e2e/…:169` — a asserção de simetria de UI-06 depende de `mx-auto`, que é utilidade de margem. A metade `margin` está coberta, por via cruzada. |

**Conclusão do item 2:** aplicada a lente aos 6 ACs restantes, **não encontrei nenhuma lacuna nova de asserção**. A única hipótese que parecia promissora (UI-21, metade `margin`) foi testada e **refutada**. Registro isso explicitamente como resultado — "não achei", sustentado pelas 4 sondagens acima.

---

## Discrimination Sensor

**Isolamento**: cópia integral do projeto em `C:\Users\lucas\Desktop\Projetos\SPMA-verify3` via `robocopy /MIR` (46 819 arquivos, 841 MB; fallback documentado em `validate.md`, escolhido em vez de `git worktree` porque o Turbopack recusa a junção `node_modules` de um worktree). **Nunca `git stash`.** Baseline `git status --porcelain` da árvore real **vazio** antes e depois; HEAD intacto em `08c7816`; os 7 arquivos mutados conferidos byte a byte contra a árvore real (`diff -q`) antes do descarte; nenhum `.verifier-orig` sobrou; scratch removido ao final.

**Baseline verde no scratch antes de qualquer mutação**: `npx playwright test e2e/identidade-visual.spec.ts` → **24 passed (2.1 min)**.

### Reprodução dos 3 defeitos corrigidos por `26d23ce`

| # | File:line | Mutação | Morto? | Teste que matou (asserção) |
| --- | --- | --- | --- | --- |
| **N1** | `src/app/(protegido)/pre-cursos/page.tsx:37-68` | a página recupera um `<main className="py-2">` próprio (2 `<main>` aninhados; espaçamento divergente) | ✅ **Killed** (1 failed / 23 passed, 1.4 min) | `e2e/identidade-visual.spec.ts:195` — `await expect(page.locator("main")).toHaveCount(1)` → `Expected: 1 / Received: 2`, no teste *"UI-06: toda rota estatica tem um `<main>` unico e o mesmo espacamento vertical"* (`:173`) |
| **N2** | `src/components/layout/CascaProtegida.tsx:31,35` | `NavegacaoPerfil` e `BotaoSair` movidos para **fora** do `<header>`, num `<div>` irmão (nome e sigla ficam no header) | ✅ **Killed** (15 failed / 9 passed, 6.9 min) | Primeiro e decisivo: `e2e/…:130` — `await expect(cabecalho.getByTestId("navegacao-perfil")).toHaveCount(1)` (teste `:120`). Em cascata, os helpers escopados derrubam outros 14: `:215`, `:260`, `:325`, `:340`, `:359`, `:369`, `:381`, `:408`, `:419`, `:436`, `:473`, `:495`, `:510`, `:526` |
| **N3** | `src/components/layout/NavegacaoPerfil.tsx:16` | `hrefAtivo(pathname, itens)` → `hrefAtivo("/avaliacoes", itens)` | ✅ **Killed** (1 failed / 23 passed, 1.3 min) | `e2e/…:409` — `await expect(marcados).toHaveText(rotulo)` → `Expected: "Painel" / Received: "Avaliações"`, no teste *"UI-03: em cada rota, o item marcado e o correspondente aquela rota"* (`:387`). **Só este teste pegou** — confirma que os dois testes antigos de UI-03 (`:362`, `:376`) eram cegos ao defeito, exatamente como o implementador afirmou |

### Sondagens novas do item 2

| # | AC | File:line | Mutação | Morto? | Teste que matou / consequência |
| --- | --- | --- | --- | --- | --- |
| **P1** | UI-02 | `CascaProtegida.tsx:31` | `navegacaoDoPerfil(usuario.tipo)` → `navegacaoDoPerfil("GT" as TipoUsuario)` (o análogo de N3 na fiação da casca) | ✅ **Killed** (3 failed / 21 passed) | `e2e/…:340` — `toHaveText(["Painel","Minha avaliação"])` recebeu 5 itens; `:348` — `Pré-cursos` `Expected: 0 / Received: 1`; `:357` — `Novo usuário` `Expected: 0 / Received: 1` |
| **P2** | UI-04 | `BotaoSair.tsx:23-26` | remove `headers: { ...headerCSRF() }` do `fetch` | ✅ **Killed** (1 failed / 23 passed) | `e2e/…:474` — `await expect(page).toHaveURL(/\/login$/)` → `Received string: "http://localhost:3000/painel"` (a rota real devolve 403 e o botão exibe `erro-sair`) |
| **P3** | UI-21 | `src/app/globals.css:28-34` | metade do reset volta a ficar fora de `@layer base` (`padding: 0` dentro, `* { margin: 0 }` fora) — quebra `mx-auto`, `m-*`, `space-y-*` | ✅ **Killed** (1 failed / 23 passed) | `e2e/…:169` — `expect(Math.abs(folgaEsquerda - folgaDireita)).toBeLessThanOrEqual(1)` → `Received: 256` |
| **P4** | UI-06 | `src/app/(protegido)/pre-cursos/[id]/page.tsx:35-44` | a página de detalhe (rota **dinâmica**) recupera um `<main className="py-2">` próprio | ❌ **SURVIVED** (24/24 passaram, 1.4 min) | O loop de UI-06 (`:181-190`) declara 8 rotas **estáticas**; as 3 dinâmicas ficam de fora. `grep -rn 'locator("main' e2e/` mostra que **nenhum outro spec** da suíte observa `<main>`, então nada na suíte poderia matá-lo. Classificado como **observação** — ver Observação 1 |

**Sensor depth**: expandido (7 mutações nesta iteração; 8 na iteração 2; 15 na iteração 1)
**Resultado desta iteração**: **6 mortos, 1 sobrevivente**
**Acumulado da feature**: **23 mortos / 26 injetados**

---

## Observações (não bloqueadores)

### Observação 1 — UI-06 não é verificado nas 3 rotas dinâmicas (P4 sobreviveu)

- **Severidade**: Minor · **Classificação**: observação, não bloqueador
- **Fato**: o loop de `e2e/…:181-190` cobre 8 das 11 telas protegidas. `/pre-cursos/[id]`, `/pos-cursos/[cdCurso]` e `/avaliacoes/[cpf]/[cdCurso]` ficam de fora, com o motivo declarado no próprio teste (`:180`: *"As 3 rotas dinamicas ficam de fora porque exigiriam fixture de curso"*).
- **Por que não é bloqueador** — três fatos independentes:
  1. **O critério está satisfeito hoje, verificado por inspeção**: `grep -rn "<main" "src/app/(protegido)/"` retorna **vazio** nas 11 `page.tsx`. Nenhuma tela declara contêiner próprio; o `<main>` único vem de `CascaProtegida.tsx:38`. O que falta é rede de regressão, não conformidade.
  2. **As 3 rotas descobertas são estruturalmente idênticas a rotas cobertas**: `/pre-cursos/[id]/page.tsx:35-44` devolve `<><PreCursoForm …/></>` — a mesma forma de `/pre-cursos/novo/page.tsx`, que **está** no loop. Não sobrou arquétipo de página sem representante coberto.
  3. **A diferença de escala em relação a N1 é qualitativa**: a iteração 2 falhou com 2 de 11 telas e um arquétipo inteiro (listagens) descoberto; hoje são 8 de 11, com todos os arquétipos representados.
- **Fecho, se o usuário quiser**: estender o array de `:181-190` com as 3 rotas dinâmicas exige criar um pré-curso, um pós-curso e uma matrícula no `beforeAll` (as helpers `upsertUsuario`/`deleteUsuarios` de `e2e/helpers/db.ts` não cobrem cursos). É test-side, ~30 linhas, nenhuma mudança de produção.

### Observação 2 — `--font-mono` continua sem observador

- **Severidade**: Cosmetic · Fora do recorte
- `globals.css:53` declara `--font-mono: var(--font-geist-mono)`. O consumidor previsto é UI-11 ("identificadores técnicos em fonte monoespaçada"), que está `Pending`. Metade de UI-20 fica afirmada e metade não; registrado desde a iteração 1 e mantido de propósito.

### Observação 3 — nenhuma verificação de aparência

- **Severidade**: Cosmetic
- Toda a verificação é de valor computado (`getComputedStyle`, `getBoundingClientRect`) e de estrutura. Nenhum snapshot visual foi tirado, em nenhuma das 3 iterações. É coerente com a Test Coverage Matrix de `tasks.md` (que pede `getComputedStyle`, "não inspeção visual"), mas fica dito.

---

## Edge Cases

- [x] Perfil com um único módulo (AL) — `e2e/…:340` `await expect(linksDoMenu(page)).toHaveText(["Painel", "Minha avaliação"])`
- [x] Sub-rota marca a rota-pai; nenhum item quando não há pai; irmã que só compartilha o prefixo não casa — `navegacao.test.ts:119,123,131,138-140` + `e2e/…:381` e `:398,:400,:402` (as 3 rotas-filhas dentro do loop de UI-03)
- [x] `usuario.nome` longo trunca com reticências — `e2e/…:246-247` (fixture de 70 caracteres, `:62-63`)
- [x] Clique duplo → 401 tratado como sucesso — `e2e/…:528` `await expect(page).toHaveURL(/\/login$/)`
- [x] `(onboarding)` sem cabeçalho — `e2e/…:277` e `:284` `await expect(…getByTestId("casca-cabecalho")).toHaveCount(0)`

---

## Gate Check

- **Comando (Full + Build, ordem de `tasks.md`)**: `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Onde**: executado na cópia isolada, pristina (idêntica a `08c7816`, conferida por `diff -q` nos 7 arquivos tocados pelo sensor), para não tocar a árvore real

> **Procedência desta tabela.** A execução do Verifier na cópia isolada **não
> concluiu** — o agente foi encerrado por watchdog enquanto aguardava o e2e.
> Os números abaixo foram medidos pelo **orquestrador (autor)** na árvore
> real, no HEAD `08c7816`, e não por verificação independente. É a única
> parte deste relatório com essa procedência; toda a evidência por AC e todo
> o sensor acima são do Verifier.

| Gate | Comando | Resultado |
| --- | --- | --- |
| Lint | `npm run lint` | 0 erros, 34 warnings pré-existentes |
| Build | `npm run build` | ✅ compila |
| Typecheck | `npm run typecheck` | ✅ limpo |
| Unit | `npm run test:unit` | **486 passed** (25 arquivos) |
| Integration | `npm run test:integration` | **27 passed** (6 arquivos) |
| E2E | `npm run test:e2e` | **226 passed** (19,3 min), 0 falhas, 0 skips |


- **Contagem antes da feature** (HEAD `56ec10e`): 461 unit / 27 integration / 202 e2e
- **Contagem na iteração 1** (`9121be7`): 485 / 27 / 221 · **iteração 2** (`ed7c892`): 486 / 27 / 224
- **Contagem agora** (`08c7816`): **486 / 27 / 226** — delta acumulado sobre `56ec10e`: **+25 unit, +24 e2e**; delta desta iteração: **+0 unit, +2 e2e**
- **Integridade dos testes**: `git diff --name-status ed7c892..08c7816` traz apenas `M e2e/identidade-visual.spec.ts` e os 3 arquivos de documentação. `26d23ce` é **+85/-15**: as 15 linhas removidas são **substituições de localizador de documento por localizador escopado** (`page.getByTestId("navegacao-perfil")` → `menuDaCasca(page)`), estritamente mais fortes — comprovado por N2 morto. Nenhuma asserção foi enfraquecida; nenhum arquivo de teste de outra feature foi tocado.
- **Skipped**: nenhum

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ — `26d23ce` não toca produção; 1 arquivo alterado |
| Mudanças cirúrgicas | ✅ — 3 helpers novos, 2 testes novos, 15 localizadores reescopados |
| Sem scope creep | ✅ — nada fora de UI-01…UI-07/UI-20/UI-21 |
| Segue os padrões existentes | ✅ — mesmas helpers (`logar`, `upsertUsuario`, `deleteUsuarios`), mesmo estilo de comentário justificando cada asserção |
| Spec-anchored outcome check | ✅ — o `paddingTop` deixou de ser `!= "0px"` e virou `"32px"` literal; a contenção de UI-01 virou `toHaveCount(1)` escopado; UI-03 virou "o item **daquela** rota" |
| Per-layer Coverage Expectation | ✅ com ressalva — módulo puro com todos os ramos; camada e2e cobre 8 de 11 telas para UI-06 (Observação 1) e os 6 perfis para UI-02 (3 renderizados + 6 na camada pura) |
| Todo teste mapeia para um requisito (sem teste órfão) | ✅ — 24 e2e + 25 unit, todos rotulados por UI-NN, REQ-SEC-12 ou edge case da spec |
| Guidelines do projeto seguidos | ✅ — `AGENTS.md`, `vitest.config.ts`, `playwright.config.ts` |

---

## Requirement Traceability Update

| Requirement | Status atual na spec | Status apurado (iteração 3) |
| --- | --- | --- |
| UI-01 | Verified | ✅ Verified (N2 morto — contenção afirmada) |
| UI-02 | Verified | ✅ Verified (P1 morto) |
| UI-03 | Verified | ✅ Verified (N3 morto) |
| UI-04 | Verified | ✅ Verified (P2 morto — header CSRF afirmado pela rota real) |
| UI-05 | Verified | ✅ Verified |
| UI-06 | Verified | ✅ Verified com observação (8 de 11 telas; P4 sobrevive nas 3 dinâmicas) |
| UI-07 | Verified | ✅ Verified |
| UI-20 | Verified | ✅ Verified (`--font-mono` sem observador — consumidor `Pending`) |
| UI-21 | Verified | ✅ Verified (P3 morto — metade `margin` coberta por via cruzada) |
| UI-08…UI-19, UI-22 | Pending | Fora do recorte por decisão do usuário — não avaliados |

Nenhuma alteração de status é necessária em `spec.md`.

---

## O que continua NÃO verificado

- **UI-06 nas 3 rotas dinâmicas** (`/pre-cursos/[id]`, `/pos-cursos/[cdCurso]`, `/avaliacoes/[cpf]/[cdCurso]`) — Observação 1. É o único mutante sobrevivente da feature inteira que segue aberto.
- **UI-20 `--font-mono`** — Observação 2.
- **Aparência** — Observação 3.
- **UI-08…UI-19 e UI-22** — `Pending` por decisão de recorte do usuário.

---

## Summary

**Overall**: ✅ Ready — com 1 observação registrada

**Spec-anchored check**: **20 de 21** linhas do quadro de ACs (ACs e meios-ACs do recorte) casadas com o outcome da spec, todas com `file:line` + expressão · 1 spec-precision gap fora do recorte (`--font-mono`) · 0 lacunas de asserção novas encontradas pela lente do item 2
**Sensor (iteração 3)**: 7 mutações injetadas — **6 mortas, 1 sobrevivente** (P4, rota dinâmica, classificado como observação). Acumulado da feature: **23/26**.
**Gate**: ver tabela acima

**O que funciona**: tudo que as iterações 1 e 2 já provavam, mais — a contenção estrutural de nav e "Sair" dentro do `<header>` (N2 morre em 15 testes); o contêiner único e o espaçamento fixo de 32px nas 8 rotas estáticas (N1 morre); o item ativo correto **em cada** rota, não só em `/avaliacoes` (N3 morre, e só o teste novo o pega); a fiação perfil→menu (P1 morre); o header CSRF do logout (P2 morre); a metade `margin` do reset de UI-21 (P3 morre).

**Problemas**: nenhum bloqueador. Um único item aberto, ranqueado: **P4** — UI-06 sem rede de regressão nas 3 rotas dinâmicas, com o critério verificado como satisfeito hoje por inspeção do código de produção.

**Next steps**: a feature está pronta no recorte declarado. Se o usuário quiser fechar a Observação 1, é uma tarefa test-side isolada (fixture de curso + 3 rotas no array de `e2e/…:181`), que não bloqueia a próxima fatia (UI-08…UI-19, UI-22).
