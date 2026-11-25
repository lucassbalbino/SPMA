// Ciclo de vida do relatório Power BI no navegador (dashboard-powerbi,
// PBI-11 a PBI-14).
//
// Port do `dashboard.mjs` da rotina do cliente, com o SDK, o `fetch`, os
// timers e o relógio injetados: o Vitest do projeto roda em `node`, sem DOM,
// e assim a lógica é testada sem navegador. Quem injeta as dependências
// reais é `PainelPowerBi.tsx`.
//
// Monta o relatório no primeiro ingresso, troca o token nos seguintes sem
// recarregar, e se desmonta em qualquer falha ou ao `parar()`.
export const MENSAGEM_INDISPONIVEL = "Dashboard indisponível. Entre novamente ou tente mais tarde.";
export const MENSAGEM_FALHA_RELATORIO = "Falha ao exibir relatório";

/** Ingresso com menos que isso de validade não vale a pena montar. */
const VALIDADE_MINIMA_MS = 30_000;

/** Renova 2 min antes de vencer, ou na metade do que resta se for menos que 4 min. */
export function calcularEspera(restanteMs: number): number {
  return Math.max(1000, restanteMs - Math.min(120_000, restanteMs / 2));
}

export interface RelatorioEmbutido {
  on(evento: "error", fn: () => void): void;
  setAccessToken(token: string): Promise<unknown>;
}

export interface ConfigEmbed {
  type: "report";
  id: string;
  embedUrl: string;
  accessToken: string;
  tokenType: number;
  permissions: number;
}

export interface DependenciasPainel<E> {
  sdk: { embed(container: E, config: ConfigEmbed): RelatorioEmbutido; reset(container: E): void };
  models: { TokenType: { Embed: number }; Permissions: { Read: number } };
  buscar: typeof fetch;
  agendar: (fn: () => void, ms: number) => unknown;
  cancelar: (handle: unknown) => void;
  agora: () => number;
}

/** Inicia o painel e devolve a função que o desmonta (logout, navegação, fechamento). */
export function iniciarPainelPowerBi<E>(
  container: E,
  aoMudarStatus: (texto: string) => void,
  deps: DependenciasPainel<E>,
  endpoint = "/api/powerbi/embed",
): () => void {
  let timer: unknown;
  let relatorio: RelatorioEmbutido | undefined;
  let parado = false;
  const abortar = new AbortController();

  function parar() {
    parado = true;
    if (timer !== undefined) {
      deps.cancelar(timer);
    }
    abortar.abort();
    deps.sdk.reset(container);
  }

  async function atualizar() {
    try {
      const resposta = await deps.buscar(endpoint, {
        credentials: "same-origin",
        cache: "no-store",
        signal: abortar.signal,
      });
      if (!resposta.ok) {
        throw new Error("ingresso recusado");
      }

      const d = await resposta.json();
      if (parado) {
        return;
      }

      const restante = Date.parse(d.expiration) - deps.agora();
      if (!Number.isFinite(restante) || restante < VALIDADE_MINIMA_MS) {
        throw new Error("ingresso vencendo");
      }

      if (relatorio) {
        await relatorio.setAccessToken(d.embedToken);
      } else {
        relatorio = deps.sdk.embed(container, {
          type: "report",
          id: d.reportId,
          embedUrl: d.embedUrl,
          accessToken: d.embedToken,
          tokenType: deps.models.TokenType.Embed,
          permissions: deps.models.Permissions.Read,
        });
        relatorio.on("error", () => {
          if (!parado) {
            aoMudarStatus(MENSAGEM_FALHA_RELATORIO);
          }
        });
      }

      if (parado) {
        return;
      }
      aoMudarStatus("");
      timer = deps.agendar(atualizar, calcularEspera(restante));
    } catch {
      if (!parado) {
        parar();
        aoMudarStatus(MENSAGEM_INDISPONIVEL);
      }
    }
  }

  void atualizar();
  return parar;
}
