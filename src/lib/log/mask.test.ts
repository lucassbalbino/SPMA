// Testes unitários do mascaramento de CPF em log (REQ-SEC-12 / CA-SEC-12).
import { describe, expect, it } from "vitest";
import { mascararCPF } from "./mask";

describe("mascararCPF", () => {
  it("mascara um CPF de 11 dígitos mantendo os 3 primeiros e os 2 últimos", () => {
    expect(mascararCPF("52998224725")).toBe("529******25");
  });

  it("mascara corretamente um CPF formatado com pontuação", () => {
    expect(mascararCPF("529.982.247-25")).toBe("529******25");
  });

  it("não lança exceção para entrada mais curta que um CPF real", () => {
    expect(() => mascararCPF("123")).not.toThrow();
    expect(mascararCPF("123")).toBe("***");
  });

  it("não lança exceção para entrada vazia", () => {
    expect(() => mascararCPF("")).not.toThrow();
    expect(mascararCPF("")).toBe("");
  });
});
