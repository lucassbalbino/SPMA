import { describe, expect, it } from "vitest";
import {
  exibirTelefone,
  MENSAGEM_TELEFONE,
  mascaraTelefone,
  telefoneObrigatorioSchema,
  telefoneOpcionalSchema,
  telefoneValido,
} from "./telefone";

describe("telefoneValido (RU-45)", () => {
  it.each(["6133334444", "61999281374", "(61) 99928-1374", "11 4000-0002"])(
    "aceita %s (10 ou 11 dígitos com DDD)",
    (valor) => {
      expect(telefoneValido(valor)).toBe(true);
    },
  );

  it.each([
    ["sem DDD (o caso do doc 2)", "999281374"],
    ["12 dígitos", "619992813740"],
    ["DDD 10", "1099928137"],
    ["DDD 00", "0099928137"],
    ["vazio", ""],
  ])("recusa %s", (_caso, valor) => {
    expect(telefoneValido(valor)).toBe(false);
  });
});

describe("mascaraTelefone (RU-44)", () => {
  it.each([
    ["", ""],
    ["6", "(6"],
    ["61", "(61"],
    ["619", "(61) 9"],
    ["619992", "(61) 9992"],
    ["6133334444", "(61) 3333-4444"],
    ["61999281374", "(61) 99928-1374"],
    ["619992813749999", "(61) 99928-1374"],
    ["(61) 99928-1374", "(61) 99928-1374"],
  ])("%s vira %s", (entrada, esperado) => {
    expect(mascaraTelefone(entrada)).toBe(esperado);
  });
});

describe("exibirTelefone", () => {
  it("telefone gravado pela regra (só dígitos, com DDD) aparece com máscara", () => {
    expect(exibirTelefone("61999281374")).toBe("(61) 99928-1374");
  });

  it.each([["(61) 3333-4444 ramal 2"], ["11 4000-0002"], ["999281374"], [""]])(
    "telefone antigo %o aparece como foi gravado",
    (gravado) => {
      expect(exibirTelefone(gravado)).toBe(gravado);
    },
  );
});

describe("telefoneObrigatorioSchema (RU-45, RU-46)", () => {
  const schema = telefoneObrigatorioSchema("Telefone é obrigatório");

  it("grava só os dígitos", () => {
    expect(schema.parse("(61) 99928-1374")).toBe("61999281374");
  });

  it("vazio recusa com a mensagem de obrigatório", () => {
    const resultado = schema.safeParse("");
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("Telefone é obrigatório");
  });

  it("sem DDD recusa com a mensagem de formato", () => {
    const resultado = schema.safeParse("999281374");
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(MENSAGEM_TELEFONE);
    expect(MENSAGEM_TELEFONE).toBe("Informe o telefone com DDD, ex.: (61) 99999-9999");
  });
});

describe("telefoneOpcionalSchema", () => {
  it.each([[""], [undefined], [null]])("%o vira null", (valor) => {
    expect(telefoneOpcionalSchema.parse(valor)).toBeNull();
  });

  it("preenchido grava só os dígitos", () => {
    expect(telefoneOpcionalSchema.parse("(11) 4000-0002")).toBe("1140000002");
  });

  it("preenchido sem DDD recusa", () => {
    const resultado = telefoneOpcionalSchema.safeParse("40000002");
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(MENSAGEM_TELEFONE);
  });
});
