// Testes unitários do wrapper de erro genérico (REQ-SEC-11 / CA-SEC-11) com
// log mascarado de CPF (REQ-SEC-12 / CA-SEC-12).
import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { comTratamentoDeErro } from "./api-error";

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("comTratamentoDeErro", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("captura exceção não tratada e devolve 500 genérico com idCorrelacao, nunca a mensagem original", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const handler = comTratamentoDeErro(
      async (_request: Request): Promise<Response> => {
        throw new Error("detalhe sensível interno do banco");
      },
    );

    const resposta = await handler(new Request("http://localhost/api/x"));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(500);
    expect(corpo.erro).toBe(
      "Erro interno. Contate o suporte informando o código.",
    );
    expect(corpo.idCorrelacao).toMatch(REGEX_UUID);
    expect(JSON.stringify(corpo)).not.toContain("detalhe sensível");
  });

  it("mascara qualquer CPF reconhecível no log de servidor, sem expor o CPF completo", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const handler = comTratamentoDeErro(
      async (_request: Request): Promise<Response> => {
        throw new Error("Usuario 52998224725 causou violação de unicidade");
      },
    );

    await handler(new Request("http://localhost/api/x"));

    expect(spy).toHaveBeenCalledTimes(1);
    const [idLogado, mensagemLogada] = spy.mock.calls[0] as [string, string];
    expect(idLogado).toMatch(REGEX_UUID);
    expect(mensagemLogada).toContain("529******25");
    expect(mensagemLogada).not.toContain("52998224725");
  });

  it("handler que responde normalmente (não lança) passa através sem alteração", async () => {
    const handler = comTratamentoDeErro(async (_request: Request) =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    const resposta = await handler(new Request("http://localhost/api/x"));

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ ok: true });
  });
});
