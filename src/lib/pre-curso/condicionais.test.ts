import { describe, expect, it } from "vitest";
import {
  normalizarCondicionaisPreCurso,
  pendenciasCondicionaisPreCurso,
} from "./condicionais";

// Só as chaves envolvidas nas 9 regras condicionais (as outras 47 não mudam
// de comportamento aqui). Valores transcritos literalmente de
// `docs/Questionario_do_Gestor_Pre_Curso.md`, sem importar as constantes de
// opções: o teste tem de quebrar se alguém renomear uma opção só no código
// de produção.
const CONDICIONAIS_DISPARADAS = {
  qualifVinculoPrograma: "Sim",
  qualifVinculoProgramaQual: "Plano Municipal de Qualificação em Turismo",
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

describe("normalizarCondicionaisPreCurso", () => {
  it("condições disparadas -> nada é descartado", () => {
    expect(normalizarCondicionaisPreCurso(CONDICIONAIS_DISPARADAS)).toEqual(
      CONDICIONAIS_DISPARADAS,
    );
  });

  it("as 9 condicionais viram órfãs quando as perguntas-mãe mudam -> todas descartadas", () => {
    const respostas = {
      ...CONDICIONAIS_DISPARADAS,
      qualifVinculoPrograma: "Não",
      qualifCaracteristicas: ["Eventos"],
      publicoInstituicaoExecutora: "Própria Entidade",
      infraEspecificaNecessidade: "Não, apenas equipamentos básicos",
      docenteFormaContratacao: "Indicação.",
      divulgacaoEstrategias: ["Divulgação via carro de som."],
      suporteEstrategias: ["Estratégias Financeiras: auxílio financeiro para creche."],
    };

    expect(normalizarCondicionaisPreCurso(respostas)).toEqual({
      qualifVinculoPrograma: "Não",
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
