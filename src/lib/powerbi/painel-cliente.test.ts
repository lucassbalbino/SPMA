import { describe, expect, it, vi } from "vitest";
import {
  MENSAGEM_FALHA_RELATORIO,
  MENSAGEM_INDISPONIVEL,
  calcularEspera,
  iniciarPainelPowerBi,
  type DependenciasPainel,
} from "./painel-cliente";

const EXPIRACAO = "2026-11-25T15:00:00Z";
const AGORA_1H_ANTES = Date.parse(EXPIRACAO) - 3_600_000;
const CONTAINER = { id: "container-falso" };

const ingresso = (token: string, expiration = EXPIRACAO) =>
  new Response(
    JSON.stringify({ reportId: "rel-1", embedUrl: "https://app.powerbi.com/reportEmbed?reportId=rel-1", embedToken: token, expiration }),
    { status: 200 },
  );

/** Promessa controlada pelo teste, para simular resposta que chega depois. */
function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => (resolver = r));
  return { promessa, resolver };
}

const tarefas = () => new Promise((r) => setTimeout(r, 0));

function cenario(respostas: Array<Response | Promise<Response> | Error>, agora = AGORA_1H_ANTES) {
  const status: string[] = [];
  const agendados: { fn: () => void; ms: number; handle: number }[] = [];
  const cancelados: unknown[] = [];
  const inits: RequestInit[] = [];
  const relatorio = {
    aoErro: undefined as undefined | (() => void),
    on: vi.fn((evento: string, fn: () => void) => {
      if (evento === "error") relatorio.aoErro = fn;
    }),
    setAccessToken: vi.fn(async () => {}),
  };
  const sdk = { embed: vi.fn(() => relatorio), reset: vi.fn() };

  let i = 0;
  const deps: DependenciasPainel<typeof CONTAINER> = {
    sdk,
    models: { TokenType: { Embed: 7 }, Permissions: { Read: 9 } },
    buscar: vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      inits.push(init ?? {});
      const r = respostas[i++];
      if (r instanceof Error) throw r;
      return r;
    }) as unknown as typeof fetch,
    agendar: (fn, ms) => {
      const handle = agendados.length + 1;
      agendados.push({ fn, ms, handle });
      return handle;
    },
    cancelar: (h) => void cancelados.push(h),
    agora: () => agora,
  };

  const parar = iniciarPainelPowerBi(CONTAINER, (t) => void status.push(t), deps);
  return { parar, status, agendados, cancelados, inits, sdk, relatorio, deps };
}

describe("calcularEspera (PBI-11)", () => {
  it.each([
    [3_600_000, 3_480_000],
    [180_000, 90_000],
    [40_000, 20_000],
    [1_500, 1_000],
  ])("restante %i ms → próximo pedido em %i ms", (restante, espera) => {
    expect(calcularEspera(restante)).toBe(espera);
  });
});

describe("montagem e renovação (PBI-11)", () => {
  it("o primeiro ingresso monta o relatório uma vez, só leitura, com o token de embed", async () => {
    const c = cenario([ingresso("token-1")]);
    await tarefas();

    expect(c.sdk.embed).toHaveBeenCalledTimes(1);
    expect(c.sdk.embed).toHaveBeenCalledWith(CONTAINER, {
      type: "report",
      id: "rel-1",
      embedUrl: "https://app.powerbi.com/reportEmbed?reportId=rel-1",
      accessToken: "token-1",
      tokenType: 7,
      permissions: 9,
    });
    expect(c.status).toEqual([""]);
  });

  it("agenda o próximo pedido com calcularEspera(restante)", async () => {
    const c = cenario([ingresso("token-1")]);
    await tarefas();

    expect(c.agendados.map((a) => a.ms)).toEqual([3_480_000]);
  });

  it("o ingresso renovado entra por setAccessToken, sem montar de novo", async () => {
    const c = cenario([ingresso("token-1"), ingresso("token-2")]);
    await tarefas();

    c.agendados[0].fn();
    await tarefas();

    expect(c.sdk.embed).toHaveBeenCalledTimes(1);
    expect(c.relatorio.setAccessToken).toHaveBeenCalledWith("token-2");
    expect(c.agendados).toHaveLength(2);
  });

  it("pede com a sessão da mesma origem e sem cache", async () => {
    const c = cenario([ingresso("token-1")]);
    await tarefas();

    expect(c.deps.buscar).toHaveBeenCalledWith("/api/powerbi/embed", expect.anything());
    expect(c.inits[0].credentials).toBe("same-origin");
    expect(c.inits[0].cache).toBe("no-store");
  });
});

describe("falhas (PBI-12)", () => {
  it.each([401, 403, 429, 502, 503])("status %i → remove o relatório e avisa", async (codigo) => {
    const c = cenario([new Response("{}", { status: codigo })]);
    await tarefas();

    expect(c.sdk.reset).toHaveBeenCalledWith(CONTAINER);
    expect(c.sdk.embed).not.toHaveBeenCalled();
    expect(c.status).toEqual([MENSAGEM_INDISPONIVEL]);
  });

  it("erro de rede → remove o relatório e avisa", async () => {
    const c = cenario([new TypeError("Failed to fetch")]);
    await tarefas();

    expect(c.sdk.reset).toHaveBeenCalledWith(CONTAINER);
    expect(c.status).toEqual([MENSAGEM_INDISPONIVEL]);
  });

  it("ingresso com menos de 30 000 ms de validade → remove e avisa, sem montar", async () => {
    const c = cenario([ingresso("token-1")], Date.parse(EXPIRACAO) - 29_999);
    await tarefas();

    expect(c.sdk.embed).not.toHaveBeenCalled();
    expect(c.sdk.reset).toHaveBeenCalledWith(CONTAINER);
    expect(c.status).toEqual([MENSAGEM_INDISPONIVEL]);
  });

  it("ingresso com exatamente 30 000 ms de validade ainda é montado (fronteira)", async () => {
    const c = cenario([ingresso("token-1")], Date.parse(EXPIRACAO) - 30_000);
    await tarefas();

    expect(c.sdk.embed).toHaveBeenCalledTimes(1);
    expect(c.sdk.reset).not.toHaveBeenCalled();
    expect(c.status).toEqual([""]);
  });

  it("sessão vencida na renovação (401) → remove o relatório já montado e avisa (edge case)", async () => {
    const c = cenario([ingresso("token-1"), new Response("{}", { status: 401 })]);
    await tarefas();

    c.agendados[0].fn();
    await tarefas();

    expect(c.sdk.reset).toHaveBeenCalledWith(CONTAINER);
    expect(c.status).toEqual(["", MENSAGEM_INDISPONIVEL]);
  });
});

describe("parar (PBI-13)", () => {
  it("remove o relatório, cancela a renovação e aborta o pedido", async () => {
    const c = cenario([ingresso("token-1")]);
    await tarefas();

    c.parar();

    expect(c.sdk.reset).toHaveBeenCalledWith(CONTAINER);
    expect(c.cancelados).toEqual([c.agendados[0].handle]);
    expect(c.inits[0].signal?.aborted).toBe(true);
  });

  // O caminho real: o `fetch` do navegador rejeita com AbortError quando o
  // sinal é abortado. Desmontar não pode virar "indisponível" nem um segundo reset.
  it("fetch abortado pelo parar não avisa nem remove de novo", async () => {
    const status: string[] = [];
    const sdk = { embed: vi.fn(), reset: vi.fn() };
    const parar = iniciarPainelPowerBi(CONTAINER, (t) => void status.push(t), {
      sdk,
      models: { TokenType: { Embed: 7 }, Permissions: { Read: 9 } },
      buscar: ((_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, rejeitar) => {
          init?.signal?.addEventListener("abort", () =>
            rejeitar(new DOMException("The operation was aborted.", "AbortError")),
          );
        })) as typeof fetch,
      agendar: () => 1,
      cancelar: () => {},
      agora: () => AGORA_1H_ANTES,
    });

    parar();
    await tarefas();

    expect(status).toEqual([]);
    expect(sdk.reset).toHaveBeenCalledTimes(1);
    expect(sdk.embed).not.toHaveBeenCalled();
  });

  it("resposta que chega depois de parar não monta o relatório nem muda o status", async () => {
    const atrasada = adiada<Response>();
    const c = cenario([atrasada.promessa]);

    c.parar();
    atrasada.resolver(ingresso("token-1"));
    await tarefas();

    expect(c.sdk.embed).not.toHaveBeenCalled();
    expect(c.status).toEqual([]);
    expect(c.agendados).toEqual([]);
  });
});

describe("erro do relatório (PBI-14)", () => {
  it("o evento error avisa com a mensagem de falha", async () => {
    const c = cenario([ingresso("token-1")]);
    await tarefas();

    c.relatorio.aoErro?.();

    expect(c.status).toEqual(["", MENSAGEM_FALHA_RELATORIO]);
  });

  it("depois de parar, o evento error não muda mais nada", async () => {
    const c = cenario([ingresso("token-1")]);
    await tarefas();

    c.parar();
    c.relatorio.aoErro?.();

    expect(c.status).toEqual([""]);
  });
});

describe("mensagens (PBI-12, PBI-14)", () => {
  it("são as do manual do cliente", () => {
    expect(MENSAGEM_INDISPONIVEL).toBe("Dashboard indisponível. Entre novamente ou tente mais tarde.");
    expect(MENSAGEM_FALHA_RELATORIO).toBe("Falha ao exibir relatório");
  });
});
