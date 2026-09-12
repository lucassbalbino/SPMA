// Testes unitários das guardas de rota (REQ-AU-02, REQ-AU-09, REQ-SEC-14).
// `session.ts` e `next/navigation` são mockados: aqui só interessa qual
// desvio cada guarda dispara, não o acesso ao banco.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exigeOfertanteEVerba,
  podeAcessarAvaliacao,
  podeAcessarOfertante,
  podeEditarOfertante,
  podeGerenciarAvaliacao,
  podeGerenciarPosCurso,
  podeGerenciarPreCurso,
  podeGerenciarVerba,
  podeMatricularAluno,
  requireDadosPessoaisCompletos,
  requireOfertanteVinculado,
  requirePrimeiroAcessoConcluido,
  requireSession,
  resolverEscopoOfertante,
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

  it("redireciona para /cadastro-ofertante quando GO está com nome null", () => {
    expect(() =>
      requireOfertanteVinculado({ tipo: "GO", nome: null, uf: "SP" }),
    ).toThrow("NEXT_REDIRECT:/cadastro-ofertante");
    expect(redirect).toHaveBeenCalledWith("/cadastro-ofertante");
  });

  it("redireciona para /cadastro-ofertante quando GO está com uf null", () => {
    expect(() =>
      requireOfertanteVinculado({ tipo: "GO", nome: "Instituto Exemplo", uf: null }),
    ).toThrow("NEXT_REDIRECT:/cadastro-ofertante");
    expect(redirect).toHaveBeenCalledWith("/cadastro-ofertante");
  });

  it("não redireciona quando GO já tem nome e uf preenchidos", () => {
    requireOfertanteVinculado({ tipo: "GO", nome: "Instituto Exemplo", uf: "SP" });

    expect(redirect).not.toHaveBeenCalled();
  });

  // AD-012: AL tem escopo pelo curso, não pelo Ofertante - nome/uf nulos são
  // o estado normal dele e não podem prendê-lo no cadastro organizacional.
  it("não redireciona perfil não-GO com nome/uf null", () => {
    requireOfertanteVinculado({ tipo: "AL", nome: null, uf: null });

    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("resolverEscopoOfertante", () => {
  it("GO: devolve o próprio documento (é a origem do escopo, AD-043)", () => {
    expect(
      resolverEscopoOfertante({ tipo: "GO", documento: "11222333000181", cdOfertante: null }),
    ).toBe("11222333000181");
  });

  it("VO: devolve o cdOfertante (documento do GO ao qual está vinculado)", () => {
    expect(
      resolverEscopoOfertante({ tipo: "VO", documento: "11144477735", cdOfertante: "11222333000181" }),
    ).toBe("11222333000181");
  });

  it("VO sem cdOfertante: devolve null", () => {
    expect(
      resolverEscopoOfertante({ tipo: "VO", documento: "11144477735", cdOfertante: null }),
    ).toBeNull();
  });

  it.each(["AM", "GT", "VT", "AL"] as const)(
    "%s: sempre devolve null (não tem escopo por Ofertante)",
    (tipo) => {
      expect(
        resolverEscopoOfertante({ tipo, documento: "11144477735", cdOfertante: null }),
      ).toBeNull();
    },
  );
});

describe("requireDadosPessoaisCompletos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona para /dados-pessoais quando o Aluno não completou o cadastro", () => {
    expect(() =>
      requireDadosPessoaisCompletos({ tipo: "AL", dadosPessoaisCompletos: false }),
    ).toThrow("NEXT_REDIRECT:/dados-pessoais");
    expect(redirect).toHaveBeenCalledWith("/dados-pessoais");
  });

  it("não redireciona quando o Aluno já completou o cadastro", () => {
    requireDadosPessoaisCompletos({ tipo: "AL", dadosPessoaisCompletos: true });

    expect(redirect).not.toHaveBeenCalled();
  });

  // PESSOAL-04: nenhum outro perfil é afetado, mesmo com a flag false (que é
  // o estado padrão para todo mundo, já que só Aluno grava essa flag).
  it.each(["AM", "GT", "VT", "GO", "VO"] as const)(
    "não redireciona perfil %s, mesmo com dadosPessoaisCompletos false",
    (tipo) => {
      requireDadosPessoaisCompletos({ tipo, dadosPessoaisCompletos: false });

      expect(redirect).not.toHaveBeenCalled();
    },
  );
});

describe("podeAcessarOfertante", () => {
  it("AM sempre pode acessar, para qualquer cdOfertanteAlvo", () => {
    expect(
      podeAcessarOfertante({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(true);
    expect(
      podeAcessarOfertante({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "999"),
    ).toBe(true);
  });

  it("GT sempre pode acessar, para qualquer cdOfertanteAlvo", () => {
    expect(
      podeAcessarOfertante({ tipo: "GT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(true);
    expect(
      podeAcessarOfertante({ tipo: "GT", documento: "00000000000", cdOfertante: null }, "999"),
    ).toBe(true);
  });

  // VT não está nomeado no texto do critério de aceite, mas AD-012 agrupa
  // AM/GT/VT como escopo nacional (o mesmo grupo que fica com cdOfertante
  // sempre null - ver schema.prisma) - TipoUsuario é exaustivo, então VT
  // precisa de um ramo correto, não só compilar.
  it("VT sempre pode acessar, para qualquer cdOfertanteAlvo (AD-012: escopo nacional)", () => {
    expect(
      podeAcessarOfertante({ tipo: "VT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(true);
  });

  // GO É o próprio Ofertante (AD-043): o escopo dele vem do próprio
  // documento (via resolverEscopoOfertante), não de um cdOfertante herdado -
  // esse campo fica sempre null para um GO.
  it("GO (documento 1) pedindo o ofertante 2: false", () => {
    expect(
      podeAcessarOfertante({ tipo: "GO", documento: "1", cdOfertante: null }, "2"),
    ).toBe(false);
  });

  it("GO (documento 1) pedindo o próprio ofertante (1): true", () => {
    expect(
      podeAcessarOfertante({ tipo: "GO", documento: "1", cdOfertante: null }, "1"),
    ).toBe(true);
  });

  it("VO vinculado ao GO 1 pedindo o ofertante 2: false", () => {
    expect(
      podeAcessarOfertante({ tipo: "VO", documento: "99", cdOfertante: "1" }, "2"),
    ).toBe(false);
  });

  it("VO vinculado ao GO 1 pedindo o ofertante 1: true", () => {
    expect(
      podeAcessarOfertante({ tipo: "VO", documento: "99", cdOfertante: "1" }, "1"),
    ).toBe(true);
  });

  it("AL nunca pode acessar por essa via, mesmo com cdOfertanteAlvo coincidente", () => {
    expect(
      podeAcessarOfertante({ tipo: "AL", documento: "11144477735", cdOfertante: null }, "1"),
    ).toBe(false);
  });
});

describe("podeEditarOfertante", () => {
  it("AM sempre pode editar, para qualquer cdOfertanteAlvo", () => {
    expect(
      podeEditarOfertante({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(true);
    expect(
      podeEditarOfertante({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "999"),
    ).toBe(true);
  });

  it("GT sempre pode editar, para qualquer cdOfertanteAlvo", () => {
    expect(
      podeEditarOfertante({ tipo: "GT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(true);
  });

  it("GO (documento 1) pode editar o próprio ofertante (1)", () => {
    expect(
      podeEditarOfertante({ tipo: "GO", documento: "1", cdOfertante: null }, "1"),
    ).toBe(true);
  });

  it("GO (documento 1) não pode editar o ofertante 2", () => {
    expect(
      podeEditarOfertante({ tipo: "GO", documento: "1", cdOfertante: null }, "2"),
    ).toBe(false);
  });

  // Diferença chave frente a podeAcessarOfertante: VT lê qualquer Ofertante,
  // mas "somente leitura" é a própria definição do perfil - nunca edita.
  it("VT nunca pode editar, mesmo tendo acesso de leitura nacional", () => {
    expect(
      podeEditarOfertante({ tipo: "VT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(false);
  });

  it("VO nunca pode editar, mesmo o próprio ofertante", () => {
    expect(
      podeEditarOfertante({ tipo: "VO", documento: "99", cdOfertante: "1" }, "1"),
    ).toBe(false);
  });

  it("AL nunca pode editar", () => {
    expect(
      podeEditarOfertante({ tipo: "AL", documento: "11144477735", cdOfertante: null }, "1"),
    ).toBe(false);
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
  it("GO (documento 1) pode gerenciar o próprio ofertante (1)", () => {
    expect(
      podeGerenciarPreCurso({ tipo: "GO", documento: "1", cdOfertante: null }, "1"),
    ).toBe(true);
  });

  it("GO (documento 1) não pode gerenciar o ofertante 2", () => {
    expect(
      podeGerenciarPreCurso({ tipo: "GO", documento: "1", cdOfertante: null }, "2"),
    ).toBe(false);
  });

  // AD-040: exceção administrativa para o AM, autoridade nacional (AD-012) -
  // qualquer Ofertante alvo, sem vínculo.
  it("AM pode gerenciar qualquer ofertante, por ser autoridade global", () => {
    expect(
      podeGerenciarPreCurso({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(true);
    expect(
      podeGerenciarPreCurso({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "2"),
    ).toBe(true);
  });

  it("GT não pode gerenciar", () => {
    expect(
      podeGerenciarPreCurso({ tipo: "GT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(false);
  });

  it("VT não pode gerenciar", () => {
    expect(
      podeGerenciarPreCurso({ tipo: "VT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(false);
  });

  it("VO não pode gerenciar, mesmo o próprio ofertante", () => {
    expect(
      podeGerenciarPreCurso({ tipo: "VO", documento: "99", cdOfertante: "1" }, "1"),
    ).toBe(false);
  });

  it("AL não pode gerenciar", () => {
    expect(
      podeGerenciarPreCurso({ tipo: "AL", documento: "11144477735", cdOfertante: null }, "1"),
    ).toBe(false);
  });
});

// PosCurso não tem CD_Ofertante próprio - `cdOfertanteAlvo` aqui é sempre o
// do PreCurso pai. Alias de podeGerenciarPreCurso (design.md), não uma nova
// função - os casos abaixo confirmam que o comportamento é idêntico.
describe("podeGerenciarPosCurso", () => {
  it("é o mesmo comportamento de podeGerenciarPreCurso (alias, não uma função nova)", () => {
    expect(podeGerenciarPosCurso).toBe(podeGerenciarPreCurso);
  });

  it("GO (documento 1) pode gerenciar o ofertante do PreCurso pai (1)", () => {
    expect(
      podeGerenciarPosCurso({ tipo: "GO", documento: "1", cdOfertante: null }, "1"),
    ).toBe(true);
  });

  it("GO (documento 1) não pode gerenciar o ofertante 2", () => {
    expect(
      podeGerenciarPosCurso({ tipo: "GO", documento: "1", cdOfertante: null }, "2"),
    ).toBe(false);
  });

  it("AM pode gerenciar qualquer ofertante, por ser autoridade global", () => {
    expect(
      podeGerenciarPosCurso({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(true);
  });

  it("GT não pode gerenciar", () => {
    expect(
      podeGerenciarPosCurso({ tipo: "GT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(false);
  });

  it("VT não pode gerenciar", () => {
    expect(
      podeGerenciarPosCurso({ tipo: "VT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(false);
  });

  it("VO não pode gerenciar, mesmo o próprio ofertante", () => {
    expect(
      podeGerenciarPosCurso({ tipo: "VO", documento: "99", cdOfertante: "1" }, "1"),
    ).toBe(false);
  });

  it("AL não pode gerenciar", () => {
    expect(
      podeGerenciarPosCurso({ tipo: "AL", documento: "11144477735", cdOfertante: null }, "1"),
    ).toBe(false);
  });
});

// AvaliacaoAluno não tem CD_Ofertante próprio - `cdOfertanteAlvo` aqui é
// sempre o do PreCurso (curso) em que o Aluno está sendo matriculado. Não é
// mais alias de podeGerenciarPreCurso: o AM matricula porque cria Aluno em
// qualquer Ofertante, e o Aluno nasce matriculado.
describe("podeMatricularAluno", () => {
  it("GO (documento 1) pode matricular no próprio ofertante (curso do ofertante 1)", () => {
    expect(
      podeMatricularAluno({ tipo: "GO", documento: "1", cdOfertante: null }, "1"),
    ).toBe(true);
  });

  it("GO (documento 1) não pode matricular em curso de outro ofertante", () => {
    expect(
      podeMatricularAluno({ tipo: "GO", documento: "1", cdOfertante: null }, "2"),
    ).toBe(false);
  });

  it("AM matricula em qualquer Ofertante (autoridade nacional, AD-012)", () => {
    expect(
      podeMatricularAluno({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(true);
    expect(
      podeMatricularAluno({ tipo: "AM", documento: "00000000000", cdOfertante: null }, "2"),
    ).toBe(true);
  });

  it("GT não pode matricular (nem cria Aluno, REQ-AU-05/06)", () => {
    expect(
      podeMatricularAluno({ tipo: "GT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(false);
  });

  it("VT/VO/AL não matriculam", () => {
    expect(
      podeMatricularAluno({ tipo: "VT", documento: "00000000000", cdOfertante: null }, "1"),
    ).toBe(false);
    expect(
      podeMatricularAluno({ tipo: "VO", documento: "99", cdOfertante: "1" }, "1"),
    ).toBe(false);
    expect(
      podeMatricularAluno({ tipo: "AL", documento: "11144477735", cdOfertante: null }, "1"),
    ).toBe(false);
  });

  it("continua sem afetar quem preenche/encerra a avaliação (só o próprio Aluno)", () => {
    expect(podeGerenciarAvaliacao({ tipo: "AM", cpf: "52998224725" }, "52998224725")).toBe(
      false,
    );
  });
});

// Primeira guarda de identidade pura do projeto (design.md Tech Decisions):
// não checa perfil de gestão, só se o CPF autenticado é o dono do registro.
describe("podeGerenciarAvaliacao", () => {
  it("AL com CPF igual ao da avaliação pode gerenciar", () => {
    expect(
      podeGerenciarAvaliacao({ tipo: "AL", cpf: "52998224725" }, "52998224725"),
    ).toBe(true);
  });

  it("AL com CPF diferente do da avaliação não pode gerenciar", () => {
    expect(
      podeGerenciarAvaliacao({ tipo: "AL", cpf: "11144477735" }, "52998224725"),
    ).toBe(false);
  });

  it("GO (mesmo tendo feito a matrícula) não pode gerenciar", () => {
    expect(
      podeGerenciarAvaliacao({ tipo: "GO", cpf: "52998224725" }, "52998224725"),
    ).toBe(false);
  });

  it("AM não pode gerenciar, mesmo sendo autoridade global", () => {
    expect(
      podeGerenciarAvaliacao({ tipo: "AM", cpf: "52998224725" }, "52998224725"),
    ).toBe(false);
  });
});

describe("podeAcessarAvaliacao", () => {
  it("AL com CPF igual ao alvo pode acessar, independente do cdOfertante", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "AL", cpf: "52998224725", documento: "52998224725", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: "1" },
      ),
    ).toBe(true);
  });

  it("AL com CPF diferente do alvo não pode acessar", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "AL", cpf: "11144477735", documento: "11144477735", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: "1" },
      ),
    ).toBe(false);
  });

  it("GO (documento igual ao cdOfertante do alvo) pode acessar", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "GO", cpf: "11144477735", documento: "1", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: "1" },
      ),
    ).toBe(true);
  });

  it("GO (documento diferente do cdOfertante do alvo) não pode acessar", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "GO", cpf: "11144477735", documento: "2", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: "1" },
      ),
    ).toBe(false);
  });

  it("VO vinculado ao cdOfertante do alvo pode acessar", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "VO", cpf: "11144477735", documento: "99", cdOfertante: "1" },
        { cpfAluno: "52998224725", cdOfertante: "1" },
      ),
    ).toBe(true);
  });

  it("AM/GT/VT sempre podem acessar, para qualquer alvo", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "AM", cpf: "11144477735", documento: "00000000000", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: "1" },
      ),
    ).toBe(true);
    expect(
      podeAcessarAvaliacao(
        { tipo: "GT", cpf: "11144477735", documento: "00000000000", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: "1" },
      ),
    ).toBe(true);
    expect(
      podeAcessarAvaliacao(
        { tipo: "VT", cpf: "11144477735", documento: "00000000000", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: "1" },
      ),
    ).toBe(true);
  });
});

describe("exigeOfertanteEVerba", () => {
  it("AM criando GO informa Ofertante e verba no mesmo passo", () => {
    expect(exigeOfertanteEVerba("AM", "GO")).toBe(true);
  });

  it("GT criando GO informa Ofertante e verba no mesmo passo", () => {
    expect(exigeOfertanteEVerba("GT", "GO")).toBe(true);
  });

  it("GO criando GO não informa verba (herda o Ofertante e não gere verba)", () => {
    expect(exigeOfertanteEVerba("GO", "GO")).toBe(false);
  });

  it.each(["AM", "GT"] as const)("%s criando VO não precisa de verba", (criador) => {
    expect(exigeOfertanteEVerba(criador, "VO")).toBe(false);
  });

  it.each(["AM", "GT", "VT", "AL"] as const)(
    "criar um %s nunca envolve verba",
    (alvo) => {
      expect(exigeOfertanteEVerba("AM", alvo)).toBe(false);
    },
  );
});
