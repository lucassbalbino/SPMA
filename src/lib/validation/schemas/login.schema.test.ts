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

  // P2 AC5 (correção pós-Verifier, ranked gap #4): documento de tamanho
  // diferente de 11/14 não é rejeitado aqui com "Documento inválido" - o
  // schema não sabe dizer se seria um CPF ou CNPJ truncado/estendido, então
  // deixa passar sem erro de formato; é `POST /api/auth/login` quem, ao não
  // achar nenhum `Usuario` com esse `documento`, responde a MESMA mensagem
  // genérica usada para senha errada (401 "CPF ou senha inválidos") -
  // provado em `route.integration.test.ts`, não aqui (este schema não
  // conhece o banco).
  it.each(["123456789", "123456789012", "1234567890123456"])(
    "aceita (passa adiante) documento de tamanho diferente de 11/14 (%s) - quem rejeita é o login, com a mensagem genérica de credencial",
    (documento) => {
      const result = loginSchema.safeParse({ documento, senha: "qualquerSenha1" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.documento).toBe(documento);
      }
    },
  );

  it("continua rejeitando com 'Documento inválido' um documento de 11 dígitos com dígito verificador errado (CA-AU-03, grandfathered)", () => {
    const result = loginSchema.safeParse({
      documento: "12345678901",
      senha: "qualquerSenha1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Documento inválido");
    }
  });
});
