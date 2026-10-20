import { describe, expect, it } from "vitest";
import {
  CHAVES_DADOS_PESSOAIS,
  OPCOES_CONDICAO_PCD,
  OPCOES_RACA_ETNIA,
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

  // MTUR-05: Q8 com a nomenclatura do IBGE (Alteracoes_MTur_1, item 3.1).
  it("avalPessoalRacaEtnia tem exatamente Branco, Preto, Pardo, Amarelo, Indígena", () => {
    expect(OPCOES_RACA_ETNIA).toEqual(["Branco", "Preto", "Pardo", "Amarelo", "Indígena"]);
  });

  // MTUR-06: Q9 reduzida a Sim/Não (item 3.2) - o tipo da deficiência deixou
  // de ser perguntado.
  it("avalPessoalCondicaoPcd tem exatamente as duas opções Não/Sim.", () => {
    expect(OPCOES_CONDICAO_PCD).toEqual(["Não sou uma Pessoa com Deficiência.", "Sim."]);
  });

  // MTUR-07: os textos anteriores à revisão deixam de ser válidos.
  it("rejeita o texto antigo Negro em avalPessoalRacaEtnia", () => {
    expect(
      respostasDadosPessoaisSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalPessoalRacaEtnia: "Negro",
      }).success,
    ).toBe(false);
  });

  it.each([
    "Sim, tenho deficiência física (paralisias, amputações, ausência de membros, lesões nervosas ou musculares, etc.)",
    "Sim, tenho deficiência auditiva.",
    "Sim, tenho deficiência visual.",
    "Sim, tenho deficiência intelectual/mental.",
  ])("rejeita o texto antigo %s em avalPessoalCondicaoPcd", (antigo) => {
    expect(
      respostasDadosPessoaisSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalPessoalCondicaoPcd: antigo,
      }).success,
    ).toBe(false);
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
