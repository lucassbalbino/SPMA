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
});
