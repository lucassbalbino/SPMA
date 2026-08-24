import { describe, expect, it } from "vitest";
import { primeiroAcessoSchema } from "./primeiro-acesso.schema";

describe("primeiroAcessoSchema", () => {
  it("rejeita senha com menos de 8 caracteres", () => {
    const result = primeiroAcessoSchema.safeParse({
      senha: "abc123",
      confirmacaoSenha: "abc123",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita quando confirmação difere da senha", () => {
    const result = primeiroAcessoSchema.safeParse({
      senha: "senhaForte1",
      confirmacaoSenha: "senhaDiferente1",
    });

    expect(result.success).toBe(false);
  });

  it("aceita payload válido", () => {
    const result = primeiroAcessoSchema.safeParse({
      senha: "senhaForte1",
      confirmacaoSenha: "senhaForte1",
    });

    expect(result.success).toBe(true);
  });
});
