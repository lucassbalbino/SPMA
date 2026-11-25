"use client";

// O relatório Power BI embutido (dashboard-powerbi, PBI-01, PBI-11 a PBI-14).
//
// Só liga as dependências reais ao controlador de `lib/powerbi/painel-cliente`,
// que tem a lógica (montar, renovar, desmontar) e os testes. O SDK é
// importado DENTRO do efeito: `powerbi-client` grava em `window` assim que é
// carregado e quebraria a renderização no servidor.
//
// Não recebe props: nenhum dado do usuário passa por aqui. A identidade sai
// da sessão, no servidor (PBI-05). O iframe ganha o tamanho por
// `element.style` (CSSOM), que a CSP por nonce permite; nada de `style=`.
import { useEffect, useRef, useState } from "react";
import { MENSAGEM_INDISPONIVEL, iniciarPainelPowerBi } from "@/lib/powerbi/painel-cliente";

export function PainelPowerBi() {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const elemento = container.current;
    if (!elemento) {
      return;
    }

    let parar: (() => void) | undefined;
    let desmontado = false;

    import("powerbi-client")
      .then((pbi) => {
        if (desmontado) {
          return;
        }
        const sdk = new pbi.service.Service(
          pbi.factories.hpmFactory,
          pbi.factories.wpmpFactory,
          pbi.factories.routerFactory,
        );
        parar = iniciarPainelPowerBi(elemento, setStatus, {
          sdk: {
            embed: (el, config) => sdk.embed(el, config),
            reset: (el) => sdk.reset(el),
          },
          models: pbi.models,
          buscar: (entrada, init) => fetch(entrada, init),
          agendar: (fn, ms) => window.setTimeout(fn, ms),
          cancelar: (handle) => window.clearTimeout(handle as number),
          agora: () => Date.now(),
        });
      })
      .catch(() => {
        if (!desmontado) {
          setStatus(MENSAGEM_INDISPONIVEL);
        }
      });

    // Desmontar (navegação, logout, fechar a aba) tira o relatório e o token da página (PBI-13).
    return () => {
      desmontado = true;
      parar?.();
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={container}
        data-testid="relatorio-powerbi"
        className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-spma-surface"
      />
      <p role="status" data-testid="relatorio-status" className="text-spma-body-md text-destructive">
        {status}
      </p>
    </div>
  );
}
