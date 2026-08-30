"use client";

// Encerrar a sessão pela interface (UI-04, UI-05).
//
// `POST /api/auth/logout` já existe e é testado; até aqui nenhum .tsx o
// chamava. A mutação vai por `fetch`, então precisa do header CSRF
// (REQ-SEC-15) - é o que `headerCSRF()` monta a partir do cookie legível.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { headerCSRF } from "@/lib/security/csrf-client";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-wrap items-center gap-2">
      {falhou && (
        <span className="text-sm text-destructive" data-testid="erro-sair">
          Não foi possível sair. Tente novamente.
        </span>
      )}
      <Button type="button" variant="outline" size="sm" disabled={pendente} onClick={sair}>
        Sair
      </Button>
    </div>
  );
}
