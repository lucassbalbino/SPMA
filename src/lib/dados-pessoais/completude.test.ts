import { describe, expect, it } from "vitest";
import { CHAVES_DADOS_PESSOAIS } from "../validation/schemas/dados-pessoais.schema";
import { validarCompletudeDadosPessoais } from "./completude";

const COMPLETO = {
  avalPessoalEstado: "AM",
  avalPessoalMunicipio: "Manaus, AM",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "26 a 35 anos",
  avalPessoalEscolaridade: "Ensino médio completo",
  avalPessoalRacaEtnia: "Pardo",
  avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
} as const;

describe("validarCompletudeDadosPessoais", () => {
  it("com as 7 respostas válidas devolve completo, sem pendência", () => {
    expect(validarCompletudeDadosPessoais(COMPLETO)).toEqual({
      completo: true,
      pendentes: [],
    });
  });

  it("com nenhuma resposta aponta as 7 como pendentes", () => {
    const resultado = validarCompletudeDadosPessoais({});

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes.sort()).toEqual([...CHAVES_DADOS_PESSOAIS].sort());
  });

  // Cada campo é afirmado individualmente, não por amostra: uma das 7 ausente
  // basta para barrar o Aluno (PESSOAL-05).
  for (const chave of CHAVES_DADOS_PESSOAIS) {
    it(`aponta ${chave} como pendente quando ela é a única ausente`, () => {
      const semUma: Record<string, unknown> = { ...COMPLETO };
      delete semUma[chave];

      const resultado = validarCompletudeDadosPessoais(semUma);

      expect(resultado.completo).toBe(false);
      expect(resultado.pendentes).toEqual([chave]);
    });
  }

  it("aponta a chave como pendente quando o valor está fora do enum", () => {
    const resultado = validarCompletudeDadosPessoais({
      ...COMPLETO,
      avalPessoalCondicaoPcd: "Sim",
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toEqual(["avalPessoalCondicaoPcd"]);
  });

  it("aponta a chave como pendente quando o município vem vazio", () => {
    const resultado = validarCompletudeDadosPessoais({
      ...COMPLETO,
      avalPessoalMunicipio: "",
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toEqual(["avalPessoalMunicipio"]);
  });
});
