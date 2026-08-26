// Testes unitários das guardas de rota (REQ-AU-02, REQ-AU-09, REQ-SEC-14).
// `session.ts` e `next/navigation` são mockados: aqui só interessa qual
// desvio cada guarda dispara, não o acesso ao banco.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  podeAcessarOfertante,
  podeEditarOfertante,
  podeGerenciarPreCurso,
  podeGerenciarVerba,
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

describe("podeAcessarOfertante", () => {
  it("AM sempre pode acessar, para qualquer cdOfertanteAlvo", () => {
    expect(
      podeAcessarOfertante({ tipo: "AM", cdOfertante: null }, 1),
    ).toBe(true);
    expect(
      podeAcessarOfertante({ tipo: "AM", cdOfertante: null }, 999),
    ).toBe(true);
  });

  it("GT sempre pode acessar, para qualquer cdOfertanteAlvo", () => {
    expect(
      podeAcessarOfertante({ tipo: "GT", cdOfertante: null }, 1),
    ).toBe(true);
    expect(
      podeAcessarOfertante({ tipo: "GT", cdOfertante: null }, 999),
    ).toBe(true);
  });

  // VT não está nomeado no texto do critério de aceite, mas AD-012 agrupa
  // AM/GT/VT como escopo nacional (o mesmo grupo que fica com cdOfertante
  // sempre null - ver schema.prisma) - TipoUsuario é exaustivo, então VT
  // precisa de um ramo correto, não só compilar.
  it("VT sempre pode acessar, para qualquer cdOfertanteAlvo (AD-012: escopo nacional)", () => {
    expect(
      podeAcessarOfertante({ tipo: "VT", cdOfertante: null }, 1),
    ).toBe(true);
  });

  it("GO vinculado ao ofertante 1 pedindo o ofertante 2: false", () => {
    expect(
      podeAcessarOfertante({ tipo: "GO", cdOfertante: 1 }, 2),
    ).toBe(false);
  });

  it("GO vinculado ao ofertante 1 pedindo o ofertante 1: true", () => {
    expect(
      podeAcessarOfertante({ tipo: "GO", cdOfertante: 1 }, 1),
    ).toBe(true);
  });

  it("VO vinculado ao ofertante 1 pedindo o ofertante 2: false", () => {
    expect(
      podeAcessarOfertante({ tipo: "VO", cdOfertante: 1 }, 2),
    ).toBe(false);
  });

  it("VO vinculado ao ofertante 1 pedindo o ofertante 1: true", () => {
    expect(
      podeAcessarOfertante({ tipo: "VO", cdOfertante: 1 }, 1),
    ).toBe(true);
  });

  it("AL nunca pode acessar por essa via, mesmo com cdOfertanteAlvo coincidente", () => {
    expect(
      podeAcessarOfertante({ tipo: "AL", cdOfertante: null }, 1),
    ).toBe(false);
  });
});

describe("podeEditarOfertante", () => {
  it("AM sempre pode editar, para qualquer cdOfertanteAlvo", () => {
    expect(podeEditarOfertante({ tipo: "AM", cdOfertante: null }, 1)).toBe(true);
    expect(podeEditarOfertante({ tipo: "AM", cdOfertante: null }, 999)).toBe(true);
  });

  it("GT sempre pode editar, para qualquer cdOfertanteAlvo", () => {
    expect(podeEditarOfertante({ tipo: "GT", cdOfertante: null }, 1)).toBe(true);
  });

  it("GO vinculado ao ofertante 1 pode editar o ofertante 1", () => {
    expect(podeEditarOfertante({ tipo: "GO", cdOfertante: 1 }, 1)).toBe(true);
  });

  it("GO vinculado ao ofertante 1 não pode editar o ofertante 2", () => {
    expect(podeEditarOfertante({ tipo: "GO", cdOfertante: 1 }, 2)).toBe(false);
  });

  // Diferença chave frente a podeAcessarOfertante: VT lê qualquer Ofertante,
  // mas "somente leitura" é a própria definição do perfil - nunca edita.
  it("VT nunca pode editar, mesmo tendo acesso de leitura nacional", () => {
    expect(podeEditarOfertante({ tipo: "VT", cdOfertante: null }, 1)).toBe(false);
  });

  it("VO nunca pode editar, mesmo o próprio ofertante", () => {
    expect(podeEditarOfertante({ tipo: "VO", cdOfertante: 1 }, 1)).toBe(false);
  });

  it("AL nunca pode editar", () => {
    expect(podeEditarOfertante({ tipo: "AL", cdOfertante: null }, 1)).toBe(false);
  });
});

describe("podeGerenciarVerba", () => {
  it("AM pode gerenciar Verba", () => {
    expect(podeGerenciarVerba("AM")).toBe(true);
  });

  it("GT pode gerenciar Verba", () => {
    expect(podeGerenciarVerba("GT")).toBe(true);
  });

  it("GO não pode gerenciar Verba (só a consome, não a cria/edita)", () => {
    expect(podeGerenciarVerba("GO")).toBe(false);
  });

  it("VO não pode gerenciar Verba", () => {
    expect(podeGerenciarVerba("VO")).toBe(false);
  });

  it("VT não pode gerenciar Verba", () => {
    expect(podeGerenciarVerba("VT")).toBe(false);
  });

  it("AL não pode gerenciar Verba", () => {
    expect(podeGerenciarVerba("AL")).toBe(false);
  });
});

describe("podeGerenciarPreCurso", () => {
  it("GO vinculado ao ofertante alvo pode gerenciar", () => {
    expect(podeGerenciarPreCurso({ tipo: "GO", cdOfertante: 1 }, 1)).toBe(true);
  });

  it("GO vinculado a outro ofertante não pode gerenciar", () => {
    expect(podeGerenciarPreCurso({ tipo: "GO", cdOfertante: 1 }, 2)).toBe(false);
  });

  // Diferente de podeEditarOfertante/podeGerenciarVerba: nem AM nem GT
  // escrevem pré-curso, só o GO dono (seção 4 do documento fonte).
  it("AM não pode gerenciar, mesmo sendo autoridade global", () => {
    expect(podeGerenciarPreCurso({ tipo: "AM", cdOfertante: null }, 1)).toBe(false);
  });

  it("GT não pode gerenciar", () => {
    expect(podeGerenciarPreCurso({ tipo: "GT", cdOfertante: null }, 1)).toBe(false);
  });

  it("VT não pode gerenciar", () => {
    expect(podeGerenciarPreCurso({ tipo: "VT", cdOfertante: null }, 1)).toBe(false);
  });

  it("VO não pode gerenciar, mesmo o próprio ofertante", () => {
    expect(podeGerenciarPreCurso({ tipo: "VO", cdOfertante: 1 }, 1)).toBe(false);
  });

  it("AL não pode gerenciar", () => {
    expect(podeGerenciarPreCurso({ tipo: "AL", cdOfertante: null }, 1)).toBe(false);
  });
});
