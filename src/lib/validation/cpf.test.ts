import { describe, expect, it } from "vitest";
import { validarCPF } from "./cpf";

describe("validarCPF", () => {
  it("retorna true para CPF válido formatado", () => {
    expect(validarCPF("111.444.777-35")).toBe(true);
  });

  it("retorna true para CPF válido sem formatação", () => {
    expect(validarCPF("11144477735")).toBe(true);
  });

  it("retorna true para outro CPF válido conhecido", () => {
    expect(validarCPF("529.982.247-25")).toBe(true);
  });

  it("retorna false para CPF com dígito verificador alterado", () => {
    // último dígito de um CPF válido (111.444.777-35) trocado de 5 para 6
    expect(validarCPF("111.444.777-36")).toBe(false);
  });

  it("retorna false para CPF com primeiro dígito verificador alterado", () => {
    // penúltimo dígito de um CPF válido (111.444.777-35) trocado de 3 para 4
    expect(validarCPF("111.444.777-45")).toBe(false);
  });

  it("retorna false para CPF com todos os dígitos iguais (111.111.111-11)", () => {
    expect(validarCPF("111.111.111-11")).toBe(false);
  });

  it("retorna false para CPF com todos os dígitos iguais (000.000.000-00)", () => {
    expect(validarCPF("000.000.000-00")).toBe(false);
  });

  it("retorna false para CPF com tamanho menor que o correto", () => {
    expect(validarCPF("1114447773")).toBe(false);
  });

  it("retorna false para CPF com tamanho maior que o correto", () => {
    expect(validarCPF("111444777355")).toBe(false);
  });

  it("retorna false para string vazia", () => {
    expect(validarCPF("")).toBe(false);
  });
});
