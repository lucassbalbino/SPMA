"use client";

// Os links do perfil, com o item da rota atual marcado (UI-02, UI-03).
//
// Client Component porque `usePathname` é hook de cliente por design - a doc
// do Next instalado é explícita que ler a URL atual de um Server Component
// não é suportado (node_modules/next/dist/docs/01-app/03-api-reference/
// 04-functions/use-pathname.md).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hrefAtivo, type ItemNavegacao } from "@/lib/ui/navegacao";
import { cn } from "@/lib/utils";

export function NavegacaoPerfil({ itens }: { itens: ItemNavegacao[] }) {
  const pathname = usePathname();
  const ativo = hrefAtivo(pathname, itens);

  return (
    <nav
      aria-label="Navegação principal"
      data-testid="navegacao-perfil"
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      {itens.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          // `aria-current` é o requisito literal de UI-03 e dá ao e2e um
          // seletor que não depende de classe de estilo.
          aria-current={item.href === ativo ? "page" : undefined}
          className={cn(
            "text-sm text-muted-foreground hover:text-foreground",
            item.href === ativo && "font-medium text-foreground underline underline-offset-4",
          )}
        >
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}
