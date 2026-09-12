import { describe, expect, it } from "vitest";
import { loginSchema } from "./login.schema";

// CNPJ válido conhecido (dígitos verificadores corretos), mesmo padrão já
// usado em cnpj.test.ts.
const cnpjValido = "11.222.333/0001-81";

describe("loginSchema", () => {
  it("rejeita CPF inválido", () => {
    const result = loginSchema.safeParse({
      documento: "111.444.777-36", // dígito verificador alterado
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    const result = loginSchema.safeParse({
      documento: "111.444.777-35",
      senha: "",
    });

    expect(result.success).toBe(false);
  });

  it("aceita CPF válido (comportamento inalterado)", () => {
    const result = loginSchema.safeParse({
      documento: "111.444.777-35",
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(true);
  });

  it("normaliza CPF formatado para somente dígitos (mesmo documento de login independente da formatação)", () => {
    const result = loginSchema.safeParse({
      documento: "111.444.777-35",
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documento).toBe("11144477735");
    }
  });

  it("aceita CNPJ válido (UGO-10: GO se identifica por CNPJ)", () => {
    const result = loginSchema.safeParse({
      documento: cnpjValido,
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(true);
  });

  it("normaliza CNPJ formatado para somente dígitos", () => {
    const result = loginSchema.safeParse({
      documento: cnpjValido,
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documento).toBe("11222333000181");
    }
  });

  it("rejeita CNPJ com dígito verificador inválido", () => {
    const result = loginSchema.safeParse({
      documento: "11.222.333/0001-82", // dígito verificador alterado
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(false);
  });

  it.each(["123456789", "123456789012", "1234567890123456"])(
    "rejeita documento de tamanho diferente de 11/14 (%s) com a mesma mensagem genérica",
    (documento) => {
      const result = loginSchema.safeParse({ documento, senha: "qualquerSenha1" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Documento inválido");
      }
    },
  );
});
