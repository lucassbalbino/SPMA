"use client";

// Os links do perfil, com o item da rota atual marcado (UI-02, UI-03), no
// estilo do menu lateral da tela de referência do design system SPMA
// (docs/design-system.md): itens de 44px (menos numa janela baixa), ícone de
// 22px a 24px do texto,
// item ativo com fundo `primary-50`, texto em negrito, ícone preenchido e a
// barra de 3px na borda do menu, e a linha divisória antes do grupo da conta.
//
// Client Component porque `usePathname` é hook de cliente por design - a doc
// do Next instalado é explícita que ler a URL atual de um Server Component
// não é suportado (node_modules/next/dist/docs/01-app/03-api-reference/
// 04-functions/use-pathname.md).
//
// Abaixo de `lg` os itens quebram linha (UI-07: sem drawer, sem JS). A partir
// de `lg` viram a coluna do menu lateral; com o menu recolhido
// (`data-recolhido` no <aside> de `MenuLateral`) o rótulo vira `sr-only` -
// continua sendo o nome acessível do link e o texto que os testes leem.
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hrefAtivo, type ItemNavegacao } from "@/lib/ui/navegacao";
import { cn } from "@/lib/utils";
import { iconeDoHref, separadorAntes } from "./icones-navegacao";

export function NavegacaoPerfil({ itens }: { itens: ItemNavegacao[] }) {
  const pathname = usePathname();
  const ativo = hrefAtivo(pathname, itens);

  return (
    <nav
      aria-label="Navegação principal"
      data-testid="navegacao-perfil"
      className="flex flex-wrap gap-1 lg:flex-col lg:flex-nowrap lg:gap-[clamp(2px,0.9svh,8px)]"
    >
      {itens.map((item) => {
        const Icone = iconeDoHref(item.href);
        const atual = item.href === ativo;

        return (
          <Fragment key={item.href}>
            {separadorAntes(item.href) && (
              <div role="separator" className="mx-0.5 my-1 hidden h-px bg-spma-divider lg:block" />
            )}
            <Link
              href={item.href}
              // `aria-current` é o requisito literal de UI-03 e dá ao e2e um
              // seletor que não depende de classe de estilo.
              aria-current={atual ? "page" : undefined}
              title={item.rotulo}
              className={cn(
                "relative flex h-9 items-center gap-2 rounded-md px-3 text-spma-body-md text-spma-ink-800 transition-colors",
                "hover:bg-spma-primary-50 focus-visible:shadow-spma-focus focus-visible:outline-none",
                // 44px da referência numa janela alta; encolhe numa baixa
                // (--altura-item-menu em globals.css) para o menu caber.
                "lg:h-(--altura-item-menu) lg:shrink-0 lg:gap-6 lg:px-4 lg:text-[15px] lg:leading-5",
                "lg:group-data-[recolhido=true]/menu:justify-center lg:group-data-[recolhido=true]/menu:px-0",
                atual && [
                  "bg-spma-primary-50 font-bold text-spma-primary-700",
                  "lg:before:absolute lg:before:inset-y-0 lg:before:-left-3 lg:before:w-[3px] lg:before:rounded-r-sm lg:before:bg-spma-primary-600",
                ],
              )}
            >
              <Icone
                aria-hidden="true"
                strokeWidth={1.75}
                className={cn(
                  "size-[18px] shrink-0 lg:size-[22px]",
                  atual && "fill-spma-primary-600 text-spma-primary-600",
                )}
              />
              <span className="truncate lg:group-data-[recolhido=true]/menu:sr-only">{item.rotulo}</span>
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
