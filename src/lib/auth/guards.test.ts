// Testes unitários das guardas de rota (REQ-AU-02, REQ-AU-09, REQ-SEC-14).
// `session.ts` e `next/navigation` são mockados: aqui só interessa qual
// desvio cada guarda dispara, não o acesso ao banco.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exigeOfertanteEVerba,
  podeAcessarAvaliacao,
  podeAcessarOfertante,
  podeAcessarVerba,
  podeEditarOfertante,
  podeGerenciarAvaliacao,
  podeGerenciarPosCurso,
  podeGerenciarPreCurso,
  podeGerenciarVerba,
  podeMatricularAluno,
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

// A verba ilimitada do AM (AD-040) é a única sem Ofertante dono. Fora ela,
// `podeAcessarVerba` é `podeAcessarOfertante` - por isso os casos abaixo se
// concentram no null.
describe("podeAcessarVerba", () => {
  it("delega ao escopo de Ofertante quando a verba tem dono", () => {
    expect(podeAcessarVerba({ tipo: "GO", cdOfertante: 1 }, 1)).toBe(true);
    expect(podeAcessarVerba({ tipo: "GO", cdOfertante: 1 }, 2)).toBe(false);
    expect(podeAcessarVerba({ tipo: "AL", cdOfertante: null }, 1)).toBe(false);
  });

  it("verba sem Ofertante (ilimitada, AD-040) é visível aos perfis nacionais", () => {
    expect(podeAcessarVerba({ tipo: "AM", cdOfertante: null }, null)).toBe(true);
    expect(podeAcessarVerba({ tipo: "GT", cdOfertante: null }, null)).toBe(true);
    expect(podeAcessarVerba({ tipo: "VT", cdOfertante: null }, null)).toBe(true);
  });

  it("verba sem Ofertante não é visível a quem tem escopo de Ofertante ou de curso", () => {
    expect(podeAcessarVerba({ tipo: "GO", cdOfertante: 1 }, null)).toBe(false);
    expect(podeAcessarVerba({ tipo: "VO", cdOfertante: 1 }, null)).toBe(false);
    expect(podeAcessarVerba({ tipo: "AL", cdOfertante: null }, null)).toBe(false);
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

  // AD-040: o AM passou a criar e gerir curso, em qualquer Ofertante - mesma
  // autoridade nacional que ele já tinha em podeEditarOfertante. O GT segue
  // de fora (gere verba e Ofertante, não formulário de curso).
  it("AM gerencia pré-curso de qualquer Ofertante (AD-040)", () => {
    expect(podeGerenciarPreCurso({ tipo: "AM", cdOfertante: null }, 1)).toBe(true);
    expect(podeGerenciarPreCurso({ tipo: "AM", cdOfertante: null }, 2)).toBe(true);
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

// PosCurso não tem CD_Ofertante próprio - `cdOfertanteAlvo` aqui é sempre o
// do PreCurso pai. Alias de podeGerenciarPreCurso (design.md), não uma nova
// função - os casos abaixo confirmam que o comportamento é idêntico.
describe("podeGerenciarPosCurso", () => {
  it("é o mesmo comportamento de podeGerenciarPreCurso (alias, não uma função nova)", () => {
    expect(podeGerenciarPosCurso).toBe(podeGerenciarPreCurso);
  });

  it("GO vinculado ao ofertante do PreCurso pai pode gerenciar", () => {
    expect(podeGerenciarPosCurso({ tipo: "GO", cdOfertante: 1 }, 1)).toBe(true);
  });

  it("GO vinculado a outro ofertante não pode gerenciar", () => {
    expect(podeGerenciarPosCurso({ tipo: "GO", cdOfertante: 1 }, 2)).toBe(false);
  });

  it("AM gerencia pós-curso de qualquer Ofertante (AD-040)", () => {
    expect(podeGerenciarPosCurso({ tipo: "AM", cdOfertante: null }, 1)).toBe(true);
    expect(podeGerenciarPosCurso({ tipo: "AM", cdOfertante: null }, 2)).toBe(true);
  });

  it("GT não pode gerenciar", () => {
    expect(podeGerenciarPosCurso({ tipo: "GT", cdOfertante: null }, 1)).toBe(false);
  });

  it("VT não pode gerenciar", () => {
    expect(podeGerenciarPosCurso({ tipo: "VT", cdOfertante: null }, 1)).toBe(false);
  });

  it("VO não pode gerenciar, mesmo o próprio ofertante", () => {
    expect(podeGerenciarPosCurso({ tipo: "VO", cdOfertante: 1 }, 1)).toBe(false);
  });

  it("AL não pode gerenciar", () => {
    expect(podeGerenciarPosCurso({ tipo: "AL", cdOfertante: null }, 1)).toBe(false);
  });
});

// AvaliacaoAluno não tem CD_Ofertante próprio - `cdOfertanteAlvo` aqui é
// sempre o do PreCurso (curso) em que o Aluno está sendo matriculado. O AM
// matricula porque cria Aluno em qualquer Ofertante, e o Aluno nasce
// matriculado; desde o AD-040 isso coincide com podeGerenciarPreCurso, mas
// segue sendo função própria - a regra é sobre o Aluno.
describe("podeMatricularAluno", () => {
  it("GO vinculado ao ofertante do curso pode matricular", () => {
    expect(podeMatricularAluno({ tipo: "GO", cdOfertante: 1 }, 1)).toBe(true);
  });

  it("GO vinculado a outro ofertante não pode matricular", () => {
    expect(podeMatricularAluno({ tipo: "GO", cdOfertante: 1 }, 2)).toBe(false);
  });

  it("AM matricula em qualquer Ofertante (autoridade nacional, AD-012)", () => {
    expect(podeMatricularAluno({ tipo: "AM", cdOfertante: null }, 1)).toBe(true);
    expect(podeMatricularAluno({ tipo: "AM", cdOfertante: null }, 2)).toBe(true);
  });

  it("GT não pode matricular (nem cria Aluno, REQ-AU-05/06)", () => {
    expect(podeMatricularAluno({ tipo: "GT", cdOfertante: null }, 1)).toBe(false);
  });

  it("VT/VO/AL não matriculam", () => {
    expect(podeMatricularAluno({ tipo: "VT", cdOfertante: null }, 1)).toBe(false);
    expect(podeMatricularAluno({ tipo: "VO", cdOfertante: 1 }, 1)).toBe(false);
    expect(podeMatricularAluno({ tipo: "AL", cdOfertante: null }, 1)).toBe(false);
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
        { tipo: "AL", cpf: "52998224725", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: 1 },
      ),
    ).toBe(true);
  });

  it("AL com CPF diferente do alvo não pode acessar", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "AL", cpf: "11144477735", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: 1 },
      ),
    ).toBe(false);
  });

  it("GO vinculado ao cdOfertante do alvo pode acessar", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "GO", cpf: "11144477735", cdOfertante: 1 },
        { cpfAluno: "52998224725", cdOfertante: 1 },
      ),
    ).toBe(true);
  });

  it("GO vinculado a outro Ofertante não pode acessar", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "GO", cpf: "11144477735", cdOfertante: 2 },
        { cpfAluno: "52998224725", cdOfertante: 1 },
      ),
    ).toBe(false);
  });

  it("VO vinculado ao cdOfertante do alvo pode acessar", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "VO", cpf: "11144477735", cdOfertante: 1 },
        { cpfAluno: "52998224725", cdOfertante: 1 },
      ),
    ).toBe(true);
  });

  it("AM/GT/VT sempre podem acessar, para qualquer alvo", () => {
    expect(
      podeAcessarAvaliacao(
        { tipo: "AM", cpf: "11144477735", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: 1 },
      ),
    ).toBe(true);
    expect(
      podeAcessarAvaliacao(
        { tipo: "GT", cpf: "11144477735", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: 1 },
      ),
    ).toBe(true);
    expect(
      podeAcessarAvaliacao(
        { tipo: "VT", cpf: "11144477735", cdOfertante: null },
        { cpfAluno: "52998224725", cdOfertante: 1 },
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
