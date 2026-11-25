// Casca comum de toda rota do grupo (protegido) - UI-01, UI-06, UI-07 -, igual
// à tela de referência do painel no design system SPMA
// (docs/design-system.md): menu lateral à esquerda; cabeçalho com os
// parceiros (o logotipo do Ministério do Turismo com o do Governo do Brasil, e
// a UnB) e o usuário com a seta do menu da
// conta; área de conteúdo branca; rodapé com os créditos e a versão.
//
// Server Component: recebe o `usuario` já resolvido por requireSession() no
// layout, então nenhum componente daqui consulta o banco de novo. Só os
// pedaços que precisam de JavaScript (recolher o menu, o realce do item ativo,
// fechar o menu da conta e o Sair) são Client Components.
//
// O cabeçalho (`casca-cabecalho`) identifica o usuário por nome e perfil,
// nunca por CPF (REQ-SEC-12). Abaixo de `md` os parceiros saem e fica só o
// usuário; o menu lateral vira um bloco no topo (UI-07).
import { ChevronDown, User } from "lucide-react";
import type { TipoUsuario } from "@/generated/prisma/enums";
import { navegacaoDoPerfil } from "@/lib/ui/navegacao";
import { NOME_TIPO_USUARIO } from "@/lib/ui/tipos-usuario";
import pacote from "../../../package.json";
import { MenuDaConta } from "./MenuDaConta";
import { MenuLateral } from "./MenuLateral";

export function CascaProtegida({
  usuario,
  children,
}: {
  usuario: { nome: string | null; tipo: TipoUsuario };
  children: React.ReactNode;
}) {
  const perfil = NOME_TIPO_USUARIO[usuario.tipo];
  // Só nome e perfil atravessam para os Client Components. O `usuario` que o
  // layout recebe de requireSession() é a linha inteira do banco (CPF,
  // senhaHash...): passado como prop a um Client Component ele seria
  // serializado no HTML (REQ-SEC-12; pego por e2e/identidade-visual e
  // e2e/security-headers).
  const visivel = { nome: usuario.nome, tipo: usuario.tipo };

  return (
    // A partir de `lg` a casca ocupa exatamente a janela (h-dvh) e a página
    // nunca rola: menu, cabeçalho e rodapé ficam no lugar, e só a área de
    // conteúdo rola quando a tela é mais longa que a janela (um formulário de
    // 56 perguntas não cabe em tela nenhuma). Abaixo de `lg` o menu vira um
    // bloco no topo e a página rola normalmente.
    //
    // `lg:flex-none`: o <body> é flex em coluna sem altura definida, e ali o
    // `flex-1` (base 0%) vira a altura do conteúdo e passa por cima do h-dvh.
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-spma-surface lg:h-dvh lg:flex-none lg:flex-row lg:overflow-hidden">
      <MenuLateral usuario={visivel} itens={navegacaoDoPerfil(visivel.tipo)} />

      <div className="flex min-w-0 flex-1 flex-col bg-spma-surface lg:min-h-0">
        <header
          data-testid="casca-cabecalho"
          className="sticky top-0 z-20 flex h-(--altura-cabecalho) shrink-0 items-center justify-end gap-8 bg-spma-surface px-4 shadow-spma-header lg:px-8"
        >
          <div
            role="group"
            aria-label="Realização e apoio"
            className="hidden h-11 items-center gap-2.5 border-r border-spma-divider pr-8 md:flex"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/mtur-governo-federal.png"
              alt="Ministério do Turismo e Governo do Brasil"
              width={760}
              height={180}
              className="h-10 w-auto"
            />
            <span className="ml-3.5 flex items-center gap-2">
              {/* <img> simples, não next/image: o next/image grava
                  style="color:transparent" no elemento, e a CSP do projeto
                  (style-src só com nonce, em proxy.ts) bloqueia atributo
                  style - o mesmo motivo do sr-only em ui/switch.tsx. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/unb-simbolo.png" alt="" width={69} height={34} />
              <span className="font-heading text-[26px] leading-none font-bold text-spma-unb-blue">
                UnB
              </span>
            </span>
          </div>

          <MenuDaConta
            testId="menu-da-conta"
            nome={usuario.nome}
            perfil={perfil}
            sigla={usuario.tipo}
            className="min-w-0"
            classePainel="top-full right-0 w-72 max-w-[calc(100vw-2rem)]"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-spma-divider text-spma-ink-800">
              <User aria-hidden="true" strokeWidth={1.75} className="size-[22px]" />
            </span>
            <span className="min-w-0">
              <span className="block max-w-40 truncate text-[15px] leading-5 font-semibold text-spma-ink-800 sm:max-w-64">
                {usuario.nome}
              </span>
              <span className="block text-spma-caption text-spma-ink-500">{perfil}</span>
            </span>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.75}
              className="size-[22px] shrink-0 text-spma-ink-800 transition-transform group-open/conta:rotate-180"
            />
          </MenuDaConta>
        </header>

        {/* A rolagem fica neste invólucro de largura total, não no <main>: a
            barra encosta na borda da janela e o <main> segue centralizado,
            com largura máxima (UI-06). */}
        <div
          data-testid="casca-conteudo"
          className="flex flex-1 flex-col lg:min-h-0 lg:overflow-y-auto"
        >
          <main className="mx-auto w-full max-w-[60rem] flex-1 px-4 py-8 lg:px-8 lg:py-[clamp(16px,3.4svh,32px)]">
            {children}
          </main>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-spma-divider bg-spma-surface px-4 py-6 text-spma-caption lg:py-[clamp(10px,2svh,24px)] text-spma-ink-600 lg:px-8">
          <span>
            SPMA © {new Date().getFullYear()} - Secretaria Nacional de Políticas de Turismo /
            Ministério do Turismo
          </span>
          <span>Versão {pacote.version}</span>
        </footer>
      </div>
    </div>
  );
}
