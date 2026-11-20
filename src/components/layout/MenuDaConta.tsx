"use client";

// Menu da conta (design system SPMA): o bloco do usuário com a seta para
// baixo, no cabeçalho e no perfil do menu lateral. Abre um painel com quem
// está logado (nome, perfil e sigla) e o Sair.
//
// `<details>`/`<summary>` nativos: abre e fecha sem JavaScript (UI-07). O JS
// só acrescenta fechar ao clicar fora e com Esc.
//
// O usuário é identificado por nome e perfil, nunca por CPF (REQ-SEC-12).
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { BotaoSair } from "./BotaoSair";

export function MenuDaConta({
  nome,
  perfil,
  sigla,
  children,
  className,
  classePainel,
  testId,
}: {
  nome: string | null;
  perfil: string;
  sigla: string;
  /** O gatilho visível (avatar, textos e a seta), dentro do <summary>. */
  children: React.ReactNode;
  className?: string;
  classePainel?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function fecharAoClicarFora(evento: PointerEvent) {
      const detalhes = ref.current;
      if (detalhes?.open && !detalhes.contains(evento.target as Node)) {
        detalhes.open = false;
      }
    }

    function fecharComEsc(evento: KeyboardEvent) {
      const detalhes = ref.current;
      if (evento.key === "Escape" && detalhes?.open) {
        detalhes.open = false;
        detalhes.querySelector("summary")?.focus();
      }
    }

    document.addEventListener("pointerdown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEsc);
    return () => {
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEsc);
    };
  }, []);

  return (
    <details ref={ref} data-testid={testId} className={cn("group/conta relative", className)}>
      <summary
        data-testid={testId ? `${testId}-gatilho` : undefined}
        className="flex cursor-pointer list-none items-center gap-3 rounded-md focus-visible:shadow-spma-focus focus-visible:outline-none [&::-webkit-details-marker]:hidden"
      >
        {children}
      </summary>

      <div
        className={cn(
          "absolute z-30 mt-2 flex flex-col gap-1 rounded-lg border border-spma-divider bg-spma-surface p-2 shadow-spma-card",
          classePainel,
        )}
      >
        <div className="border-b border-spma-divider px-3 pt-1 pb-3">
          <span className="block truncate text-spma-label-sm text-spma-ink-900">{nome}</span>
          <span className="block truncate text-spma-caption text-spma-ink-500">
            {perfil} ({sigla})
          </span>
        </div>
        <BotaoSair />
      </div>
    </details>
  );
}
