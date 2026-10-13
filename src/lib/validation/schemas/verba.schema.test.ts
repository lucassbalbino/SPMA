import { describe, expect, it } from "vitest";
import { edicaoVerbaSchema, verbaSchema } from "./verba.schema";

const CNPJ_GO = "24000001000102";

describe("verbaSchema", () => {
  it("rejeita vlVerba zero", () => {
    const result = verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: 0 });

    expect(result.success).toBe(false);
  });

  it("rejeita vlVerba negativo", () => {
    const result = verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: -100 });

    expect(result.success).toBe(false);
  });

  it("rejeita cdOfertante ausente", () => {
    const result = verbaSchema.safeParse({ vlVerba: 1000 });

    expect(result.success).toBe(false);
  });

  it("rejeita cdOfertante vazio", () => {
    const result = verbaSchema.safeParse({ cdOfertante: "", vlVerba: 1000 });

    expect(result.success).toBe(false);
  });

  it("aceita payload válido só com campos obrigatórios", () => {
    const result = verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: 1000 });

    expect(result.success).toBe(true);
  });

  it("aceita payload válido com dtVerba", () => {
    const result = verbaSchema.safeParse({
      cdOfertante: CNPJ_GO,
      vlVerba: 1000,
      dtVerba: "2026-01-15",
    });

    expect(result.success).toBe(true);
  });
});

describe("edicaoVerbaSchema", () => {
  it("aceita payload sem cdOfertante (não se transfere a verba de ofertante)", () => {
    const result = edicaoVerbaSchema.safeParse({ vlVerba: 500 });

    expect(result.success).toBe(true);
  });

  it("rejeita vlVerba não-positivo", () => {
    const result = edicaoVerbaSchema.safeParse({ vlVerba: 0 });

    expect(result.success).toBe(false);
  });

  it("ignora cdOfertante caso venha no payload (não faz parte do schema de edição)", () => {
    const result = edicaoVerbaSchema.safeParse({ vlVerba: 500, cdOfertante: 999 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("cdOfertante");
    }
  });
});

// GV-03..06, GV-21, GV-33 (gestao-de-verbas): a tela /verbas mostra a
// primeira mensagem do schema, então a mensagem exata faz parte do contrato.
function mensagens(resultado: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultado.success ? [] : (resultado.error?.issues.map((issue) => issue.message) ?? []);
}

describe("verbaSchema - mensagens e limites do valor (gestao-de-verbas)", () => {
  it("GV-03: cdOfertante ausente → 'Ofertante é obrigatório'", () => {
    expect(mensagens(verbaSchema.safeParse({ vlVerba: 1000 }))).toEqual(["Ofertante é obrigatório"]);
  });

  it("GV-03: cdOfertante vazio → 'Ofertante é obrigatório'", () => {
    expect(mensagens(verbaSchema.safeParse({ cdOfertante: "", vlVerba: 1000 }))).toEqual([
      "Ofertante é obrigatório",
    ]);
  });

  it("GV-04: vlVerba ausente → 'Valor da verba é obrigatório'", () => {
    expect(mensagens(verbaSchema.safeParse({ cdOfertante: CNPJ_GO }))).toEqual([
      "Valor da verba é obrigatório",
    ]);
  });

  it("GV-05: vlVerba zero → 'Valor da verba deve ser positivo'", () => {
    expect(mensagens(verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: 0 }))).toEqual([
      "Valor da verba deve ser positivo",
    ]);
  });

  it("GV-05: vlVerba negativo → 'Valor da verba deve ser positivo'", () => {
    expect(mensagens(verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: -1 }))).toEqual([
      "Valor da verba deve ser positivo",
    ]);
  });

  it("GV-06: vlVerba acima de 99999999.99 → 'Valor da verba excede o máximo permitido'", () => {
    expect(mensagens(verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: 100000000 }))).toEqual([
      "Valor da verba excede o máximo permitido",
    ]);
  });

  it("GV-33: vlVerba exatamente 99999999.99 é aceito (limite inclusivo)", () => {
    const resultado = verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: 99999999.99 });

    expect(resultado.success).toBe(true);
    expect(resultado.data?.vlVerba).toBe(99999999.99);
  });

  it("GV-06: vlVerba com 3 casas decimais → 'Valor da verba aceita no máximo 2 casas decimais'", () => {
    expect(mensagens(verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: 10.123 }))).toEqual([
      "Valor da verba aceita no máximo 2 casas decimais",
    ]);
  });

  it("GV-06: 2 casas que o ponto flutuante não representa exato (0.29, 12500.5) são aceitas", () => {
    expect(verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: 0.29 }).success).toBe(true);
    expect(verbaSchema.safeParse({ cdOfertante: CNPJ_GO, vlVerba: 12500.5 }).success).toBe(true);
  });
});

describe("edicaoVerbaSchema - limites do valor (GV-21)", () => {
  it("rejeita vlVerba acima de 99999999.99 com a mesma mensagem da criação", () => {
    expect(mensagens(edicaoVerbaSchema.safeParse({ vlVerba: 100000000 }))).toEqual([
      "Valor da verba excede o máximo permitido",
    ]);
  });

  it("rejeita vlVerba com 3 casas decimais com a mesma mensagem da criação", () => {
    expect(mensagens(edicaoVerbaSchema.safeParse({ vlVerba: 10.123 }))).toEqual([
      "Valor da verba aceita no máximo 2 casas decimais",
    ]);
  });
});
