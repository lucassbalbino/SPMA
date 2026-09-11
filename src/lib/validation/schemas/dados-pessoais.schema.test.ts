import { describe, expect, it } from "vitest";
import {
  CHAVES_DADOS_PESSOAIS,
  OPCOES_CONDICAO_PCD,
  respostasDadosPessoaisSchema,
} from "./dados-pessoais.schema";

// As 7 respostas pessoais válidas (Q3-Q9).
const RESPOSTA_VALIDA = {
  avalPessoalEstado: "AM",
  avalPessoalMunicipio: "Manaus, AM",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "26 a 35 anos",
  avalPessoalEscolaridade: "Ensino médio completo",
  avalPessoalRacaEtnia: "Pardo",
  avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
} as const;

describe("respostasDadosPessoaisSchema", () => {
  it("aceita as 7 respostas pessoais preenchidas", () => {
    expect(respostasDadosPessoaisSchema.safeParse(RESPOSTA_VALIDA).success).toBe(true);
  });

  // Toda chave é `.optional()`: a obrigatoriedade vive em completude.ts, não
  // aqui - é o que permite o PATCH de edição enviar um campo só.
  it("aceita objeto vazio (forma, não obrigatoriedade)", () => {
    expect(respostasDadosPessoaisSchema.safeParse({}).success).toBe(true);
  });

  it("rejeita UF fora da lista", () => {
    expect(
      respostasDadosPessoaisSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalPessoalEstado: "XX",
      }).success,
    ).toBe(false);
  });

  it("rejeita município vazio", () => {
    expect(
      respostasDadosPessoaisSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalPessoalMunicipio: "",
      }).success,
    ).toBe(false);
  });

  // Mesma regra que `avaliacao.schema.test.ts` provava no lugar antigo,
  // preservada aqui: Q9 pede o TIPO da deficiência, não Sim/Não.
  it("avalPessoalCondicaoPcd é o tipo da deficiência, não Sim/Não (Q9)", () => {
    expect(
      respostasDadosPessoaisSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalPessoalCondicaoPcd: "Sim",
      }).success,
    ).toBe(false);

    expect(
      respostasDadosPessoaisSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalPessoalCondicaoPcd: "Sim, tenho deficiência auditiva.",
      }).success,
    ).toBe(true);
  });

  it("aceita cada uma das opções de OPCOES_CONDICAO_PCD", () => {
    for (const opcao of OPCOES_CONDICAO_PCD) {
      expect(
        respostasDadosPessoaisSchema.safeParse({
          ...RESPOSTA_VALIDA,
          avalPessoalCondicaoPcd: opcao,
        }).success,
      ).toBe(true);
    }
  });
});

// PESSOAL-10: a fronteira é declarada num único lugar, e é dela que gravação,
// leitura e gate derivam.
describe("CHAVES_DADOS_PESSOAIS", () => {
  it("lista exatamente as 7 chaves pessoais (Q3-Q9)", () => {
    expect([...CHAVES_DADOS_PESSOAIS]).toEqual([
      "avalPessoalEstado",
      "avalPessoalMunicipio",
      "avalPessoalGenero",
      "avalPessoalFaixaEtaria",
      "avalPessoalEscolaridade",
      "avalPessoalRacaEtnia",
      "avalPessoalCondicaoPcd",
    ]);
  });

  it("cobre todas as chaves do schema, sem sobra", () => {
    expect([...CHAVES_DADOS_PESSOAIS].sort()).toEqual(
      Object.keys(respostasDadosPessoaisSchema.shape).sort(),
    );
  });
});
