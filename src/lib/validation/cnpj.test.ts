import { describe, expect, it } from "vitest";
import { normalizarCNPJ, validarCNPJ } from "./cnpj";

describe("validarCNPJ", () => {
  it("retorna true para CNPJ válido formatado", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("retorna true para CNPJ válido sem formatação", () => {
    expect(validarCNPJ("11222333000181")).toBe(true);
  });

  it("retorna true para outro CNPJ válido conhecido", () => {
    expect(validarCNPJ("11.444.777/0001-61")).toBe(true);
  });

  it("retorna false para CNPJ com segundo dígito verificador alterado", () => {
    // último dígito de um CNPJ válido (11.222.333/0001-81) trocado de 1 para 2
    expect(validarCNPJ("11.222.333/0001-82")).toBe(false);
  });

  it("retorna false para CNPJ com primeiro dígito verificador alterado", () => {
    // penúltimo dígito de um CNPJ válido (11.222.333/0001-81) trocado de 8 para 9
    expect(validarCNPJ("11.222.333/0001-91")).toBe(false);
  });

  it("retorna false para CNPJ com todos os dígitos iguais (11.111.111/1111-11)", () => {
    expect(validarCNPJ("11.111.111/1111-11")).toBe(false);
  });

  it("retorna false para CNPJ com todos os dígitos iguais (00.000.000/0000-00)", () => {
    expect(validarCNPJ("00.000.000/0000-00")).toBe(false);
  });

  it("retorna false para CNPJ com tamanho menor que o correto", () => {
    expect(validarCNPJ("1122233300018")).toBe(false);
  });

  it("retorna false para CNPJ com tamanho maior que o correto", () => {
    expect(validarCNPJ("112223330001811")).toBe(false);
  });

  it("retorna false para um CPF de 11 dígitos (tamanho errado para CNPJ)", () => {
    expect(validarCNPJ("11144477735")).toBe(false);
  });

  it("retorna false para string vazia", () => {
    expect(validarCNPJ("")).toBe(false);
  });
});

describe("normalizarCNPJ", () => {
  it("remove pontuação/máscara mantendo só os dígitos", () => {
    expect(normalizarCNPJ("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("mantém string já normalizada inalterada", () => {
    expect(normalizarCNPJ("11222333000181")).toBe("11222333000181");
  });
});
