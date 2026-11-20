"use client";

// Menu lateral da casca protegida, igual ao da tela de referência do design
// system SPMA (docs/design-system.md): marca com o nome do sistema, bloco
// "Perfil" com a seta (abre o menu da conta), navegação e "Recolher menu".
//
// É o `casca-menu` dos testes de identidade visual: a marca e a navegação
// (UI-01, UI-02) moram aqui; quem está logado e o Sair ficam no cabeçalho
// (`casca-cabecalho`, em CascaProtegida). Client Component só por causa do
// estado de recolher; o conteúdo chega já resolvido do servidor e tudo
// funciona sem JavaScript (UI-07) - sem JS o menu apenas não recolhe.
//
// Abaixo de `lg` vira um bloco no topo: marca e links quebrando linha. O bloco
// "Perfil" e o "Recolher menu" só existem com o menu em coluna (o cabeçalho
// já mostra o usuário no celular).
import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, User } from "lucide-react";
import type { TipoUsuario } from "@/generated/prisma/enums";
import type { ItemNavegacao } from "@/lib/ui/navegacao";
import { NOME_TIPO_USUARIO } from "@/lib/ui/tipos-usuario";
import { MenuDaConta } from "./MenuDaConta";
import { NavegacaoPerfil } from "./NavegacaoPerfil";

export function MenuLateral({
  usuario,
  itens,
}: {
  usuario: { nome: string | null; tipo: TipoUsuario };
  itens: ItemNavegacao[];
}) {
  const [recolhido, setRecolhido] = useState(false);
  const IconeRecolher = recolhido ? ArrowRight : ArrowLeft;
  const perfil = NOME_TIPO_USUARIO[usuario.tipo];

  return (
    <aside
      data-testid="casca-menu"
      data-recolhido={recolhido}
      aria-label="Menu do sistema"
      className="group/menu flex w-full shrink-0 flex-col border-b border-spma-divider bg-spma-surface lg:sticky lg:top-0 lg:h-screen lg:w-(--spma-sidebar-width) lg:border-r lg:border-b-0 lg:data-[recolhido=true]:w-20"
    >
      {/* Marca */}
      <div className="border-b border-spma-divider bg-spma-background px-4 py-4 lg:px-[30px] lg:pt-6 lg:pb-4 lg:group-data-[recolhido=true]/menu:px-0 lg:group-data-[recolhido=true]/menu:text-center">
        {/* Recolhido, o menu tem 80px e a marca em brand-md (~90px) vazaria
            sobre o conteúdo: cai para 20px. */}
        <span className="block text-spma-brand-md text-spma-primary-700 lg:group-data-[recolhido=true]/menu:text-xl">
          SPMA
        </span>
        <p className="mt-2 hidden text-[11px] leading-[15px] text-spma-ink-800 lg:block lg:group-data-[recolhido=true]/menu:hidden">
          Sistema Nacional de Planejamento, Monitoramento e Avaliação da Qualificação Profissional
          no Turismo
        </p>
      </div>

      {/* Perfil */}
      <div className="mx-3.5 hidden border-b border-spma-divider py-4 lg:block lg:group-data-[recolhido=true]/menu:mx-2">
        <MenuDaConta
          nome={usuario.nome}
          perfil={perfil}
          sigla={usuario.tipo}
          className="w-full"
          classePainel="inset-x-0 top-full lg:group-data-[recolhido=true]/menu:inset-x-auto lg:group-data-[recolhido=true]/menu:top-0 lg:group-data-[recolhido=true]/menu:left-full lg:group-data-[recolhido=true]/menu:mt-0 lg:group-data-[recolhido=true]/menu:ml-3 lg:group-data-[recolhido=true]/menu:w-64"
        >
          <span className="flex w-full items-center gap-3 px-3.5 lg:group-data-[recolhido=true]/menu:justify-center lg:group-data-[recolhido=true]/menu:px-0">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-spma-divider text-spma-ink-800">
              <User aria-hidden="true" strokeWidth={1.75} className="size-[22px]" />
            </span>
            <span className="min-w-0 flex-1 lg:group-data-[recolhido=true]/menu:sr-only">
              <span className="block text-spma-caption text-spma-ink-500">Perfil</span>
              <span className="block truncate text-spma-label-sm text-spma-ink-900">{perfil}</span>
            </span>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.75}
              className="size-[22px] shrink-0 text-spma-ink-800 transition-transform group-open/conta:rotate-180 lg:group-data-[recolhido=true]/menu:hidden"
            />
          </span>
        </MenuDaConta>
      </div>

      {/* Navegação */}
      <div className="px-3 py-3 lg:flex-1 lg:overflow-y-auto">
        <NavegacaoPerfil itens={itens} />
      </div>

      {/* Recolher: só faz sentido com o menu em coluna. */}
      <button
        type="button"
        onClick={() => setRecolhido((valor) => !valor)}
        aria-expanded={!recolhido}
        className="mx-3.5 hidden items-center gap-3.5 border-t border-spma-divider px-2.5 py-5 text-spma-body-md text-spma-ink-800 transition-colors hover:text-spma-primary-700 focus-visible:shadow-spma-focus focus-visible:outline-none lg:flex lg:group-data-[recolhido=true]/menu:mx-2 lg:group-data-[recolhido=true]/menu:justify-center lg:group-data-[recolhido=true]/menu:px-0"
      >
        <IconeRecolher aria-hidden="true" strokeWidth={1.75} className="size-[18px] shrink-0" />
        <span className="lg:group-data-[recolhido=true]/menu:sr-only">
          {recolhido ? "Expandir menu" : "Recolher menu"}
        </span>
      </button>
    </aside>
  );
}
