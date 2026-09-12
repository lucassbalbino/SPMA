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
