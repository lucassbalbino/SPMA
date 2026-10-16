import { describe, expect, it } from "vitest";
import {
  aplicarMascaraDocumento,
  formatarDocumento,
  TAMANHO_MASCARA,
} from "./mascara-documento";

describe("aplicarMascaraDocumento - CPF", () => {
  it("põe a pontuação nas posições fixas", () => {
    expect(aplicarMascaraDocumento("CPF", "52998224725")).toBe("529.982.247-25");
  });

  it("aceita o CPF colado já pontuado sem duplicar a pontuação", () => {
    expect(aplicarMascaraDocumento("CPF", "529.982.247-25")).toBe("529.982.247-25");
  });

  it("pontua parcialmente enquanto se digita, sem pontuação pendurada no fim", () => {
    expect(aplicarMascaraDocumento("CPF", "529")).toBe("529");
    expect(aplicarMascaraDocumento("CPF", "5299")).toBe("529.9");
    expect(aplicarMascaraDocumento("CPF", "529.")).toBe("529");
    expect(aplicarMascaraDocumento("CPF", "529982247")).toBe("529.982.247");
    expect(aplicarMascaraDocumento("CPF", "5299822472")).toBe("529.982.247-2");
  });

  it("descarta letras e o excesso", () => {
    expect(aplicarMascaraDocumento("CPF", "52a998224725999")).toBe("529.982.247-25");
  });

  it("string vazia continua vazia", () => {
    expect(aplicarMascaraDocumento("CPF", "")).toBe("");
  });
});

describe("aplicarMascaraDocumento - CNPJ", () => {
  it("põe a pontuação nas posições fixas", () => {
    expect(aplicarMascaraDocumento("CNPJ", "11222333000181")).toBe("11.222.333/0001-81");
  });

  // O bug relatado: o CNPJ colado pontuado (18 caracteres) era cortado em 14
  // pelo `maxLength` antes da pontuação sair, e sobravam 12 dígitos.
  it("aceita o CNPJ colado já pontuado, inteiro", () => {
    const colado = "11.222.333/0001-81";
    expect(colado.length).toBeLessThanOrEqual(TAMANHO_MASCARA.CNPJ);
    expect(aplicarMascaraDocumento("CNPJ", colado)).toBe("11.222.333/0001-81");
  });

  it("pontua parcialmente enquanto se digita", () => {
    expect(aplicarMascaraDocumento("CNPJ", "11")).toBe("11");
    expect(aplicarMascaraDocumento("CNPJ", "112")).toBe("11.2");
    expect(aplicarMascaraDocumento("CNPJ", "112223330")).toBe("11.222.333/0");
    expect(aplicarMascaraDocumento("CNPJ", "1122233300018")).toBe("11.222.333/0001-8");
  });

  it("aceita o CNPJ alfanumérico e põe as letras em maiúscula", () => {
    expect(aplicarMascaraDocumento("CNPJ", "12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });

  it("descarta letra nas 2 posições dos dígitos verificadores", () => {
    expect(aplicarMascaraDocumento("CNPJ", "12ABC34501DEX35")).toBe("12.ABC.345/01DE-35");
  });

  it("descarta o excesso", () => {
    expect(aplicarMascaraDocumento("CNPJ", "11.222.333/0001-8199")).toBe("11.222.333/0001-81");
  });
});

describe("TAMANHO_MASCARA", () => {
  it("é o comprimento do documento pontuado", () => {
    expect(TAMANHO_MASCARA).toEqual({ CPF: 14, CNPJ: 18 });
  });
});

describe("formatarDocumento", () => {
  it("11 caracteres é CPF", () => {
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
  });

  it("14 caracteres é CNPJ, inclusive alfanumérico", () => {
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarDocumento("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });

  it("outro comprimento volta como está", () => {
    expect(formatarDocumento("12345")).toBe("12345");
  });
});
