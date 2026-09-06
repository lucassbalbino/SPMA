import { describe, expect, it } from "vitest";
import { TipoUsuario } from "../../../generated/prisma/enums";
import { usuarioSchema } from "./usuario.schema";

const basePayload = {
  cpf: "111.444.777-35",
  nome: "Fulano de Tal",
};

describe("usuarioSchema", () => {
  it("rejeita CPF inválido", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      cpf: "111.444.777-36", // dígito verificador alterado
      tipo: TipoUsuario.AL,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita tipo fora do enum TipoUsuario", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: "SUPERADMIN",
    });

    expect(result.success).toBe(false);
  });

  it.each(Object.values(TipoUsuario))(
    "aceita payload válido para o tipo %s",
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
      expect(result.data.cpf).toBe("11144477735");
    }
  });
});

describe("usuarioSchema - verba criada junto do usuário (REQ-OV-08)", () => {
  it("aceita payload sem verba (a obrigatoriedade depende de quem cria)", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.GO,
      cdOfertante: 1,
    });

    expect(result.success).toBe(true);
  });

  it("aceita verba com valor e data", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.GO,
      cdOfertante: 1,
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
      ...basePayload,
      tipo: TipoUsuario.GO,
      cdOfertante: 1,
      verba: { vlVerba: 0 },
    });

    expect(result.success).toBe(false);
  });

  it("a verba não carrega cdOfertante próprio (é sempre o do usuário criado)", () => {
    const result = usuarioSchema.safeParse({
      ...basePayload,
      tipo: TipoUsuario.GO,
      cdOfertante: 1,
      verba: { vlVerba: 5000, cdOfertante: 999 },
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
