import { describe, expect, it } from "vitest";
import { ofertanteSchema } from "./ofertante.schema";

describe("ofertanteSchema", () => {
  it("rejeita quando nome está ausente", () => {
    const result = ofertanteSchema.safeParse({
      uf: "SP",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita quando uf está ausente", () => {
    const result = ofertanteSchema.safeParse({
      nome: "Instituto Exemplo",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita uf com tamanho diferente de 2 caracteres", () => {
    const result = ofertanteSchema.safeParse({
      nome: "Instituto Exemplo",
      uf: "SPP",
    });

    expect(result.success).toBe(false);
  });

  it("aceita payload válido com apenas os campos obrigatórios", () => {
    const result = ofertanteSchema.safeParse({
      nome: "Instituto Exemplo",
      uf: "SP",
    });

    expect(result.success).toBe(true);
  });

  it("aceita payload válido com todos os campos opcionais preenchidos", () => {
    const result = ofertanteSchema.safeParse({
      nome: "Instituto Exemplo",
      responsavel: "Fulano de Tal",
      email: "contato@exemplo.org",
      telefone: "11999999999",
      uf: "SP",
      municipio: "São Paulo",
    });

    expect(result.success).toBe(true);
  });
});
