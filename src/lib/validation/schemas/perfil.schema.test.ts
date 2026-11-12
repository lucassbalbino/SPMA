import { describe, expect, it } from "vitest";
import { perfilSchema } from "./perfil.schema";

const VALIDO = { nome: "Maria Souza", email: "maria@exemplo.org", telefone: "(61) 99928-1374" };

describe("perfilSchema (RU-49, RU-50)", () => {
  it("aceita nome, e-mail e telefone e grava o telefone só com dígitos", () => {
    expect(perfilSchema.parse(VALIDO)).toEqual({
      nome: "Maria Souza",
      email: "maria@exemplo.org",
      telefone: "61999281374",
    });
  });

  it("telefone vazio vira null (opcional para quem não é GO)", () => {
    expect(perfilSchema.parse({ ...VALIDO, telefone: "" }).telefone).toBeNull();
  });

  it.each([
    ["nome vazio", { nome: "  " }, "Nome é obrigatório"],
    ["e-mail inválido", { email: "sem-arroba" }, "E-mail inválido"],
    ["telefone sem DDD", { telefone: "99928-1374" }, "Informe o telefone com DDD, ex.: (61) 99999-9999"],
  ])("RU-50: %s recusa com a mensagem do campo", (_caso, troca, mensagem) => {
    const resultado = perfilSchema.safeParse({ ...VALIDO, ...troca });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(mensagem);
  });

  // Telefone ausente = não mexer no gravado (telefone antigo, Fix 2).
  it("sem `telefone` no corpo, o resultado não traz telefone", () => {
    expect(perfilSchema.parse({ nome: "Maria", email: "maria@exemplo.org" }).telefone).toBeUndefined();
  });

  // RU-54: documento no corpo não passa adiante.
  it("descarta `documento` do corpo", () => {
    expect(perfilSchema.parse({ ...VALIDO, documento: "52998224725" })).not.toHaveProperty(
      "documento",
    );
  });
});
