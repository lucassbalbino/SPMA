import { describe, expect, it } from "vitest";
import {
  criarPreCursoSchema,
  ordemDatasValida,
  respostasPreCursoSchema,
} from "./pre-curso.schema";

// Fixture com as 56 chaves do questionário fonte
// (`docs/Questionario_do_Gestor_Pre_Curso.md`) preenchidas com valores
// válidos, incluindo os 9 condicionais - usada como base para os testes de
// campo individual (spread + override).
const RESPOSTA_VALIDA = {
  identifUf: "SP",
  identifMunicipio: "Campinas",
  identifEntidadeResponsavel: "Secretaria Municipal de Turismo",
  identifCoordenador: "Maria Silva",
  identifEmail: "maria@example.com",
  identifTelefone: "19999990000",

  qualifEndereco: "Rua das Flores, 100",
  qualifNomeCurso: "Guia de Turismo Local",
  qualifVinculoPrograma: "Sim",
  qualifVinculoProgramaQual: "Plano Municipal de Qualificação em Turismo",
  qualifCaracteristicas: ["Guiamento de Turismo / Condução de Turismo", "Outro"],
  qualifCaracteristicasOutra: "Turismo de aventura",
  qualifModalidade: "Presencial",
  qualifRegiao: "Zona Urbana",

  planejDataInicioPrevista: "2026-03-01",
  planejDataTerminoPrevista: "2026-06-01",
  planejCargaHoraria: 120,
  planejNumTurmas: 2,
  planejNumAlunosPrevistos: 40,
  planejTaxaEvasaoEsperada: 10,
  planejObjetivo: "Qualificar guias locais",

  publicoPerfil: ["Jovens", "Mulheres"],
  publicoInstituicaoExecutora: "Empresa contratada",
  publicoInstituicaoExecutoraNome: "Turismo & Cia Ltda",

  diagnosticoConsultas: ["Poder Público: Secretarias, Prefeitura ou outros."],

  infraBasicaBanheiros: 5,
  infraBasicaBebedouros: 5,
  infraBasicaEnergia: 5,
  infraBasicaSalaAula: 5,
  infraBasicaRecepcao: 5,
  infraBasicaBiblioteca: 5,
  infraBasicaMobiliario: 5,
  infraBasicaAcessibilidade: 5,
  infraBasicaLaboratorio: 5,

  infraComplSalaProfessores: 4,
  infraComplSalaGestores: 4,
  infraComplSalaEstudo: 4,
  infraComplCopa: 4,
  infraComplLanchonete: 4,
  infraComplAuditorio: 4,
  infraComplAudiovisual: 4,
  infraComplTecnologicos: 4,

  infraEspecificaNecessidade: "Sim, alguns equipamentos específicos são necessários",
  infraEspecificaDisponibilidade:
    "Há disponibilidade de todos os equipamentos, em condições satisfatórias",
  infraEspecificaSuficiencia: "Sim",
  infraEspecificaManutencao: "Sim",

  docenteCriteriosSelecao: ["Análise do Currículo (Vitae ou Lattes)."],
  docenteFormaContratacao: "Outro sistema seletivo",
  docenteFormaContratacaoOutra: "Chamamento público simplificado",
  docenteNivelFormacao: "Graduação completa.",
  docentePoliticasReparacao: "Sim",

  divulgacaoEstrategias: ["Divulgação via carro de som.", "Divulgação via outros canais"],
  divulgacaoEstrategiasOutra: "Mensagens em grupos de WhatsApp de bairro",

  parceriasEstabelecidas: ["Concessão ou empréstimo de materiais e/ou de equipamentos."],

  suporteEstrategias: ["Estratégias Financeiras: auxílio financeiro para creche.", "Outros"],
  suporteEstrategiasOutra: "Empréstimo de uniformes",
};

describe("criarPreCursoSchema", () => {
  it("rejeita cdVerba ausente", () => {
    const result = criarPreCursoSchema.safeParse({ vlCursoAlocado: 1000 });

    expect(result.success).toBe(false);
  });

  it("rejeita cdVerba não-positivo", () => {
    const result = criarPreCursoSchema.safeParse({
      cdVerba: 0,
      vlCursoAlocado: 1000,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita vlCursoAlocado não-positivo", () => {
    const result = criarPreCursoSchema.safeParse({
      cdVerba: 1,
      vlCursoAlocado: 0,
    });

    expect(result.success).toBe(false);
  });

  it("aceita payload válido", () => {
    const result = criarPreCursoSchema.safeParse({
      cdVerba: 1,
      vlCursoAlocado: 1000,
    });

    expect(result.success).toBe(true);
  });
});

describe("respostasPreCursoSchema", () => {
  it("tem exatamente 56 chaves (questionário fonte, Q1-Q32)", () => {
    expect(Object.keys(respostasPreCursoSchema.shape)).toHaveLength(56);
  });

  it("aceita a fixture completa e válida", () => {
    const result = respostasPreCursoSchema.safeParse(RESPOSTA_VALIDA);

    expect(result.success).toBe(true);
  });

  describe("escala de infraestrutura (Q23 e Q24, 0-5)", () => {
    const CHAVES_INFRAESTRUTURA = [
      "infraBasicaBanheiros",
      "infraBasicaBebedouros",
      "infraBasicaEnergia",
      "infraBasicaSalaAula",
      "infraBasicaRecepcao",
      "infraBasicaBiblioteca",
      "infraBasicaMobiliario",
      "infraBasicaAcessibilidade",
      "infraBasicaLaboratorio",
      "infraComplSalaProfessores",
      "infraComplSalaGestores",
      "infraComplSalaEstudo",
      "infraComplCopa",
      "infraComplLanchonete",
      "infraComplAuditorio",
      "infraComplAudiovisual",
      "infraComplTecnologicos",
    ] as const;

    it("tem 17 chaves de infraestrutura no questionário (9 + 8)", () => {
      expect(CHAVES_INFRAESTRUTURA).toHaveLength(17);
    });

    it.each(CHAVES_INFRAESTRUTURA)("%s aceita 0 (Não há disponibilidade)", (chave) => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [chave]: 0,
      });

      expect(result.success).toBe(true);
    });

    it.each(CHAVES_INFRAESTRUTURA)("%s aceita 5 (Ótimo)", (chave) => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [chave]: 5,
      });

      expect(result.success).toBe(true);
    });

    it.each(CHAVES_INFRAESTRUTURA)("%s rejeita 6 (fora da escala)", (chave) => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [chave]: 6,
      });

      expect(result.success).toBe(false);
    });

    it.each(CHAVES_INFRAESTRUTURA)("%s rejeita -1 (fora da escala)", (chave) => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [chave]: -1,
      });

      expect(result.success).toBe(false);
    });

    it.each(CHAVES_INFRAESTRUTURA)("%s rejeita 2.5 (decimal)", (chave) => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [chave]: 2.5,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("campos de seleção única", () => {
    it("qualifModalidade rejeita valor fora do enum", () => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        qualifModalidade: "Semipresencial",
      });

      expect(result.success).toBe(false);
    });

    it("publicoInstituicaoExecutora rejeita valor fora do enum", () => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        publicoInstituicaoExecutora: "Outra entidade qualquer",
      });

      expect(result.success).toBe(false);
    });

    it("infraEspecificaNecessidade rejeita valor fora do enum", () => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        infraEspecificaNecessidade: "Talvez",
      });

      expect(result.success).toBe(false);
    });

    it("docenteNivelFormacao rejeita valor fora do enum", () => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        docenteNivelFormacao: "Curso técnico",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("campos de seleção múltipla", () => {
    it("qualifCaracteristicas aceita array de opções válidas", () => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        qualifCaracteristicas: ["Eventos", "Turismo de Base Comunitária"],
        qualifCaracteristicasOutra: undefined,
      });

      expect(result.success).toBe(true);
    });

    it("qualifCaracteristicas rejeita item fora do enum", () => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        qualifCaracteristicas: ["Item inventado"],
      });

      expect(result.success).toBe(false);
    });

    it("publicoPerfil rejeita array vazio (obrigatório >= 1)", () => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        publicoPerfil: [],
      });

      expect(result.success).toBe(false);
    });

    it("parceriasEstabelecidas rejeita item fora do enum", () => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        parceriasEstabelecidas: ["Parceria inventada"],
      });

      expect(result.success).toBe(false);
    });
  });

  // As perguntas de múltipla escolha cuja última alternativa nega todas as
  // outras ("Não foram realizadas...", "Nenhuma...") - a combinação é
  // contraditória e é barrada no servidor, não só escondida na UI.
  describe("opções excludentes das perguntas de seleção múltipla", () => {
    const CASOS = [
      {
        chave: "diagnosticoConsultas",
        exclusiva:
          "Não foram realizadas consultas individuais prévias e/ou reuniões com nenhum dos representantes dos grupos de atores locais.",
        outra: "Poder Público: Secretarias, Prefeitura ou outros.",
      },
      {
        chave: "docenteCriteriosSelecao",
        exclusiva:
          "Não foi realizada a avaliação da trajetória profissional e do histórico de formação do(a) candidato(a).",
        outra: "Análise do Currículo (Vitae ou Lattes).",
      },
      {
        chave: "divulgacaoEstrategias",
        exclusiva: "Não foram adotadas estratégias de divulgação do Curso.",
        outra: "Divulgação via carro de som.",
      },
      {
        chave: "parceriasEstabelecidas",
        exclusiva: "Não foram estabelecidas parcerias para realização do Curso.",
        outra: "Concessão ou empréstimo de materiais e/ou de equipamentos.",
      },
      {
        chave: "suporteEstrategias",
        exclusiva:
          "Não foram adotadas estratégias logísticas, políticas ou financeiras de suporte ao aluno.",
        outra: "Estratégias Financeiras: auxílio financeiro para creche.",
      },
    ] as const;

    it.each(CASOS)("$chave aceita a opção excludente sozinha", ({ chave, exclusiva }) => {
      const result = respostasPreCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [chave]: [exclusiva],
        // Os campos "Qual?/Quais?" de Q30/Q32 deixam de ser alcançáveis
        // quando a excludente é a única marcada.
        divulgacaoEstrategiasOutra: undefined,
        suporteEstrategiasOutra: undefined,
      });

      expect(result.success).toBe(true);
    });

    it.each(CASOS)(
      "$chave rejeita a opção excludente combinada com outra",
      ({ chave, exclusiva, outra }) => {
        const result = respostasPreCursoSchema.safeParse({
          ...RESPOSTA_VALIDA,
          [chave]: [outra, exclusiva],
        });

        expect(result.success).toBe(false);
      },
    );
  });

  describe("forma parcial (PATCH, REQ-PC-04/05)", () => {
    it("aceita objeto vazio", () => {
      const result = respostasPreCursoSchema.partial().safeParse({});

      expect(result.success).toBe(true);
    });

    it("aceita um subconjunto de 1 campo válido", () => {
      const result = respostasPreCursoSchema.partial().safeParse({
        identifUf: "RJ",
      });

      expect(result.success).toBe(true);
    });

    it("ainda rejeita um campo presente com valor fora de forma", () => {
      const result = respostasPreCursoSchema.partial().safeParse({
        infraBasicaBanheiros: 9,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("ordemDatasValida (edge case: término antes do início)", () => {
    it("término anterior ao início -> inválido", () => {
      expect(
        ordemDatasValida({
          planejDataInicioPrevista: "2026-06-01",
          planejDataTerminoPrevista: "2026-03-01",
        }),
      ).toBe(false);
    });

    it("término igual ao início -> válido", () => {
      expect(
        ordemDatasValida({
          planejDataInicioPrevista: "2026-06-01",
          planejDataTerminoPrevista: "2026-06-01",
        }),
      ).toBe(true);
    });

    it("término posterior ao início -> válido", () => {
      expect(
        ordemDatasValida({
          planejDataInicioPrevista: "2026-03-01",
          planejDataTerminoPrevista: "2026-06-01",
        }),
      ).toBe(true);
    });

    it("só uma das datas presente -> válido (regra não se aplica ainda)", () => {
      expect(
        ordemDatasValida({ planejDataInicioPrevista: "2026-06-01" }),
      ).toBe(true);
      expect(
        ordemDatasValida({ planejDataTerminoPrevista: "2026-03-01" }),
      ).toBe(true);
    });

    it("nenhuma das datas presente -> válido", () => {
      expect(ordemDatasValida({})).toBe(true);
    });
  });
});
