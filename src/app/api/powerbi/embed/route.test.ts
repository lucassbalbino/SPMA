// GET /api/powerbi/embed (dashboard-powerbi). Sessão e serviço simulados:
// a rota é testada pelo que decide (status, corpo, quem recebe qual
// relatório e identidade), sem banco e sem Microsoft.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TipoUsuario } from "@/generated/prisma/enums";
import { erroHttp } from "@/lib/api/erro-http";

const exigirSessao = vi.hoisted(() => vi.fn());
const obterServicoPowerBi = vi.hoisted(() => vi.fn());
const gerarEmbed = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/guardas", () => ({ exigirSessao }));
vi.mock("@/lib/powerbi/servico", async () => {
  const real = await vi.importActual<typeof import("@/lib/powerbi/servico")>(
    "@/lib/powerbi/servico",
  );
  return { ...real, obterServicoPowerBi };
});

import { ErroMicrosoft } from "@/lib/powerbi/servico";
import { GET } from "./route";

const CPF = "01234567890";
const CNPJ_GO = "11222333000181";
const SEGREDO = "segredo-de-teste~nao-real";
const NACIONAL = { reportId: "rel-nacional", embedUrl: "https://app.powerbi.com/reportEmbed?reportId=rel-nacional" };
const OFERTANTE = { reportId: "rel-ofertante", embedUrl: "https://app.powerbi.com/reportEmbed?reportId=rel-ofertante" };
const EXPIRACAO = "2026-11-25T15:00:00Z";

let sequencia = 0;

/** Cada teste tem a própria sessão, para o limitador de um não vazar no outro. */
function logado(tipo: TipoUsuario, documento = CPF, cdOfertante: string | null = null) {
  const sessaoId = `sessao-${++sequencia}`;
  exigirSessao.mockResolvedValue({
    usuario: { tipo, documento, cdOfertante, senhaHash: "hash" },
    sessao: { id: sessaoId },
  });
  return sessaoId;
}

// O Next entrega o `Request` a todo route handler; esta rota não o declara
// porque não lê nada dele (PBI-05). O cast simula a chamada real do Next.
const handler = GET as unknown as (request: Request) => Promise<Response>;
const pedir = (query = "") => handler(new Request(`http://localhost/api/powerbi/embed${query}`));

let logs: unknown[][];

beforeEach(() => {
  logs = [];
  for (const nivel of ["log", "info", "warn", "error"] as const) {
    vi.spyOn(console, nivel).mockImplementation((...args: unknown[]) => void logs.push(args));
  }
  obterServicoPowerBi.mockReturnValue({
    ok: true,
    servico: { gerarEmbed },
    config: { clientSecret: SEGREDO, relatorios: { nacional: NACIONAL, ofertante: OFERTANTE } },
  });
  gerarEmbed.mockImplementation(async ({ relatorio, username }) => ({
    reportId: relatorio.reportId,
    embedUrl: relatorio.embedUrl,
    embedToken: `embed-para-${username}`,
    expiration: EXPIRACAO,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  exigirSessao.mockReset();
  obterServicoPowerBi.mockReset();
  gerarEmbed.mockReset();
});

const textoDosLogs = () => JSON.stringify(logs);

describe("recusas antes da Microsoft", () => {
  it("sem sessão → 401 Não autenticado (PBI-07)", async () => {
    exigirSessao.mockRejectedValue(erroHttp(401, "Não autenticado"));

    const resposta = await pedir();

    expect(resposta.status).toBe(401);
    expect(await resposta.json()).toEqual({ erro: "Não autenticado" });
    expect(gerarEmbed).not.toHaveBeenCalled();
  });

  it("AL → 403 Acesso negado (PBI-08)", async () => {
    logado("AL");

    const resposta = await pedir();

    expect(resposta.status).toBe(403);
    expect(await resposta.json()).toEqual({ erro: "Acesso negado" });
    expect(gerarEmbed).not.toHaveBeenCalled();
  });

  it("VO sem GO vinculado → 403 Acesso negado (PBI-09)", async () => {
    logado("VO", CPF, null);

    const resposta = await pedir();

    expect(resposta.status).toBe(403);
    expect(await resposta.json()).toEqual({ erro: "Acesso negado" });
    expect(gerarEmbed).not.toHaveBeenCalled();
  });

  it("21º pedido da mesma sessão em 60 s → 429 (PBI-20)", async () => {
    logado("GT");
    for (let i = 0; i < 20; i++) {
      expect((await pedir()).status).toBe(200);
    }

    const resposta = await pedir();

    expect(resposta.status).toBe(429);
    expect(await resposta.json()).toEqual({
      erro: "Muitas requisições. Tente novamente em instantes.",
    });
    expect(gerarEmbed).toHaveBeenCalledTimes(20);
  });

  it.each([
    ["ausente", "SPMA_TENANT_ID"],
    ["invalida", "SPMA_EMBED_URL"],
  ] as const)("config %s → 503 Dashboard não configurado, log com o nome da variável (PBI-15)", async (motivo, variavel) => {
    logado("GT");
    obterServicoPowerBi.mockReturnValue({ ok: false, motivo, variavel });

    const resposta = await pedir();

    expect(resposta.status).toBe(503);
    expect(await resposta.json()).toEqual({ erro: "Dashboard não configurado" });
    expect(textoDosLogs()).toContain(variavel);
    expect(gerarEmbed).not.toHaveBeenCalled();
  });
});

describe("falha da Microsoft (PBI-16, PBI-22)", () => {
  it.each([403, 503, null])("ErroMicrosoft(%s) → 502 sem detalhe", async (status) => {
    logado("GT");
    gerarEmbed.mockRejectedValue(new ErroMicrosoft(status));

    const resposta = await pedir();

    expect(resposta.status).toBe(502);
    expect(await resposta.json()).toEqual({ erro: "Dashboard temporariamente indisponível" });
  });

  it("o log da falha tem id de correlação e status, sem documento nem segredo", async () => {
    logado("VT");
    gerarEmbed.mockRejectedValue(new ErroMicrosoft(429));

    await pedir();

    const erro = logs.find((args) => args.includes("powerbi.embed falhou"));
    expect(erro).toBeDefined();
    expect(erro?.[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(erro).toContain(429);
    expect(textoDosLogs()).not.toContain(CPF);
    expect(textoDosLogs()).not.toContain(SEGREDO);
  });
});

describe("200 por perfil (PBI-02, PBI-03)", () => {
  it.each([
    ["AM", CPF, null, NACIONAL, CPF],
    ["GT", CPF, null, NACIONAL, CPF],
    ["VT", CPF, null, NACIONAL, CPF],
    ["GO", CNPJ_GO, null, OFERTANTE, CNPJ_GO],
    ["VO", CPF, CNPJ_GO, OFERTANTE, CNPJ_GO],
  ] as const)(
    "%s recebe o relatório do próprio painel, com a identidade certa",
    async (tipo, documento, cdOfertante, relatorio, username) => {
      logado(tipo, documento, cdOfertante);

      const resposta = await pedir();

      expect(resposta.status).toBe(200);
      expect(resposta.headers.get("cache-control")).toBe("no-store");
      const corpo = await resposta.json();
      expect(Object.keys(corpo).sort()).toEqual(["embedToken", "embedUrl", "expiration", "reportId"]);
      expect(corpo.reportId).toBe(relatorio.reportId);
      expect(corpo.embedUrl).toBe(relatorio.embedUrl);
      expect(corpo.embedToken).toBe(`embed-para-${username}`);
      expect(corpo.expiration).toBe(EXPIRACAO);
      expect(gerarEmbed).toHaveBeenCalledWith({ relatorio, username, role: "segurança_SPMA" });
    },
  );
});

describe("a identidade vem só da sessão (PBI-05)", () => {
  it("query com documento, reportId e username não muda a chamada ao serviço", async () => {
    logado("GO", CNPJ_GO);
    await pedir();
    const semQuery = gerarEmbed.mock.calls[0];

    logado("GO", CNPJ_GO);
    await pedir("?documento=52998224725&reportId=rel-nacional&username=52998224725");
    const comQuery = gerarEmbed.mock.calls[1];

    expect(comQuery).toEqual(semQuery);
  });
});

describe("log de sucesso (PBI-22, PBI-23)", () => {
  it("registra perfil e painel, sem documento, token nem segredo", async () => {
    logado("VO", CPF, CNPJ_GO);

    await pedir();

    expect(logs).toContainEqual(["powerbi.embed emitido", { perfil: "VO", painel: "ofertante" }]);
    const texto = textoDosLogs();
    expect(texto).not.toContain(CPF);
    expect(texto).not.toContain(CNPJ_GO);
    expect(texto).not.toContain("embed-para-");
    expect(texto).not.toContain(SEGREDO);
  });
});
