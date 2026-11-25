# Design system SPMA

Fonte única da identidade visual: o artefato **SPMA (Design System)** — https://claude.ai/artifact/TMPCux84JLVQSCogEti61W
Lá ficam o guia da marca, os tokens, as prévias dos componentes e as telas de referência (login e painel).

## Onde mora no código

| Arquivo | O que tem |
|---|---|
| `src/app/spma-design-system.css` | Tokens brutos com prefixo `--spma-*` (cores, espaçamento, raios, sombras, tamanhos), utilitários Tailwind `*-spma-*`, estilos de texto `text-spma-*` e classes de componente `spma-*`. |
| `src/app/globals.css` | Importa o arquivo acima e mapeia as variáveis do shadcn (`--primary`, `--background`, `--border`…) e os raios/fontes do `@theme` para os tokens SPMA (AD-039). |
| `src/app/layout.tsx` | Carrega Lexend (`--font-lexend`) e Nunito Sans (`--font-nunito-sans`) com `next/font`. |
| `public/brand/` | `spma-wordmark.svg`, `unb-horizontal.png`, `unb-simbolo.png`, `mtur-governo-federal.png`, `sprint-dados.png`. |

## Como usar

1. **Prefira os componentes shadcn** de `src/components/ui`. Eles já herdam o tema: `bg-primary` é o verde-petróleo `#0a7176`, `rounded-md` é 6px, `font-sans` é Nunito Sans e `font-heading` é Lexend.
2. **Para tokens que o shadcn não cobre**, use os utilitários com prefixo `spma`:
   - cores: `bg-spma-primary-100`, `text-spma-ink-800`, `border-spma-divider`, `text-spma-unb-blue`
   - sombras: `shadow-spma-card`, `shadow-spma-header`, `shadow-spma-focus`
   - medidas: `w-[var(--spma-sidebar-width)]`, `h-[var(--spma-header-height)]`
3. **Texto**: `text-spma-brand-xl`, `text-spma-heading-xl|lg|md|sm`, `text-spma-body-lg|md`, `text-spma-label`, `text-spma-label-sm`, `text-spma-button`, `text-spma-caption`, `text-spma-overline`.
4. **Classes prontas** (iguais às prévias do design system): `spma-btn spma-btn--primary`, `spma-input`, `spma-notice`, `spma-sidebar`, `spma-nav__item`, `spma-topbar`, `spma-footer`… Use-as para prototipar rápido. Em código definitivo, prefira shadcn + utilitários.
5. **Ícones**: `lucide-react`, traço 1.75 e tamanho 22px (`<Home size={22} strokeWidth={1.75} />`).

Nenhum `.tsx` leva cor literal (AD-039): sempre token.

## Mapa shadcn → SPMA

| shadcn | SPMA |
|---|---|
| `background` / `muted` | `background` #f4f6f9 |
| `card`, `popover`, `sidebar` | `surface` #ffffff |
| `foreground` | `ink-900` |
| `primary` / `primary-foreground` | `primary-700` / `ink-0` |
| `secondary`, `accent`, `sidebar-accent` | `primary-50` |
| `muted-foreground` | `ink-600` |
| `border` / `input` | `divider` / `border` |
| `ring` | `primary-600` |
| `destructive` | `danger-600` |

O tema escuro (`.dark`) continua com os valores neutros originais. O design system ainda não define um tema escuro.

## Atualizar

Quando um token mudar no design system, copie o novo valor para a variável `--spma-*` correspondente em `src/app/spma-design-system.css`. Os nomes não mudam, por isso nenhuma tela precisa ser editada.

## Pendências

- Os logotipos do Ministério do Turismo, do Governo do Brasil e da Sprint Dados vieram como imagem (JPG com fundo cinza, fundo removido). Se chegarem os vetores oficiais (SVG), troque os PNG de `public/brand/`.
- As fontes Lexend e Nunito Sans foram identificadas a partir das telas e precisam ser confirmadas.
- A cor `--spma-border` (#d1d5db) tem contraste de 1.5:1. Se a acessibilidade WCAG AA for requisito, troque por `#8a94a6`.

## Telas de referência

As duas telas seguem as prints do artefato (grupo **Telas**: `spma-login.png` e `spma-painel.png`) elemento por elemento. Onde a print mostra algo que o sistema ainda não tem, valem as decisões abaixo (2026-11-20).

| Elemento da print | No SPMA |
|---|---|
| Login: "Perfil de acesso" + "E-mail" | Um campo só, **CPF ou CNPJ**: o login identifica o perfil sozinho |
| Login: "Lembrar-me" e "Esqueci minha senha" | Fora até existirem no backend; no lugar vai a dica "Primeiro acesso? Deixe a senha em branco." |
| Login: fotos em losango | Espaço reservado (losangos em `primary-50`/`primary-100` com ícone de imagem) até chegarem as fotos originais |
| Login: Política de Privacidade, Termos de Uso, Suporte | Fora da tela (pedido do cliente, 2026-11-25) |
| Login: faixa de parceiros só sob a coluna da marca | A faixa branca atravessa a tela toda; os logos seguem sob a coluna da marca e o cartão fica por cima |
| Logotipos do Ministério do Turismo e do Governo Federal | Um arquivo só, `public/brand/mtur-governo-federal.png`, no cabeçalho da casca e no "Apoio" do login |
| Logotipo da empresa desenvolvedora | `public/brand/sprint-dados.png` (Sprint Dados), no "Desenvolvido por" do login |
| Menu: itens de exemplo (Usuários, Cursos e Projetos…) | Os itens reais de `navegacao.ts`, com os nomes aprovados na revisão de usabilidade |
| Rodapé: "Versão 1.0.0" | A versão do `package.json` |

## Caber na tela

A partir de `lg` (1024px) **a página nunca rola**: o login e a casca ocupam exatamente a janela (`h-dvh`). As prints foram desenhadas para uma janela de ~950px úteis (1920x1080). Num notebook 1366x768 sobram ~640px depois da barra do navegador, então as medidas verticais encolhem com a altura da janela:

- Espaços, margens e alguns tamanhos usam `clamp(piso, N svh, valor da print)`. Numa janela alta o resultado é o valor da print; numa baixa, encolhe até o piso.
- As alturas de cabeçalho, campo, botão e item do menu ficam em `globals.css` (`--altura-cabecalho`, `--altura-campo`, `--altura-botao`, `--altura-item-menu`). O teto de cada uma é o token do design system.
- A colagem do login é medida em % e fica ancorada embaixo à direita da coluna da marca, sangrando 15% para fora da coluna (os losangos da direita e de baixo aparecem cortados), o maior possível sem que um losango encoste no texto: o canto vazio do diamante acomoda as últimas linhas do título, da PNQT e da descrição (a fórmula está comentada em `login/page.tsx`). O lado vai de ~300px (1024x640) e ~450px (1366x768) a 1100px em monitores grandes. A faixa de parceiros fica numa linha só; entre 1024 e 1280px os rótulos sobem para cima dos logos.
- Na casca, menu, cabeçalho e rodapé ficam fixos, e só o `casca-conteudo` rola. Isso só acontece quando a tela é mais longa que a janela, como nas listas e nos formulários longos, cujo tamanho depende dos dados.
- Abaixo de `lg` (celular e tablet em pé) a página rola normalmente.

Conferido sem rolagem no login e no painel em 1024x640, 1280x585, 1366x641, 1440x790, 1536x730 e 1920x950. O e2e `caber na tela` (`e2e/identidade-visual.spec.ts`) confere 1366x641.

## Casca e painel

- `src/components/layout/CascaProtegida.tsx` monta a estrutura da print do painel: o menu lateral (`MenuLateral`) à esquerda; o cabeçalho de 74px com os selos dos parceiros, a UnB e o usuário com a seta; o `<main>` (máximo de 60rem, centralizado na coluna, espaço vertical de 16 a 32px conforme a altura da janela, dentro do `casca-conteudo`, que é quem rola) em fundo branco; e o rodapé com créditos e versão.
- `MenuLateral` é o `casca-menu` dos testes: a marca com o nome do sistema, o bloco "Perfil" com a seta, a navegação e o "Recolher menu" (seta para a esquerda). O bloco Perfil e o Recolher só aparecem a partir de `lg`. Abaixo de `lg` o menu vira um bloco no topo e os links quebram linha, sem JavaScript (UI-07).
- O cabeçalho é o `casca-cabecalho` dos testes: nome e perfil do usuário. A seta do usuário (e a do bloco Perfil) abre o `MenuDaConta`, um `<details>` nativo com nome, perfil, sigla e o **Sair**. Abre sem JavaScript; o JS só fecha ao clicar fora ou com Esc.
- Item ativo do menu: fundo `primary-50`, texto `primary-700` em negrito, ícone preenchido em `primary-600` e a barra de 3px na borda. A linha divisória entra antes de "Editar Perfil" (`separadorAntes` em `icones-navegacao.ts`).
- Os ícones de cada rota ficam em `src/components/layout/icones-navegacao.ts`. Rota nova no `navegacao.ts` precisa de ícone lá. Sem ícone, cai no `LayoutGrid`.
- **Nunca** passe o `usuario` de `requireSession()` inteiro para um Client Component: ele é a linha do banco (CPF, senhaHash) e seria serializado no HTML. A casca repassa só `{ nome, tipo }`.
- `/painel` é a home: tem a faixa de boas-vindas em `primary-700` com losangos (o motivo da marca), os cartões dos módulos do perfil (vindos de `MODULOS_POR_PERFIL`) e o aviso de veracidade.
- Logotipos vão em `<img>` simples, não `next/image`: o `next/image` grava `style=` no elemento e a CSP (`style-src` só com nonce) bloqueia.

## Login

`src/app/(public)/login/page.tsx` segue a print do login: à esquerda a marca (`brand-xl`), o nome do sistema, a PNQT, a descrição, o pontilhado (`spma-pontilhado`), a colagem em losangos e a faixa de parceiros (Realização · Apoio · Desenvolvido por), cuja faixa branca atravessa a tela toda; à direita o cartão de acesso (ícone, "Acesso ao sistema", campos de 52px com ícone, olho na senha, botão "Entrar" de 64px, aviso de veracidade). No celular a ordem é marca, cartão e parceiros, e a colagem some.
