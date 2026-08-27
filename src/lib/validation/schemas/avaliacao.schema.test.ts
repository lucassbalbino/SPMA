import { describe, expect, it } from "vitest";
import {
  CHAVES_PARTE_1,
  matricularAlunoSchema,
  respostasAvaliacaoSchema,
} from "./avaliacao.schema";

// Fixture com as 44 chaves do Dicionário de Campos (spec.md) preenchidas com
// valores válidos, incluindo os 4 condicionais aplicáveis - usada como base
// para os testes de campo individual (spread + override).
const RESPOSTA_VALIDA = {
  // Parte 1 - Dados Pessoais
  avalPessoalEstado: "SP",
  avalPessoalMunicipio: "Ubatuba",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "25 a 34 anos",
  avalPessoalEscolaridade: "Médio completo",
  avalPessoalRacaEtnia: "Parda",
  avalPessoalCondicaoPcd: "Não",

  // Parte 1 - Situação Profissional
  avalProfissCondicaoTrabalho: "Desempregado(a)",
  avalProfissAtuaTurismo: "Sim",
  avalProfissAtividadeEspecifica: "Recepção em pousada local",
  avalProfissFaixaRenda: "Até 1 salário mínimo",

  // Parte 1 - Experiência
  avalExperienciaTrabalhoPrevio: "Não",
  avalExperienciaCursoAnterior: "Sim",
  avalExperienciaTipoCursoAnterior: "Curso livre",

  // Parte 1 - Motivação
  avalMotivMotivosParticipacao: ["Geração de renda", "Qualificação profissional"],
  avalMotivFormaConhecimento: "Redes sociais",

  // Parte 1 - Expectativas
  avalExpectAtendimento: "Atendeu totalmente",
  avalExpectEmprego: "Atendeu parcialmente",
  avalExpectRenda: "Superou minhas expectativas",

  // Parte 2 - Participação
  avalParticipConcluiuCurso: "Sim",
  avalParticipMotivoNaoConclusao: undefined,
  avalParticipPercentualFrequencia: 90,

  // Parte 2 - Avaliação do Curso
  avalCursoDinamicasInclusao: 5,
  avalCursoMaterialDidatico: 4,
  avalCursoConteudo: 5,
  avalCursoClareza: 4,
  avalCursoConhecimentoInstrutores: 5,
  avalCursoOrganizacao: 4,
  avalCursoInfraestruturaBasica: 3,
  avalCursoInfraestruturaSalaAula: 3,

  // Parte 2 - Aprendizado
  avalAprendizAmpliacaoConhecimento: "Sim, totalmente",
  avalAprendizAtendimentoExpectativas: "Atendeu totalmente",
  avalAprendizSensacaoPreparo: "Sim, me sinto totalmente preparado(a)",

  // Parte 2 - Continuidade
  avalContinuidadeRetomadaEstudos: "Pretendo retomar em breve",

  // Parte 2 - Motivações Pós-Curso
  avalMotivacoesPosPercepcoes: ["Maior autoconfiança", "Vontade de empreender"],

  // Parte 2 - Oportunidades de Trabalho
  avalOportunSituacaoTrabalho: "Empregado(a) na área de Turismo",
  avalOportunIntencaoAtuarTurismo: "Sim",

  // Parte 2 - Efetivação e Renda
  avalEfetivEmprego: "Sim",
  avalEfetivAumentoRenda: "Sim",
  avalEfetivMelhoriaPadraoVida: "Sim",

  // Parte 2 - Avaliação Geral
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Sim",
  avalGeralRecomendaCurso: "Sim",
  avalGeralComentariosFinais: "Curso excelente, mudou minha perspectiva de carreira",
};

describe("matricularAlunoSchema", () => {
  it("aceita CPF válido e cdCurso positivo", () => {
    const result = matricularAlunoSchema.safeParse({
      cpf: "111.444.777-35",
      cdCurso: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita CPF com dígito verificador inválido", () => {
    const result = matricularAlunoSchema.safeParse({
      cpf: "111.444.777-36",
      cdCurso: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita cdCurso ausente", () => {
    const result = matricularAlunoSchema.safeParse({ cpf: "111.444.777-35" });
    expect(result.success).toBe(false);
  });

  it("rejeita cdCurso não-positivo", () => {
    expect(
      matricularAlunoSchema.safeParse({ cpf: "111.444.777-35", cdCurso: 0 }).success,
    ).toBe(false);
  });
});

describe("respostasAvaliacaoSchema", () => {
  it("aceita a resposta válida completa", () => {
    const result = respostasAvaliacaoSchema.safeParse(RESPOSTA_VALIDA);
    expect(result.success).toBe(true);
  });

  it("tem exatamente 44 chaves (Dicionário de Campos, spec.md)", () => {
    expect(Object.keys(respostasAvaliacaoSchema.shape)).toHaveLength(44);
  });

  it("aceita objeto vazio (todas as chaves são opcionais na FORMA)", () => {
    expect(respostasAvaliacaoSchema.safeParse({}).success).toBe(true);
  });

  it("aceita um subconjunto de 1 campo válido", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      avalPessoalMunicipio: "Ubatuba",
    });
    expect(result.success).toBe(true);
  });

  it("avalPessoalGenero rejeita valor fora do enum", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalPessoalGenero: "Inventado",
    });
    expect(result.success).toBe(false);
  });

  it("avalOportunSituacaoTrabalho rejeita valor fora do enum", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalOportunSituacaoTrabalho: "Inventado",
    });
    expect(result.success).toBe(false);
  });

  it("campo de seleção múltipla aceita array de opções válidas", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalMotivMotivosParticipacao: ["Geração de renda"],
    });
    expect(result.success).toBe(true);
  });

  it("campo de seleção múltipla rejeita item fora do enum", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalMotivMotivosParticipacao: ["Motivo inventado"],
    });
    expect(result.success).toBe(false);
  });

  it("campo de seleção múltipla rejeita lista vazia (edge case: não-preenchido)", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalMotivMotivosParticipacao: [],
    });
    expect(result.success).toBe(false);
  });

  it("avalMotivMotivosParticipacao aceita até 3 itens (limite do documento)", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalMotivMotivosParticipacao: [
        "Geração de renda",
        "Qualificação profissional",
        "Interesse pessoal no setor de Turismo",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("avalMotivMotivosParticipacao rejeita 4 itens (edge case: limite excedido)", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalMotivMotivosParticipacao: [
        "Geração de renda",
        "Qualificação profissional",
        "Interesse pessoal no setor de Turismo",
        "Empreender no setor",
      ],
    });
    expect(result.success).toBe(false);
  });

  describe("escala de Avaliação do Curso (Bloco 8 campos, AD-020, 1 a 5)", () => {
    const camposEscala = [
      "avalCursoDinamicasInclusao",
      "avalCursoMaterialDidatico",
      "avalCursoConteudo",
      "avalCursoClareza",
      "avalCursoConhecimentoInstrutores",
      "avalCursoOrganizacao",
      "avalCursoInfraestruturaBasica",
      "avalCursoInfraestruturaSalaAula",
    ] as const;

    it.each(camposEscala)("%s rejeita 0 (sem 'não há disponibilidade')", (campo) => {
      const result = respostasAvaliacaoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [campo]: 0,
      });
      expect(result.success).toBe(false);
    });

    it.each(camposEscala)("%s rejeita 6 (acima do máximo)", (campo) => {
      const result = respostasAvaliacaoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [campo]: 6,
      });
      expect(result.success).toBe(false);
    });

    it.each(camposEscala)("%s aceita 1 e 5 (limites válidos)", (campo) => {
      expect(
        respostasAvaliacaoSchema.safeParse({ ...RESPOSTA_VALIDA, [campo]: 1 }).success,
      ).toBe(true);
      expect(
        respostasAvaliacaoSchema.safeParse({ ...RESPOSTA_VALIDA, [campo]: 5 }).success,
      ).toBe(true);
    });
  });

  it("avalGeralNota rejeita -1 e 11, aceita 0 e 10", () => {
    expect(
      respostasAvaliacaoSchema.safeParse({ ...RESPOSTA_VALIDA, avalGeralNota: -1 })
        .success,
    ).toBe(false);
    expect(
      respostasAvaliacaoSchema.safeParse({ ...RESPOSTA_VALIDA, avalGeralNota: 11 })
        .success,
    ).toBe(false);
    expect(
      respostasAvaliacaoSchema.safeParse({ ...RESPOSTA_VALIDA, avalGeralNota: 0 })
        .success,
    ).toBe(true);
    expect(
      respostasAvaliacaoSchema.safeParse({ ...RESPOSTA_VALIDA, avalGeralNota: 10 })
        .success,
    ).toBe(true);
  });

  it("avalParticipPercentualFrequencia rejeita -1 e 101, aceita 0 e 100", () => {
    expect(
      respostasAvaliacaoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalParticipPercentualFrequencia: -1,
      }).success,
    ).toBe(false);
    expect(
      respostasAvaliacaoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalParticipPercentualFrequencia: 101,
      }).success,
    ).toBe(false);
    expect(
      respostasAvaliacaoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalParticipPercentualFrequencia: 0,
      }).success,
    ).toBe(true);
    expect(
      respostasAvaliacaoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalParticipPercentualFrequencia: 100,
      }).success,
    ).toBe(true);
  });
});

describe("CHAVES_PARTE_1", () => {
  it("tem exatamente 19 entradas (Dicionário de Campos, spec.md)", () => {
    expect(CHAVES_PARTE_1).toHaveLength(19);
  });

  it("cada entrada corresponde a uma chave real de respostasAvaliacaoSchema", () => {
    const chavesSchema = Object.keys(respostasAvaliacaoSchema.shape);
    for (const chave of CHAVES_PARTE_1) {
      expect(chavesSchema).toContain(chave);
    }
  });
});
