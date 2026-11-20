// Casca comum de toda rota do grupo (protegido) - UI-01, UI-06, UI-07 -, igual
// à tela de referência do painel no design system SPMA
// (docs/design-system.md): menu lateral à esquerda; cabeçalho com os
// parceiros (Ministério do Turismo e Governo Federal em espaço reservado até
// chegarem os logotipos oficiais, e a UnB) e o usuário com a seta do menu da
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

/** Espaço reservado tracejado para um logotipo de parceiro que ainda não chegou. */
function SeloParceiro({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[46px] items-center justify-center rounded-sm border border-dashed border-spma-border px-3 text-center text-[10px] leading-[14px] font-bold tracking-[1.2px] text-spma-ink-600 uppercase">
      {children}
    </span>
  );
}

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
    <div className="flex min-h-screen w-full flex-1 flex-col bg-spma-surface lg:flex-row">
      <MenuLateral usuario={visivel} itens={navegacaoDoPerfil(visivel.tipo)} />

      <div className="flex min-w-0 flex-1 flex-col bg-spma-surface">
        <header
          data-testid="casca-cabecalho"
          className="sticky top-0 z-20 flex h-(--spma-header-height) shrink-0 items-center justify-end gap-8 bg-spma-surface px-4 shadow-spma-header lg:px-8"
        >
          <div
            role="group"
            aria-label="Realização e apoio"
            className="hidden h-11 items-center gap-2.5 border-r border-spma-divider pr-8 md:flex"
          >
            <SeloParceiro>
              Ministério
              <br />
              do Turismo
            </SeloParceiro>
            <SeloParceiro>
              Logo Governo
              <br />
              Federal
            </SeloParceiro>
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

        <main className="mx-auto w-full max-w-[60rem] flex-1 px-4 py-8 lg:px-8">{children}</main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-spma-divider bg-spma-surface px-4 py-6 text-spma-caption text-spma-ink-600 lg:px-8">
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
