import { describe, expect, it } from "vitest";
import { loginSchema } from "./login.schema";

describe("loginSchema", () => {
  it("rejeita CPF inválido", () => {
    const result = loginSchema.safeParse({
      cpf: "111.444.777-36", // dígito verificador alterado
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    const result = loginSchema.safeParse({
      cpf: "111.444.777-35",
      senha: "",
    });

    expect(result.success).toBe(false);
  });

  it("aceita payload válido", () => {
    const result = loginSchema.safeParse({
      cpf: "111.444.777-35",
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(true);
  });
});
