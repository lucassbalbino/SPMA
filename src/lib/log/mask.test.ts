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

  // UGO-12/AD-043: CNPJ do GO NÃO é mascarado em produção (é registro público
  // de pessoa jurídica, diferente de CPF sob LGPD) - nenhum call site de
  // produção passa `usuario.documento` de um GO por `mascararCPF` (grep em
  // `src/`: o único call site de produção é `mascararCPFsNoTexto`, em
  // `src/lib/errors/api-error.ts`, que só extrai substrings no formato de CPF
  // de 11 dígitos de um texto livre - nunca recebe um documento de GO
  // inteiro). Este teste documenta, como guarda de regressão, que aplicar
  // `mascararCPF` a um CNPJ de 14 dígitos produz uma máscara "de CPF"
  // (comportamento aceito da função genérica, não usado assim em produção) -
  // se algum dia um call site novo passar a fazer isso por engano, este teste
  // não é o que vai pegar o engano (ele documenta a forma, não proíbe o uso);
  // a garantia real é o grep acima, repetido a cada tarefa que tocar log/CNPJ.
  it("aplicado a um CNPJ de 14 dígitos produz uma máscara 'de CPF' (forma aceita, não usada em produção para CNPJ)", () => {
    expect(mascararCPF("11222333000181")).toBe("112*********81");
  });
});
