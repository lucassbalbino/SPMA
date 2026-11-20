"use client";

// Encerrar a sessão pela interface (UI-04, UI-05). Fica dentro do menu da
// conta (`MenuDaConta`), com cara de item de menu do design system SPMA.
//
// `POST /api/auth/logout` já existe e é testado; até aqui nenhum .tsx o
// chamava. A mutação vai por `fetch`, então precisa do header CSRF
// (REQ-SEC-15) - é o que `headerCSRF()` monta a partir do cookie legível.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { headerCSRF } from "@/lib/security/csrf-client";

export function BotaoSair() {
  const router = useRouter();
  const [pendente, setPendente] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function sair() {
    setPendente(true);
    setFalhou(false);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { ...headerCSRF() },
      });

      // 401 é sucesso do ponto de vista do botão: a rota responde assim
      // quando não há sessão, e "não haver sessão" é o objetivo. Também
      // cobre o segundo clique, caso ele escape do `disabled`.
      if (res.ok || res.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }

      setFalhou(true);
    } catch {
      setFalhou(true);
    }

    setPendente(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={sair}
        className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-spma-body-md text-spma-ink-800 transition-colors hover:bg-spma-primary-50 focus-visible:shadow-spma-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0" />
        Sair
      </button>
      {falhou && (
        <span className="px-3 pb-1 text-spma-caption text-destructive" data-testid="erro-sair">
          Não foi possível sair. Tente novamente.
        </span>
      )}
    </div>
  );
}
