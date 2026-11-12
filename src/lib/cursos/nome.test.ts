import { describe, expect, it } from "vitest";
import { nomeDaFormacao } from "./nome";

describe("nomeDaFormacao (RU-10)", () => {
  it("usa a P8 quando preenchida", () => {
    expect(nomeDaFormacao("Mecânica Básica", 4)).toBe("Mecânica Básica");
  });

  it("tira os espaços das pontas da P8", () => {
    expect(nomeDaFormacao("  Mecânica Básica  ", 4)).toBe("Mecânica Básica");
  });

  it.each([
    ["só espaços", "   "],
    ["vazia", ""],
    ["nula", null],
    ["ausente", undefined],
  ])("P8 %s vira o texto de reserva com o número do curso", (_caso, p8) => {
    expect(nomeDaFormacao(p8, 7)).toBe("Formação sem nome (nº 7)");
  });
});
