// Testes unitários das guardas de rota (REQ-AU-02, REQ-AU-09, REQ-SEC-14).
// `session.ts` e `next/navigation` são mockados: aqui só interessa qual
// desvio cada guarda dispara, não o acesso ao banco.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requireOfertanteVinculado,
  requirePrimeiroAcessoConcluido,
  requireSession,
} from "./guards";
import { obterSessao, type SessaoComUsuario } from "./session";
import { redirect } from "next/navigation";

// O `redirect` real do Next interrompe a execução lançando; o mock imita
// isso para que o fluxo testado seja o mesmo de produção.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("./session", () => ({
  obterSessao: vi.fn(),
}));

const sessaoValida = {
  usuario: { cpf: "52998224725", tipo: "AM", primeiraVez: false, cdOfertante: null },
  sessao: { id: "sessao-1" },
} as unknown as SessaoComUsuario;

describe("requireSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona para /login quando não há sessão válida", async () => {
    vi.mocked(obterSessao).mockResolvedValue(null);

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("devolve a sessão e não redireciona quando a sessão é válida", async () => {
    vi.mocked(obterSessao).mockResolvedValue(sessaoValida);

    const resultado = await requireSession();

    expect(resultado).toBe(sessaoValida);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("requirePrimeiroAcessoConcluido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona para /primeiro-acesso quando primeiraVez é true", () => {
    expect(() => requirePrimeiroAcessoConcluido({ primeiraVez: true })).toThrow(
      "NEXT_REDIRECT:/primeiro-acesso",
    );
    expect(redirect).toHaveBeenCalledWith("/primeiro-acesso");
  });

  it("não redireciona quando primeiraVez é false", () => {
    requirePrimeiroAcessoConcluido({ primeiraVez: false });

    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("requireOfertanteVinculado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona para /cadastro-ofertante quando GO está sem cdOfertante", () => {
    expect(() =>
      requireOfertanteVinculado({ tipo: "GO", cdOfertante: null }),
    ).toThrow("NEXT_REDIRECT:/cadastro-ofertante");
    expect(redirect).toHaveBeenCalledWith("/cadastro-ofertante");
  });

  it("não redireciona quando GO já tem cdOfertante", () => {
    requireOfertanteVinculado({ tipo: "GO", cdOfertante: 7 });

    expect(redirect).not.toHaveBeenCalled();
  });

  // AD-012: AL tem escopo pelo curso, não pelo Ofertante - cdOfertante nulo
  // é o estado normal dele e não pode prendê-lo no cadastro de Ofertante.
  it("não redireciona perfil não-GO sem cdOfertante", () => {
    requireOfertanteVinculado({ tipo: "AL", cdOfertante: null });

    expect(redirect).not.toHaveBeenCalled();
  });
});
