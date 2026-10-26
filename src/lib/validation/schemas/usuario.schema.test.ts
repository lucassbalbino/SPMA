import { describe, expect, it } from "vitest";
import { TipoUsuario } from "../../../generated/prisma/enums";
import { usuarioSchema } from "./usuario.schema";

// Sem nome: só o AM é criado com nome e e-mail (AD-050).
const basePayload = {
  documento: "111.444.777-35",
};

// CNPJ válido conhecido (dígitos verificadores corretos), mesmo padrão de
// basePayload.documento para CPF.
const cnpjValido = "11.222.333/0001-81";

describe("usuarioSchema", () => {
  it("rejeita CPF inválido (tipo != GO)", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      documento: "111.444.777-36", // dígito verificador alterado
      tipo: TipoUsuario.AL,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("documento"))).toBe(
        true,
      );
    }
  });

  it("rejeita tipo fora do enum TipoUsuario", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: "SUPERADMIN",
    });

    expect(result.success).toBe(false);
  });

  it.each(
    Object.values(TipoUsuario).filter(
      (tipo) => tipo !== TipoUsuario.GO && tipo !== TipoUsuario.AM,
    ),
  )("aceita payload válido (CPF) para o tipo %s", (tipo) => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo,
    });

    expect(result.success).toBe(true);
  });

  it("normaliza CPF formatado para somente dígitos (garante o mesmo valor gravado independente da formatação)", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.AL,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documento).toBe("11144477735");
    }
  });
});

describe("usuarioSchema - GO identificado por CNPJ (UGO-07/08/09)", () => {
  // AD-050: AM/GT identificam a organização só pelo CNPJ; o resto é do GO.
  it("aceita GO só com CNPJ válido, sem nenhum dado organizacional", () => {
    const result = usuarioSchema.safeParse({
      documento: cnpjValido,
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(true);
  });

  it("normaliza o CNPJ formatado para somente dígitos", () => {
    const result = usuarioSchema.safeParse({
      documento: cnpjValido,
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documento).toBe("11222333000181");
    }
  });

  it("aceita GO com CNPJ alfanumérico e o grava sem pontuação, em maiúscula", () => {
    const result = usuarioSchema.safeParse({
      documento: "12.abc.345/01de-35",
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documento).toBe("12ABC34501DE35");
    }
  });

  it("GO com CNPJ inválido -> issue no campo documento", () => {
    const result = usuarioSchema.safeParse({
      documento: "11.222.333/0001-82", // dígito verificador alterado
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("documento"))).toBe(
        true,
      );
    }
  });

  it("GO com CPF (11 dígitos) em vez de CNPJ -> rejeitado como documento inválido", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("documento"))).toBe(
        true,
      );
    }
  });

  // OGO-10: o GO declara estes dados no 1º acesso - a criação os rejeita, em
  // vez de aceitá-los e ignorá-los.
  it.each([
    ["nome", "Instituto Exemplo", "nome só é aceito na criação de Administrador Master"],
    ["email", "contato@exemplo.org", "email só é aceito na criação de Administrador Master"],
    ["uf", "SP", "uf não é aceito na criação de Gestor Ofertante"],
    ["responsavel", "Fulano de Tal", "responsavel não é aceito na criação de usuário"],
    ["telefone", "11999999999", "telefone não é aceito na criação de usuário"],
    ["municipio", "São Paulo", "municipio não é aceito na criação de usuário"],
  ] as const)("rejeita GO com %s informado", (campo, valor, mensagem) => {
    const result = usuarioSchema.safeParse({
      documento: cnpjValido,
      tipo: TipoUsuario.GO,
      [campo]: valor,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: [campo], message: mensagem }),
      ]);
    }
  });
});

describe("usuarioSchema - campos organizacionais fora do tipo GO (decisão desta tarefa: REJEITADOS)", () => {
  it.each(["responsavel", "telefone", "municipio"] as const)(
    "rejeita %s informado para um tipo != GO",
    (campo) => {
      const result = usuarioSchema.safeParse({
        ...basePayload,
        tipo: TipoUsuario.AL,
        [campo]: "valor qualquer",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes(campo))).toBe(true);
      }
    },
  );

  it("aceita uf informada para um tipo != GO (decisão fixada: a restrição de UF é só PARA GO)", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.AL,
      uf: "SP",
    });

    expect(result.success).toBe(true);
  });

});

// AD-050: nome e e-mail só vêm de quem cria quando o criado é AM; os demais
// perfis os declaram depois do 1º login.
describe("usuarioSchema - nome e e-mail só na criação de AM (AD-050)", () => {
  it("aceita AM com nome e e-mail", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.AM,
      nome: "Fulano de Tal",
      email: "pessoa@exemplo.org",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nome).toBe("Fulano de Tal");
      expect(result.data.email).toBe("pessoa@exemplo.org");
    }
  });

  it("aceita AM sem e-mail", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.AM,
      nome: "Fulano de Tal",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita AM sem nome", () => {
    const result = usuarioSchema.safeParse({ ...basePayload, tipo: TipoUsuario.AM });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["nome"], message: "Nome é obrigatório" }),
    ]);
  });

  it.each([TipoUsuario.GT, TipoUsuario.VT, TipoUsuario.VO, TipoUsuario.AL])(
    "rejeita nome e e-mail na criação de %s",
    (tipo) => {
      const result = usuarioSchema.safeParse({
        ...basePayload,
        tipo,
        nome: "Fulano de Tal",
        email: "pessoa@exemplo.org",
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([["nome"], ["email"]]);
    },
  );
});

// GV-26 (AD-046): a verba deixou de nascer junto do usuário - é criada à
// parte, em /verbas. Mandar `verba` na criação é erro de quem chama, para
// qualquer tipo (mesmo precedente de `CAMPOS_NUNCA_NA_CRIACAO`, AD-044).
describe("usuarioSchema - verba nunca aceita na criação (GV-26)", () => {
  it("aceita GO sem verba", () => {
    const result = usuarioSchema.safeParse({
      documento: cnpjValido,
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita GO com verba, com a mensagem do campo", () => {
    const result = usuarioSchema.safeParse({
      documento: cnpjValido,
      tipo: TipoUsuario.GO,
      verba: { vlVerba: 5000, dtVerba: "2026-01-15" },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "verba não é aceito na criação de usuário",
    ]);
  });

  it("rejeita VO com verba, com a mesma mensagem", () => {
    const result = usuarioSchema.safeParse({
      documento: basePayload.documento,
      tipo: TipoUsuario.VO,
      verba: { vlVerba: 5000 },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "verba não é aceito na criação de usuário",
    ]);
  });
});

describe("usuarioSchema - curso da matrícula do Aluno (AVAL-01)", () => {
  it("aceita cdCurso junto do payload de Aluno", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.AL,
      cdCurso: 7,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cdCurso).toBe(7);
    }
  });

  it("rejeita cdCurso não-positivo", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.AL,
      cdCurso: 0,
    });

    expect(result.success).toBe(false);
  });

  it("aceita payload sem cdCurso (a obrigatoriedade é decidida na rota)", () => {
    const result = usuarioSchema.safeParse({ ...basePayload, tipo: TipoUsuario.AL });

    expect(result.success).toBe(true);
  });
});
