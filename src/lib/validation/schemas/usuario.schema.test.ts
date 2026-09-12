import { describe, expect, it } from "vitest";
import { TipoUsuario } from "../../../generated/prisma/enums";
import { usuarioSchema } from "./usuario.schema";

const basePayload = {
  documento: "111.444.777-35",
  nome: "Fulano de Tal",
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

  it.each(Object.values(TipoUsuario).filter((tipo) => tipo !== TipoUsuario.GO))(
    "aceita payload válido (CPF) para o tipo %s",
    (tipo) => {
      const result = usuarioSchema.safeParse({
        ...basePayload,
        tipo,
      });

      expect(result.success).toBe(true);
    },
  );

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
  it("aceita GO com CNPJ válido + nome + uf", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: cnpjValido,
      uf: "SP",
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(true);
  });

  it("normaliza o CNPJ formatado para somente dígitos", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: cnpjValido,
      uf: "SP",
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documento).toBe("11222333000181");
    }
  });

  it("GO com CNPJ inválido -> issue no campo documento", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: "11.222.333/0001-82", // dígito verificador alterado
      uf: "SP",
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
      uf: "SP",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("documento"))).toBe(
        true,
      );
    }
  });

  it("GO sem uf -> issue de campo obrigatório", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: cnpjValido,
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("uf"))).toBe(true);
    }
  });

  it("aceita GO com os 4 campos organizacionais opcionais preenchidos", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: cnpjValido,
      uf: "SP",
      responsavel: "Fulano de Tal",
      telefone: "11999999999",
      municipio: "São Paulo",
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responsavel).toBe("Fulano de Tal");
      expect(result.data.telefone).toBe("11999999999");
      expect(result.data.municipio).toBe("São Paulo");
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

  it("aceita uf informada para um tipo != GO (não é campo exclusivo de GO, só obrigatório para GO)", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.AL,
      uf: "SP",
    });

    expect(result.success).toBe(true);
  });
});

describe("usuarioSchema - verba criada junto do usuário (REQ-OV-08)", () => {
  it("aceita payload sem verba (a obrigatoriedade depende de quem cria)", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: cnpjValido,
      uf: "SP",
      tipo: TipoUsuario.GO,
    });

    expect(result.success).toBe(true);
  });

  it("aceita verba com valor e data", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: cnpjValido,
      uf: "SP",
      tipo: TipoUsuario.GO,
      verba: { vlVerba: 5000, dtVerba: "2026-01-15" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verba?.vlVerba).toBe(5000);
      expect(result.data.verba?.dtVerba).toBeInstanceOf(Date);
    }
  });

  it("rejeita verba com valor não-positivo", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: cnpjValido,
      uf: "SP",
      tipo: TipoUsuario.GO,
      verba: { vlVerba: 0 },
    });

    expect(result.success).toBe(false);
  });

  it("a verba não carrega cdOfertante próprio (é sempre o do usuário criado)", () => {
    const result = usuarioSchema.safeParse({
      nome: "Instituto Exemplo",
      documento: cnpjValido,
      uf: "SP",
      tipo: TipoUsuario.GO,
      verba: { vlVerba: 5000, cdOfertante: "999" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verba).not.toHaveProperty("cdOfertante");
    }
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
