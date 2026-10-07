// O gerador das fixtures precisa produzir CNPJ que a validação do PRODUTO
// aceite - senão os specs falham por fixture inválida, não pelo que testam.
// Por isso o teste confere contra `validarCNPJ` de `src/lib/validation/cnpj`,
// a mesma função que `usuarioSchema` usa, em vez de reimplementar o módulo 11.
import { describe, expect, it } from "vitest";
import { geradorDeCnpj } from "./cnpj";
import { validarCNPJ } from "../../src/lib/validation/cnpj";

describe("geradorDeCnpj", () => {
  it("produz CNPJ que o validador do produto aceita", () => {
    const gerar = geradorDeCnpj("30");

    for (let indice = 1; indice <= 25; indice++) {
      expect(validarCNPJ(gerar(indice))).toBe(true);
    }
  });

  it("sempre devolve 14 dígitos", () => {
    expect(geradorDeCnpj("42")(7)).toHaveLength(14);
  });

  // A razão de o prefixo existir: specs diferentes não podem colidir, porque
  // cada um apaga os próprios CNPJs no beforeAll/afterAll contra o mesmo banco.
  it("prefixos diferentes nunca colidem para o mesmo índice", () => {
    expect(geradorDeCnpj("30")(1)).not.toBe(geradorDeCnpj("42")(1));
  });

  it("é determinístico", () => {
    expect(geradorDeCnpj("11")(3)).toBe(geradorDeCnpj("11")(3));
  });

  it("recusa prefixo que não tem 2 dígitos", () => {
    expect(() => geradorDeCnpj("3")).toThrow();
    expect(() => geradorDeCnpj("300")).toThrow();
    expect(() => geradorDeCnpj("ab")).toThrow();
  });
});
