import { describe, expect, it } from "vitest";
import { organizacaoSchema } from "./organizacao.schema";

describe("organizacaoSchema", () => {
  it("rejeita quando nome está ausente", () => {
    const result = organizacaoSchema.safeParse({
      uf: "SP",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita quando uf está ausente", () => {
    const result = organizacaoSchema.safeParse({
      nome: "Instituto Exemplo",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita uf com tamanho diferente de 2 caracteres", () => {
    const result = organizacaoSchema.safeParse({
      nome: "Instituto Exemplo",
      uf: "SPP",
    });

    expect(result.success).toBe(false);
  });

  it("aceita payload válido com apenas os campos obrigatórios", () => {
    const result = organizacaoSchema.safeParse({
      nome: "Instituto Exemplo",
      uf: "SP",
    });

    expect(result.success).toBe(true);
  });

  it("aceita payload válido com todos os campos opcionais preenchidos", () => {
    const result = organizacaoSchema.safeParse({
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
