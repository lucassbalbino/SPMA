import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConfiguracaoPowerBi } from "./configuracao";
import { ErroMicrosoft, criarServicoPowerBi, obterServicoPowerBi } from "./servico";

const TENANT = "11111111-1111-1111-1111-111111111111";
const CLIENT = "22222222-2222-2222-2222-222222222222";
const DATASET = "33333333-3333-3333-3333-333333333333";
const REPORT = "44444444-4444-4444-4444-444444444444";
const SEGREDO = "segredo-de-teste~nao-real";
const URL_EMBED = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}`;
const RELATORIO = { reportId: REPORT, embedUrl: URL_EMBED };
const ROLE = "segurança_SPMA";

const CONFIG: ConfiguracaoPowerBi = {
  tenantId: TENANT,
  clientId: CLIENT,
  clientSecret: SEGREDO,
  datasetId: DATASET,
  relatorios: { nacional: RELATORIO, ofertante: RELATORIO },
};

const EXPIRACAO = "2026-11-25T15:00:00Z";
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Resposta = { status: number; corpo?: unknown; retryAfter?: string };

/**
 * Microsoft simulada. `entra(n)` e `gerar(n, corpo)` decidem a n-ésima
 * resposta de cada endpoint; o padrão é sucesso, com o embed token
 * carregando o `username` pedido para provar que nenhum token se troca.
 */
function microsoft(
  opcoes: {
    entra?: (n: number) => Resposta;
    gerar?: (n: number, corpo: GenerateTokenBody) => Resposta;
    latenciaMs?: number;
  } = {},
) {
  const chamadas = { entra: 0, gerar: 0, corposEntra: [] as URLSearchParams[], urlsEntra: [] as string[] };
  const corpos: GenerateTokenBody[] = [];
  const autorizacoes: string[] = [];

  const http = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const endereco = String(url);
    if (opcoes.latenciaMs) {
      await dormir(opcoes.latenciaMs);
    }

    let r: Resposta;
    if (endereco.startsWith("https://login.microsoftonline.com/")) {
      chamadas.entra++;
      chamadas.urlsEntra.push(endereco);
      chamadas.corposEntra.push(new URLSearchParams(String(init?.body)));
      r = opcoes.entra?.(chamadas.entra) ?? {
        status: 200,
        corpo: { access_token: `aad-${chamadas.entra}`, expires_in: 3600 },
      };
    } else {
      chamadas.gerar++;
      const corpo = JSON.parse(String(init?.body)) as GenerateTokenBody;
      corpos.push(corpo);
      autorizacoes.push(String((init?.headers as Record<string, string>).Authorization));
      r = opcoes.gerar?.(chamadas.gerar, corpo) ?? {
        status: 200,
        corpo: { token: `embed-para-${corpo.identities[0].username}`, expiration: EXPIRACAO },
      };
    }

    return new Response(r.corpo === undefined ? "" : JSON.stringify(r.corpo), {
      status: r.status,
      headers: r.retryAfter === undefined ? {} : { "Retry-After": r.retryAfter },
    });
  });

  return { http: http as unknown as typeof fetch, chamadas, corpos, autorizacoes, mock: http };
}

interface GenerateTokenBody {
  datasets: { id: string }[];
  reports: { id: string; allowEdit: boolean }[];
  identities: { username: string; roles: string[]; datasets: string[] }[];
}

const pedido = (username: string) => ({ relatorio: RELATORIO, username, role: ROLE });
const documentos = (n: number) => Array.from({ length: n }, (_, i) => String(i).padStart(11, "0"));

async function falha(promessa: Promise<unknown>): Promise<unknown> {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("era esperada uma rejeição");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GenerateToken (PBI-04)", () => {
  it("pede só leitura, com o relatório, o dataset, a identidade e a role", async () => {
    const ms = microsoft();
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });

    await servico.gerarEmbed(pedido("01234567890"));

    expect(ms.corpos[0]).toEqual({
      datasets: [{ id: DATASET }],
      reports: [{ id: REPORT, allowEdit: false }],
      identities: [{ username: "01234567890", roles: ["segurança_SPMA"], datasets: [DATASET] }],
    });
    expect(ms.autorizacoes[0]).toBe("Bearer aad-1");
  });

  it("pede o token do Entra com client credentials no escopo do Power BI", async () => {
    const ms = microsoft();
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });

    await servico.gerarEmbed(pedido("52998224725"));

    expect(ms.chamadas.urlsEntra[0]).toBe(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    );
    const corpo = ms.chamadas.corposEntra[0];
    expect(corpo.get("grant_type")).toBe("client_credentials");
    expect(corpo.get("scope")).toBe("https://analysis.windows.net/powerbi/api/.default");
    expect(corpo.get("client_id")).toBe(CLIENT);
    expect(corpo.get("client_secret")).toBe(SEGREDO);
  });

  it("devolve exatamente reportId, embedUrl, embedToken e expiration (PBI-23)", async () => {
    const ms = microsoft();
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });

    const embed = await servico.gerarEmbed(pedido("52998224725"));

    expect(embed).toEqual({
      reportId: REPORT,
      embedUrl: URL_EMBED,
      embedToken: "embed-para-52998224725",
      expiration: EXPIRACAO,
    });
    expect(JSON.stringify(embed)).not.toContain("aad-1");
    expect(JSON.stringify(embed)).not.toContain(SEGREDO);
  });
});

describe("concorrência e cache do Entra (PBI-18, PBI-19)", () => {
  it("200 pedidos simultâneos com cache frio: 1 Entra, 200 GenerateToken, nenhum token trocado", async () => {
    const ms = microsoft({ latenciaMs: 5 });
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });
    const lista = documentos(200);

    const embeds = await Promise.all(lista.map((d) => servico.gerarEmbed(pedido(d))));

    expect(ms.chamadas.entra).toBe(1);
    expect(ms.chamadas.gerar).toBe(200);
    embeds.forEach((embed, i) => expect(embed.embedToken).toBe(`embed-para-${lista[i]}`));
  });

  it("cada pedido gera o próprio embed token, mesmo para o mesmo usuário (PBI-19)", async () => {
    const ms = microsoft({
      gerar: (n) => ({ status: 200, corpo: { token: `embed-${n}`, expiration: EXPIRACAO } }),
    });
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });

    const a = await servico.gerarEmbed(pedido("52998224725"));
    const b = await servico.gerarEmbed(pedido("52998224725"));

    expect(ms.chamadas.gerar).toBe(2);
    expect(a.embedToken).toBe("embed-1");
    expect(b.embedToken).toBe("embed-2");
  });

  it("reaproveita o token do Entra até 120 s antes de vencer", async () => {
    const ms = microsoft();
    let agora = 0;
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http, agora: () => agora });

    await servico.gerarEmbed(pedido("1"));
    agora = 3_600_000 - 120_000 - 1;
    await servico.gerarEmbed(pedido("2"));
    expect(ms.chamadas.entra).toBe(1);

    agora = 3_600_000 - 120_000;
    await servico.gerarEmbed(pedido("3"));
    expect(ms.chamadas.entra).toBe(2);
    expect(ms.autorizacoes).toEqual(["Bearer aad-1", "Bearer aad-1", "Bearer aad-2"]);
  });

  it("token do Entra vencido no meio de uma rajada: 1 renovação para os 100 (edge case)", async () => {
    const ms = microsoft({ latenciaMs: 5 });
    let agora = 0;
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http, agora: () => agora });
    await servico.gerarEmbed(pedido("00000000000"));

    agora = 4_000_000;
    const lista = documentos(100);
    const embeds = await Promise.all(lista.map((d) => servico.gerarEmbed(pedido(d))));

    expect(ms.chamadas.entra).toBe(2);
    embeds.forEach((embed, i) => expect(embed.embedToken).toBe(`embed-para-${lista[i]}`));
  });

  it("Entra falha com 50 esperando: os 50 rejeitam e o pedido seguinte tenta de novo (edge case)", async () => {
    const ms = microsoft({
      latenciaMs: 5,
      entra: (n) =>
        n === 1
          ? { status: 400 }
          : { status: 200, corpo: { access_token: `aad-${n}`, expires_in: 3600 } },
    });
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });

    const resultados = await Promise.allSettled(
      documentos(50).map((d) => servico.gerarEmbed(pedido(d))),
    );

    expect(ms.chamadas.entra).toBe(1);
    expect(resultados.every((r) => r.status === "rejected" && r.reason instanceof ErroMicrosoft)).toBe(
      true,
    );

    const depois = await servico.gerarEmbed(pedido("99999999999"));
    expect(ms.chamadas.entra).toBe(2);
    expect(depois.embedToken).toBe("embed-para-99999999999");
  });
});

describe("nova tentativa em 429/503 (PBI-17)", () => {
  it.each([
    ["2", 2000],
    ["30", 5000],
    [undefined, 1000],
    ["abc", 1000],
  ])("Retry-After %s → espera %i ms e tenta uma vez mais", async (retryAfter, esperaMs) => {
    const ms = microsoft({
      gerar: (n, corpo) =>
        n === 1
          ? { status: 429, retryAfter }
          : { status: 200, corpo: { token: `embed-para-${corpo.identities[0].username}`, expiration: EXPIRACAO } },
    });
    const esperas: number[] = [];
    const servico = criarServicoPowerBi(CONFIG, {
      http: ms.http,
      esperar: async (ms) => void esperas.push(ms),
    });

    const embed = await servico.gerarEmbed(pedido("52998224725"));

    expect(esperas).toEqual([esperaMs]);
    expect(ms.chamadas.gerar).toBe(2);
    expect(embed.embedToken).toBe("embed-para-52998224725");
  });

  it("503 no Entra também tenta uma vez mais", async () => {
    const ms = microsoft({
      entra: (n) =>
        n === 1
          ? { status: 503 }
          : { status: 200, corpo: { access_token: "aad-2", expires_in: 3600 } },
    });
    const esperas: number[] = [];
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http, esperar: async (ms) => void esperas.push(ms) });

    await servico.gerarEmbed(pedido("52998224725"));

    expect(ms.chamadas.entra).toBe(2);
    expect(esperas).toEqual([1000]);
  });

  it("segunda falha seguida rejeita com o status", async () => {
    const ms = microsoft({ gerar: () => ({ status: 503 }) });
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http, esperar: async () => {} });

    const erro = await falha(servico.gerarEmbed(pedido("52998224725")));

    expect(erro).toBeInstanceOf(ErroMicrosoft);
    expect((erro as ErroMicrosoft).status).toBe(503);
    expect(ms.chamadas.gerar).toBe(2);
  });

  it("403 não tenta de novo", async () => {
    const ms = microsoft({ gerar: () => ({ status: 403 }) });
    const esperas: number[] = [];
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http, esperar: async (ms) => void esperas.push(ms) });

    const erro = await falha(servico.gerarEmbed(pedido("52998224725")));

    expect((erro as ErroMicrosoft).status).toBe(403);
    expect(ms.chamadas.gerar).toBe(1);
    expect(esperas).toEqual([]);
  });
});

describe("falhas da Microsoft (PBI-16, PBI-23)", () => {
  it("cada chamada leva um timeout de 10 000 ms", async () => {
    const espiao = vi.spyOn(AbortSignal, "timeout");
    const ms = microsoft();
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });

    await servico.gerarEmbed(pedido("52998224725"));

    expect(espiao.mock.calls).toEqual([[10_000], [10_000]]);
    for (const [, init] of ms.mock.mock.calls) {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("timeout ou rede caída → ErroMicrosoft sem status", async () => {
    const http = vi.fn(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    }) as unknown as typeof fetch;
    const servico = criarServicoPowerBi(CONFIG, { http });

    const erro = await falha(servico.gerarEmbed(pedido("52998224725")));

    expect(erro).toBeInstanceOf(ErroMicrosoft);
    expect((erro as ErroMicrosoft).status).toBeNull();
  });

  it.each([
    ["sem token", { expiration: EXPIRACAO }],
    ["com expiration inválida", { token: "embed", expiration: "amanhã" }],
    ["vazia", {}],
  ])("GenerateToken %s → ErroMicrosoft", async (_caso, corpo) => {
    const ms = microsoft({ gerar: () => ({ status: 200, corpo }) });
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });

    expect(await falha(servico.gerarEmbed(pedido("52998224725")))).toBeInstanceOf(ErroMicrosoft);
  });

  it("Entra sem access_token → ErroMicrosoft", async () => {
    const ms = microsoft({ entra: () => ({ status: 200, corpo: { expires_in: 3600 } }) });
    const servico = criarServicoPowerBi(CONFIG, { http: ms.http });

    expect(await falha(servico.gerarEmbed(pedido("52998224725")))).toBeInstanceOf(ErroMicrosoft);
  });

  it("nenhum erro carrega o segredo nem o token do Entra", async () => {
    const cenarios = [
      microsoft({ entra: () => ({ status: 401, corpo: { error: SEGREDO } }) }),
      microsoft({ gerar: () => ({ status: 400, corpo: { error: "aad-1" } }) }),
      microsoft({ gerar: () => ({ status: 200, corpo: { aviso: "aad-1" } }) }),
    ];

    for (const ms of cenarios) {
      const servico = criarServicoPowerBi(CONFIG, { http: ms.http, esperar: async () => {} });
      const erro = (await falha(servico.gerarEmbed(pedido("52998224725")))) as Error;
      const texto = `${erro.message} ${erro.stack ?? ""} ${JSON.stringify(erro)}`;
      expect(texto).not.toContain(SEGREDO);
      expect(texto).not.toContain("aad-1");
    }
  });
});

describe("obterServicoPowerBi", () => {
  const envValido = {
    SPMA_TENANT_ID: TENANT,
    SPMA_CLIENT_ID: CLIENT,
    SPMA_CLIENT_SECRET: SEGREDO,
    SPMA_DATASET_ID: DATASET,
    SPMA_REPORT_ID: REPORT,
    SPMA_EMBED_URL: URL_EMBED,
  };

  it("sem configuração devolve a falha da leitura, sem lançar", () => {
    expect(obterServicoPowerBi({})).toEqual({
      ok: false,
      motivo: "ausente",
      variavel: "SPMA_TENANT_ID",
    });
  });

  it("com configuração devolve sempre a mesma instância (cache do Entra preservado)", () => {
    const a = obterServicoPowerBi(envValido);
    const b = obterServicoPowerBi({ ...envValido });

    expect(a.ok && b.ok).toBe(true);
    expect(a.ok && b.ok && a.servico === b.servico).toBe(true);
    expect(a.ok && a.config.datasetId).toBe(DATASET);
  });
});
