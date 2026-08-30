# Feature: identidade-visual

**Escopo:** Medium (nenhuma regra de negócio, nenhuma rota de API nova, nenhum model; o volume vem da quantidade de telas tocadas — 11 páginas do grupo `(protegido)` — não da dificuldade de cada uma).
**Dependências:** `auth-e-usuarios` (sessão, `TipoUsuario`, `POST /api/auth/logout`, `MODULOS_POR_PERFIL` do painel), `seguranca-transversal` (CSRF no logout via `headerCSRF`, CSP com nonce — nada de `<style>` ou `style=` inline novo).
**Fonte de decisões:** STATE.md AD-002 (Next.js App Router), AD-006 (shadcn/ui + Tailwind), AD-009/AD-012 (cascata e escopo, que definem o que cada perfil vê na navegação). Introduz AD-039 (camada visual em arquivo único), registrada no Execute.
**Fonte funcional:** decisões do usuário nesta sessão (2026-08-28), registradas em Assunções — não há requisito visual no documento do cliente.

---

## Problem Statement

As telas do sistema estão cruas: cada página é um `<main class="min-h-screen">` com um `Card` centralizado, sem cabeçalho, sem navegação e sem nenhuma forma de sair da sessão pela interface (o `POST /api/auth/logout` existe e é testado, mas nenhum `.tsx` o chama). A rota `/` ainda serve a landing do `create-next-app`, o `<title>` do documento é "Create Next App" e o `<html>` declara `lang="en"` num sistema inteiramente em português. Com os quatro formulários prontos, o sistema já é demonstrável para o cliente — e é assim que ele aparece hoje.

O tour visual de 2026-08-29 (16 capturas, todas as rotas, todos os perfis) mostrou que o estado não é só "sem enfeite" — dois defeitos em `globals.css` quebram a base visual inteira: (1) `@theme inline` declara `--font-sans: var(--font-sans)`, uma autorreferência que invalida a variável e faz **todo o sistema renderizar na fonte serifada de fallback do navegador**, não na Geist carregada pelo layout; (2) o reset `* { padding: 0; margin: 0 }` está fora de qualquer `@layer`, e CSS sem camada vence `@layer utilities`, então **toda utilidade de espaçamento do Tailwind é anulada** — daí os cards com texto colado na borda, as listas grudadas no topo da janela e os botões de ação sobrepostos.

Esta feature entrega o mínimo para que as telas existentes deixem de parecer um esqueleto de testes: corrigir esses dois defeitos de base, uma casca comum, um punhado de padrões de página, e uma base visual neutra concentrada num arquivo só, para poder ser trocada depois sem reescrever tela nenhuma.

## Goals

- [ ] Toda tela do grupo `(protegido)` renderiza dentro de uma casca comum: marca, navegação do perfil, identificação do usuário e "Sair".
- [ ] As 11 telas protegidas usam os mesmos padrões de título de página, lista, estado vazio e status — nenhuma inventa o seu.
- [ ] Toda cor, raio e fonte vive em `src/app/globals.css`; nenhum `.tsx` carrega cor literal.
- [ ] `/`, `<title>` e `lang` deixam de ser resíduo do template.
- [ ] Os 199 testes e2e existentes continuam verdes — a migração não pode quebrar nenhum contrato de seletor/rótulo.

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Item | Motivo |
| ---- | ------ |
| Cor de acento, logotipo, tipografia comprada, ilustrações | Decisão do usuário: paleta neutra pura, hierarquia por peso e espaçamento. Marca visual é decisão do cliente, não desta feature. |
| Modo escuro e alternador de tema | Custo sem demanda; o esquema claro é fixado (UI-15). Se o cliente pedir, vira feature própria — a camada de tokens já deixa isso barato. |
| Teste automatizado que proíbe cor hardcoded | Decisão do usuário: a regra fica como convenção documentada (AD-039 + `AGENTS.md`), não como gate de CI. |
| Landing pública desenhada em `/` | `/` vira redirect (UI-17). Uma home institucional é conteúdo de marketing, não parte do sistema. |
| Telas de `(public)` e `(onboarding)` (`/login`, `/primeiro-acesso`, `/cadastro-ofertante`) | Fora do escopo escolhido: não têm sessão e por isso não têm casca. Herdam só as correções globais (UI-15, UI-18). |
| Dashboard / indicadores | Adiado por AD-024 até o cliente definir os indicadores. |
| Novas dependências (outra biblioteca de ícones, fontes externas, CSS-in-JS) | `lucide-react`, `tailwindcss` e as fontes Geist/Geist Mono já estão instaladas e bastam. |
| Responsividade avançada (drawer, menu hambúrguer com JS, tabelas com scroll sincronizado) | UI-07 exige apenas que nada estoure nem dependa de JS abaixo de 640px. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui.

| Assunção / decisão | Padrão escolhido | Justificativa | Confirmado? |
| --- | --- | --- | --- |
| Amplitude da feature | O mínimo para as telas não parecerem cruas: casca + padrões de página + base de tokens, sem nenhuma tela nova | Pedido literal do usuário ("o mais simples possível, só pra não apresentar as telas totalmente cruas") | y |
| Estética | Neutro puro (escala de cinza já em `globals.css`), sem acento; hierarquia por peso tipográfico, espaçamento e bordas de 1px | Escolha do usuário; também é a base mais barata de substituir depois, por não ter cor de marca espalhada | y |
| Mecanismo de substituição | Convenção documentada (AD-039 + nota em `AGENTS.md`), sem teste que a force | Escolha do usuário. Custo aceito e registrado: a regra depende de disciplina; se aparecer a primeira violação, promovê-la a lint rule é tarefa de uma linha | y |
| Migração das telas existentes | Todas as 11 telas do grupo `(protegido)` migram nesta feature | Escolha do usuário; são todas simples e os 199 e2e existentes cobrem regressão | y |
| Destino de `/` | Redirect para `/painel` (que já manda para `/login` quando não há sessão, via `requireSession`) | É a coisa mais simples que remove o resíduo do template sem inventar uma home; reaproveita o guard existente | n |
| Esquema de cor | Fixar claro e remover o bloco `@media (prefers-color-scheme: dark)` de `globals.css` | Hoje esse bloco aplica `color-scheme: dark` sem ativar a classe `.dark`: num SO em modo escuro os controles nativos ficam escuros sobre uma paleta clara. Fixar claro corrige a inconsistência sem introduzir um tema que ninguém pediu | n |
| Fonte da navegação por perfil | `MODULOS_POR_PERFIL` (hoje literal dentro de `painel/page.tsx`) vira `src/lib/ui/navegacao.ts`, com rota por item, consumido pela casca e pelo painel | Evita duas listas de módulos divergindo; mantém o contrato de `data-testid="painel-modulos"` que o e2e de perfis já verifica | n |
| Módulos sem tela | Itens sem rota implementada (ex.: "Relatórios", "Ofertantes", "Verbas" — só têm API) continuam listados no painel como hoje, mas não viram link na navegação | Um link para 404 é pior que a ausência dele; a navegação só oferece o que abre | n |
| Identificação no cabeçalho | `usuario.nome` + sigla do perfil (`AM`/`GT`/`VT`/`GO`/`VO`/`AL`), sem CPF | CPF é dado sensível e já é mascarado em log (REQ-SEC-12); não há motivo para exibi-lo em toda tela | n |
| Preservação de contratos de teste | Todo `data-testid` e todo texto de rótulo existentes são preservados; a casca só adiciona elementos | Os 199 e2e são a rede de segurança desta feature; alterá-los junto com o visual destruiria a evidência de não-regressão | y |

**Open questions:** none — tudo resolvido ou registrado acima.

---

## User Stories

### P1: Casca comum das telas protegidas ⭐ MVP

**User Story**: Como usuário autenticado, quero um cabeçalho constante com navegação e saída, para saber onde estou, ir a outro módulo e encerrar minha sessão sem digitar URL.

**Why P1**: É a diferença entre "um conjunto de páginas soltas" e "um sistema". Hoje não existe nenhuma forma de navegar ou sair pela interface — o `POST /api/auth/logout` está implementado e testado, e nenhum componente o chama.

**Acceptance Criteria**:

1. WHILE um usuário autenticado está em qualquer rota do grupo `(protegido)`, the system SHALL renderizar um cabeçalho no topo com a marca textual "SPMA", a navegação do perfil, o nome do usuário com a sigla do perfil, e um botão "Sair". (UI-01)
2. The system SHALL derivar os itens de navegação de uma única fonte compartilhada com o painel, de modo que um perfil nunca receba link para um módulo fora da sua lista. (UI-02)
3. WHEN a rota atual corresponde a um item da navegação THEN the system SHALL marcar esse item com `aria-current="page"`. (UI-03)
4. WHEN o usuário aciona "Sair" THEN the system SHALL enviar `POST /api/auth/logout` com o cabeçalho `x-csrf-token` obtido de `headerCSRF()` e, ao receber resposta de sucesso, navegar para `/login`. (UI-04)
5. IF a requisição de logout for rejeitada (403 de CSRF, 401 de sessão ausente) ou falhar por rede THEN the system SHALL manter o usuário na página atual e exibir uma mensagem de falha, sem navegar para `/login`. (UI-05)
6. The system SHALL renderizar o conteúdo de toda tela protegida dentro de um contêiner único, centralizado e de largura máxima fixa, com o mesmo espaçamento vertical em todas elas. (UI-06)
7. WHERE a viewport tem menos de 640px de largura, the system SHALL manter cabeçalho e navegação legíveis sem scroll horizontal e sem depender de JavaScript para revelar a navegação. (UI-07)

**Independent Test**: Logar como GT e como AL em contextos separados; confirmar que o cabeçalho aparece em `/painel` e em `/avaliacoes`, que a lista de links difere entre os dois perfis, que o item da rota atual traz `aria-current="page"`, e que "Sair" derruba a sessão (o cookie anterior deixa de autenticar) e leva a `/login`.

---

### P1: Padrões de página aplicados às telas existentes ⭐ MVP

**User Story**: Como usuário, quero que todas as telas apresentem título, listas, vazios e status do mesmo jeito, para não reaprender a ler cada uma.

**Why P1**: É o que efetivamente tira as telas do estado cru. Sem isso a casca só emoldura páginas ainda inconsistentes.

**Acceptance Criteria**:

1. The system SHALL prover um cabeçalho de página reutilizável (título, descrição opcional, slot de ação) e usá-lo nas 11 telas do grupo `(protegido)`. (UI-08)
2. WHEN uma listagem não possui nenhum registro THEN the system SHALL exibir um estado vazio com texto explicativo no lugar da lista, nunca uma lista vazia sem explicação. (UI-09)
3. The system SHALL exibir o status de um registro (`EM_ANDAMENTO` / `ENCERRADO`) com o mesmo indicador visual em todas as telas que mostram status, preservando o texto atual ("Em andamento" / "Encerrado") e o `data-testid` de cada uma. (UI-10)
4. The system SHALL renderizar identificadores técnicos (CPF, código de curso, id) em fonte monoespaçada, usando a `--font-geist-mono` já carregada no layout raiz, sem alterar o valor exibido. (UI-11)
5. WHEN a suíte completa é executada após a migração THEN the system SHALL manter os 382 testes unitários, 27 de integração e 199 e2e verdes, sem alteração em nenhum arquivo de teste existente. (UI-12)
6. WHEN uma ação de cabeçalho de página navega para outra rota (ex.: "Novo pré-curso", "Matricular aluno") THEN the system SHALL renderizá-la sem emitir o aviso do Base UI sobre `nativeButton` (hoje disparado em `/pre-cursos`, `/pos-cursos` e `/avaliacoes`), preservando o texto e o destino atuais. (UI-22)

**Independent Test**: Rodar `lint && build && typecheck && test:unit && test:integration && test:e2e` na íntegra após a migração e comparar a contagem com a do HEAD atual (382/27/199); abrir uma listagem sem registros para um Ofertante recém-criado e confirmar o estado vazio.

---

### P1: Base visual única e substituível

**User Story**: Como desenvolvedor, quero que trocar a estética do sistema custe editar um arquivo, para que a escolha visual de hoje não vire dívida amanhã.

**Why P1**: É o requisito explícito do usuário ("substituível no futuro"). Se nascer com cor espalhada nos componentes, a troca deixa de ser barata no dia seguinte.

**Acceptance Criteria**:

1. The system SHALL manter toda definição de cor, raio, fonte e escala de espaçamento em `src/app/globals.css`, sem nenhuma cor literal (`#hex`, `rgb()`, `oklch()`) nem utilitário Tailwind de cor fixa (`bg-neutral-900`, `text-slate-500`) em arquivos `.tsx`. (UI-13)
2. The system SHALL usar exclusivamente a paleta neutra já definida, sem cor de acento, obtendo hierarquia por peso tipográfico, espaçamento e bordas de 1px. (UI-14)
3. The system SHALL fixar o esquema de cor claro, removendo de `globals.css` o bloco `@media (prefers-color-scheme: dark)` que hoje aplica `color-scheme: dark` sem ativar a classe `.dark`. (UI-15)
4. WHERE um tema futuro precisar substituir a estética, the system SHALL permitir a troca editando apenas os blocos `:root` e `@theme inline` de `globals.css`, sem alteração em nenhum `.tsx`; a regra fica registrada como AD-039 em `.specs/STATE.md` e citada em `AGENTS.md`. (UI-16)
5. The system SHALL apontar `--font-sans` e `--font-mono` do `@theme inline` para as variáveis reais emitidas pelo layout raiz (`--font-geist-sans`, `--font-geist-mono`), eliminando a autorreferência `--font-sans: var(--font-sans)` que hoje invalida a variável e faz toda tela renderizar na fonte serifada de fallback do navegador. (UI-20)
6. The system SHALL eliminar o efeito do reset não-layerizado `* { padding: 0; margin: 0 }` de `globals.css` — movendo-o para `@layer base` ou removendo-o em favor do preflight do Tailwind — de modo que utilidades de espaçamento (`p-*`, `gap-*`, `space-y-*`) voltem a valer em todas as telas. (UI-21)

**Independent Test**: Trocar `--background`, `--foreground` e `--radius` em `globals.css` por valores visivelmente diferentes, subir o app e confirmar que toda tela mudou sem nenhum outro arquivo tocado; reverter. `grep -rE '#[0-9a-fA-F]{3,8}|rgb\(|oklch\(|bg-(neutral|slate|zinc|gray)-' src --include=*.tsx` retorna vazio. Em `/login`, confirmar via `getComputedStyle` que `font-family` do `body` resolve para a Geist (não uma serifada) e que o `CardContent` tem `padding-left` diferente de `0px`.

---

### P2: Entrada do site e metadados do documento

**User Story**: Como visitante, quero que a raiz do site leve ao sistema e que a aba do navegador diga o nome dele, em vez do template do Next.

**Why P2**: Não bloqueia nenhum fluxo (ninguém usa `/` hoje), mas é o resíduo mais visível do scaffold numa demonstração.

**Acceptance Criteria**:

1. WHEN um visitante acessa `/` THEN the system SHALL redirecionar para `/painel`, que por sua vez já redireciona para `/login` quando não há sessão válida. (UI-17)
2. The system SHALL declarar `lang="pt-BR"` no elemento `<html>` e publicar `title` e `description` do SPMA no lugar de "Create Next App". (UI-18)
3. WHEN a landing padrão é removida THEN the system SHALL remover também `src/app/page.module.css` e os SVGs do template que ficarem sem referência (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`). (UI-19)

**Independent Test**: Requisitar `/` sem cookie de sessão e confirmar que a cadeia de redirects termina em `/login`; conferir `lang="pt-BR"` e o `<title>` no HTML servido; confirmar que `src/app/page.module.css` e os cinco SVGs não existem mais e que o build passa.

---

## Edge Cases

- IF o perfil do usuário tem um único módulo (AL — "Minha avaliação") THEN the system SHALL renderizar a navegação com esse único item, sem separador solto nem espaço vazio.
- IF a rota atual é uma sub-rota de um item da navegação (ex.: `/avaliacoes/novo`) THEN the system SHALL marcar como ativo o item da rota-pai correspondente, e nenhum item quando não houver rota-pai na lista do perfil.
- IF `usuario.nome` for longo o bastante para competir com a navegação THEN the system SHALL truncar o texto com reticências, sem quebrar a linha do cabeçalho nem gerar scroll horizontal.
- WHEN o usuário aciona "Sair" duas vezes em sequência rápida THEN the system SHALL tratar a segunda resposta 401 como conclusão bem-sucedida (a sessão já foi destruída pela primeira) e concluir a navegação para `/login`.
- WHILE um GO sem Ofertante vinculado está sendo redirecionado para `/cadastro-ofertante` pelo guard de `(protegido)`, the system SHALL não renderizar cabeçalho nem navegação nas rotas de `(onboarding)`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| UI-01 | P1: Casca comum | Design + Tasks | Verified |
| UI-02 | P1: Casca comum | Design + Tasks | Verified |
| UI-03 | P1: Casca comum | Design + Tasks | Verified |
| UI-04 | P1: Casca comum | Design + Tasks | Verified |
| UI-05 | P1: Casca comum | Design + Tasks | Verified |
| UI-06 | P1: Casca comum | Design + Tasks | Verified |
| UI-07 | P1: Casca comum | Design + Tasks | Verified |
| UI-08 | P1: Padrões de página | - | Pending |
| UI-09 | P1: Padrões de página | - | Pending |
| UI-10 | P1: Padrões de página | - | Pending |
| UI-11 | P1: Padrões de página | - | Pending |
| UI-12 | P1: Padrões de página | - | Pending |
| UI-13 | P1: Base visual | - | Pending |
| UI-14 | P1: Base visual | - | Pending |
| UI-15 | P1: Base visual | - | Pending |
| UI-16 | P1: Base visual | - | Pending |
| UI-17 | P2: Entrada do site | - | Pending |
| UI-18 | P2: Entrada do site | - | Pending |
| UI-19 | P2: Entrada do site | - | Pending |
| UI-20 | P1: Base visual | Design + Tasks | Verified |
| UI-21 | P1: Base visual | Design + Tasks | Verified |
| UI-22 | P1: Padrões de página | - | Pending |

**ID format:** `UI-NN` (interface).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 22 no total. 9 `Verified` (UI-01…UI-07, UI-20, UI-21 — recorte "casca comum + menu de navegação", implementado e verificado em `tasks.md` T1–T8). 13 ainda `Pending`: UI-08…UI-19 e UI-22 pertencem às histórias "Padrões de página", "Base visual" e "Entrada do site", que ganharão o próprio ciclo Design → Tasks. 0 sem cobertura prevista.

> UI-20, UI-21 e UI-22 vieram do tour visual de 2026-08-29 (capturas de todas as 16 telas). São defeitos observados, não requisitos de estilo.

---

## Success Criteria

- [ ] Um usuário logado navega entre todos os módulos do seu perfil e encerra a sessão sem digitar nenhuma URL.
- [ ] As 11 telas protegidas compartilham cabeçalho, contêiner, título de página, estado vazio e indicador de status — nenhuma tela com padrão próprio.
- [ ] `grep` por cor literal em `src/**/*.tsx` retorna vazio; trocar três variáveis em `globals.css` muda o sistema inteiro.
- [ ] Gate completo verde (`lint && build && typecheck && test:unit && test:integration && test:e2e`) com as mesmas contagens do HEAD (382/27/199) e zero arquivo de teste alterado.
- [ ] Nenhuma referência a `create-next-app` sobra no repositório (rota `/`, `page.module.css`, SVGs, `title`, `lang`).
- [ ] Nenhuma tela renderiza em fonte serifada de fallback, e nenhum card tem conteúdo colado na borda — os dois defeitos de base observados no tour de 2026-08-29 não reaparecem.
