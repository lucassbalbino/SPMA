import { describe, expect, it } from "vitest";
import { normalizarDocumento, validarDocumento } from "./documento";

describe("validarDocumento", () => {
  it("11 dígitos válidos -> {valido:true, tipo:'CPF'}", () => {
    expect(validarDocumento("111.444.777-35")).toEqual({ valido: true, tipo: "CPF" });
  });

  it("14 dígitos válidos -> {valido:true, tipo:'CNPJ'}", () => {
    expect(validarDocumento("11.222.333/0001-81")).toEqual({
      valido: true,
      tipo: "CNPJ",
    });
  });

  it("11 dígitos com dígito verificador inválido -> {valido:false, tipo:null}", () => {
    expect(validarDocumento("111.444.777-36")).toEqual({ valido: false, tipo: null });
  });

  it("14 dígitos com dígito verificador inválido -> {valido:false, tipo:null}", () => {
    expect(validarDocumento("11.222.333/0001-82")).toEqual({
      valido: false,
      tipo: null,
    });
  });

  it("comprimento diferente de 11 e 14 -> {valido:false, tipo:null}", () => {
    expect(validarDocumento("12345")).toEqual({ valido: false, tipo: null });
  });

  it("comprimento 13 (nem CPF nem CNPJ) -> {valido:false, tipo:null}", () => {
    expect(validarDocumento("1122233300018")).toEqual({ valido: false, tipo: null });
  });

  it("string vazia -> {valido:false, tipo:null}", () => {
    expect(validarDocumento("")).toEqual({ valido: false, tipo: null });
  });
});

describe("normalizarDocumento", () => {
  it("remove pontuação/máscara de um CPF", () => {
    expect(normalizarDocumento("111.444.777-35")).toBe("11144477735");
  });

  it("remove pontuação/máscara de um CNPJ", () => {
    expect(normalizarDocumento("11.222.333/0001-81")).toBe("11222333000181");
  });
});
