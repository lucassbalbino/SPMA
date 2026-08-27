import { describe, expect, it } from "vitest";
import {
  criarPreCursoSchema,
  ordemDatasValida,
  respostasPreCursoSchema,
} from "./pre-curso.schema";

// Fixture com os 56 campos do Dicionário de Campos (spec.md) preenchidos com
// valores válidos, incluindo os 9 condicionais - usada como base para os
// testes de campo individual (spread + override).
const RESPOSTA_VALIDA = {
  identifUf: "SP",
  identifMunicipio: "Campinas",
  identifEntidadeResponsavel: "Secretaria Municipal de Turismo",
  identifCoordenador: "Maria Silva",
  identifEmail: "maria@example.com",
  identifTelefone: "19999990000",

  qualifEndereco: "Rua das Flores, 100",
  qualifNomeCurso: "Guia de Turismo Local",
  qualifVinculoPrograma: "Outro",
  qualifVinculoProgramaOutro: "Programa municipal específico",
  qualifCaracteristicas: ["Sustentabilidade", "Outra"],
  qualifCaracteristicasOutra: "Foco em turismo de aventura",
  qualifModalidade: "Presencial",
  qualifRegiao: "Sudeste",

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

  diagnosticoConsultas: ["Poder público municipal"],

  infraBasicaBanheiros: 5,
  infraBasicaEnergia: 5,
  infraBasicaSalaAula: 5,
  infraBasicaBiblioteca: 5,
  infraBasicaAcessibilidade: 5,
  infraBasicaLaboratorio: 5,
  infraBasicaAguaPotavel: 5,
  infraBasicaIluminacao: 5,
  infraBasicaConectividade: 5,

  infraComplSalaProfessores: 4,
  infraComplCopa: 4,
  infraComplAuditorio: 4,
  infraComplAudiovisual: 4,
  infraComplTecnologicos: 4,
  infraComplConvivencia: 4,
  infraComplEstacionamento: 4,
  infraComplAlimentacao: 4,

  infraEspecificaNecessidade: "Sim",
  infraEspecificaDisponibilidade: "Disponível",
  infraEspecificaSuficiencia: "Suficiente",
  infraEspecificaManutencao: "Em bom estado",

  docenteCriteriosSelecao: ["Formação acadêmica"],
  docenteFormaContratacao: "Outra",
  docenteFormaContratacaoOutra: "Cooperativa de professores",
  docenteNivelFormacao: "Graduação",
  docentePoliticasReparacao: ["Nenhuma política aplicada"],

  divulgacaoEstrategias: ["Redes sociais", "Outra"],
  divulgacaoEstrategiasOutra: "Carro de som",

  parceriasEstabelecidas: ["Prefeitura municipal"],

  suporteEstrategias: ["Auxílio transporte", "Outra"],
  suporteEstrategiasOutra: "Apoio psicológico",
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
  it("tem exatamente 56 chaves (Dicionário de Campos, spec.md)", () => {
    expect(Object.keys(respostasPreCursoSchema.shape)).toHaveLength(56);
  });

  it("aceita a fixture completa e válida", () => {
    const result = respostasPreCursoSchema.safeParse(RESPOSTA_VALIDA);

    expect(result.success).toBe(true);
  });

  describe("escala de infraestrutura (Blocos 6 e 7, 0-5)", () => {
    const CHAVES_INFRAESTRUTURA = [
      "infraBasicaBanheiros",
      "infraBasicaEnergia",
      "infraBasicaSalaAula",
      "infraBasicaBiblioteca",
      "infraBasicaAcessibilidade",
      "infraBasicaLaboratorio",
      "infraBasicaAguaPotavel",
      "infraBasicaIluminacao",
      "infraBasicaConectividade",
      "infraComplSalaProfessores",
      "infraComplCopa",
      "infraComplAuditorio",
      "infraComplAudiovisual",
      "infraComplTecnologicos",
      "infraComplConvivencia",
      "infraComplEstacionamento",
      "infraComplAlimentacao",
    ] as const;

    it("tem 17 chaves de infraestrutura no dicionário (9 + 8)", () => {
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
        qualifCaracteristicas: ["Turismo rural", "Turismo cultural"],
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
