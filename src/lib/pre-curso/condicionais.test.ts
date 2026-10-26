import { describe, expect, it } from "vitest";
import {
  normalizarCondicionaisPreCurso,
  pendenciasCondicionaisPreCurso,
  REGRAS_CONDICIONAIS_PRE_CURSO,
} from "./condicionais";

// Só as chaves envolvidas nas regras condicionais (as demais não mudam
// de comportamento aqui). Valores transcritos literalmente de
// `docs/Questionario_do_Gestor_Pre_Curso.md`, sem importar as constantes de
// opções: o teste tem de quebrar se alguém renomear uma opção só no código
// de produção.
const CONDICIONAIS_DISPARADAS = {
  qualifVinculoPrograma: "Sim",
  qualifVinculoProgramaQual: "Plano Municipal de Qualificação em Turismo",
  qualifOutrosMunicipios: "Sim",
  qualifOutrosMunicipiosQuais: "Vinhedo e Louveira",
  qualifCaracteristicas: ["Eventos", "Outro"],
  qualifCaracteristicasOutra: "Turismo de aventura",
  publicoInstituicaoExecutora: "Empresa contratada",
  publicoInstituicaoExecutoraNome: "Turismo & Cia Ltda",
  infraEspecificaNecessidade: "Sim, alguns equipamentos específicos são necessários",
  infraEspecificaDisponibilidade: "Há disponibilidade, porém, não em sua totalidade",
  infraEspecificaSuficiencia: "Não",
  infraEspecificaManutencao: "Sim",
  docenteFormaContratacao: "Outro sistema seletivo",
  docenteFormaContratacaoOutra: "Chamamento público simplificado",
  divulgacaoEstrategias: ["Divulgação via carro de som.", "Divulgação via outros canais"],
  divulgacaoEstrategiasOutra: "Mensagens em grupos de WhatsApp de bairro",
  suporteEstrategias: ["Estratégias Financeiras: auxílio financeiro para creche.", "Outros"],
  suporteEstrategiasOutra: "Empréstimo de uniformes",
};

// 9 de REQ-PC-07/08/09 + "7e. Quais?" (APC-04).
it("são exatamente 10 regras condicionais", () => {
  expect(REGRAS_CONDICIONAIS_PRE_CURSO.map((regra) => regra.chave)).toEqual([
    "publicoInstituicaoExecutoraNome",
    "infraEspecificaDisponibilidade",
    "infraEspecificaSuficiencia",
    "infraEspecificaManutencao",
    "qualifVinculoProgramaQual",
    "qualifOutrosMunicipiosQuais",
    "qualifCaracteristicasOutra",
    "docenteFormaContratacaoOutra",
    "divulgacaoEstrategiasOutra",
    "suporteEstrategiasOutra",
  ]);
});

describe("normalizarCondicionaisPreCurso", () => {
  it("condições disparadas -> nada é descartado", () => {
    expect(normalizarCondicionaisPreCurso(CONDICIONAIS_DISPARADAS)).toEqual(
      CONDICIONAIS_DISPARADAS,
    );
  });

  it("as 10 condicionais viram órfãs quando as perguntas-mãe mudam -> todas descartadas", () => {
    const respostas = {
      ...CONDICIONAIS_DISPARADAS,
      qualifVinculoPrograma: "Não",
      qualifOutrosMunicipios: "Não",
      qualifCaracteristicas: ["Eventos"],
      publicoInstituicaoExecutora: "Própria Entidade",
      infraEspecificaNecessidade: "Não, apenas equipamentos básicos",
      docenteFormaContratacao: "Indicação.",
      divulgacaoEstrategias: ["Divulgação via carro de som."],
      suporteEstrategias: ["Estratégias Financeiras: auxílio financeiro para creche."],
    };

    expect(normalizarCondicionaisPreCurso(respostas)).toEqual({
      qualifVinculoPrograma: "Não",
      qualifOutrosMunicipios: "Não",
      qualifCaracteristicas: ["Eventos"],
      publicoInstituicaoExecutora: "Própria Entidade",
      infraEspecificaNecessidade: "Não, apenas equipamentos básicos",
      docenteFormaContratacao: "Indicação.",
      divulgacaoEstrategias: ["Divulgação via carro de som."],
      suporteEstrategias: ["Estratégias Financeiras: auxílio financeiro para creche."],
    });
  });

  it("Q21.1 sobrevive na outra opção que a exige (parceria), não só em 'Empresa contratada'", () => {
    const respostas = {
      publicoInstituicaoExecutora: "Parceria entre Entidade Responsável e Entidade Executora",
      publicoInstituicaoExecutoraNome: "Instituto Parceiro",
    };

    expect(normalizarCondicionaisPreCurso(respostas)).toEqual(respostas);
  });

  it("pergunta-mãe ainda em branco -> a condicional é preservada (preenchimento fora de ordem)", () => {
    const respostas = { qualifVinculoProgramaQual: "Programa em confirmação" };

    expect(normalizarCondicionaisPreCurso(respostas)).toEqual(respostas);
  });

  it("campos não condicionais nunca são tocados", () => {
    const respostas = {
      identifUf: "SP",
      infraBasicaBanheiros: 0,
      qualifVinculoPrograma: "Não",
      qualifVinculoProgramaQual: "sobra de uma escolha anterior",
    };

    expect(normalizarCondicionaisPreCurso(respostas)).toEqual({
      identifUf: "SP",
      infraBasicaBanheiros: 0,
      qualifVinculoPrograma: "Não",
    });
  });

  it("respostas ausentes não quebram a normalização", () => {
    expect(normalizarCondicionaisPreCurso(null)).toEqual({});
    expect(normalizarCondicionaisPreCurso(undefined)).toEqual({});
  });
});

describe("pendenciasCondicionaisPreCurso", () => {
  it("condição disparada e resposta ausente -> pendência", () => {
    expect(pendenciasCondicionaisPreCurso({ qualifVinculoPrograma: "Sim" })).toEqual([
      "qualifVinculoProgramaQual",
    ]);
  });

  // APC-04
  it("Q7d='Sim' e Qual? ausente -> pendência", () => {
    expect(pendenciasCondicionaisPreCurso({ qualifOutrosMunicipios: "Sim" })).toEqual([
      "qualifOutrosMunicipiosQuais",
    ]);
  });

  // APC-05
  it("Q7d='Não' -> nenhuma pendência", () => {
    expect(pendenciasCondicionaisPreCurso({ qualifOutrosMunicipios: "Não" })).toEqual([]);
  });

  it("equipamentos específicos necessários -> as 3 perguntas de Q25 pendentes", () => {
    const pendentes = pendenciasCondicionaisPreCurso({
      infraEspecificaNecessidade: "Sim, alguns equipamentos específicos são necessários",
    });

    expect(pendentes).toEqual([
      "infraEspecificaDisponibilidade",
      "infraEspecificaSuficiencia",
      "infraEspecificaManutencao",
    ]);
  });

  it("texto livre em branco conta como não preenchido", () => {
    const pendentes = pendenciasCondicionaisPreCurso({
      qualifVinculoPrograma: "Sim",
      qualifVinculoProgramaQual: "",
    });

    expect(pendentes).toEqual(["qualifVinculoProgramaQual"]);
  });
});
