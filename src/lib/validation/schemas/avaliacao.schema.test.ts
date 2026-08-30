import { describe, expect, it } from "vitest";
import {
  CHAVES_PARTE_1,
  matricularAlunoSchema,
  respostasAvaliacaoSchema,
} from "./avaliacao.schema";

// Fixture com as 45 chaves do questionário fonte
// (`docs/Questionario_do_Aluno_1.md`) preenchidas com valores válidos,
// incluindo os condicionais aplicáveis - usada como base para os testes de
// campo individual (spread + override). Valores transcritos literalmente do
// papel, sem importar as constantes de opções do schema.
const RESPOSTA_VALIDA = {
  // Parte 1 - Dados Pessoais (Q3-Q9)
  avalPessoalEstado: "SP",
  avalPessoalMunicipio: "Ubatuba - SP",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "26 a 35 anos",
  avalPessoalEscolaridade: "Ensino médio completo",
  avalPessoalRacaEtnia: "Pardo",
  avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",

  // Parte 1 - Situação Profissional (Q10-Q13)
  avalProfissCondicaoTrabalho: "Desempregado",
  avalProfissAtuaTurismo: "Sim",
  avalProfissAtividadeEspecifica: "Alojamento (meios de hospedagem)",
  avalProfissFaixaRenda: "Até 01 salário mínimo",

  // Parte 1 - Experiência (Q14-Q16)
  avalExperienciaTrabalhoPrevio: "Não",
  avalExperienciaCursoAnterior: "Sim",
  avalExperienciaTipoCursoAnterior: "Atualização profissional",

  // Parte 1 - Motivação (Q17-Q18)
  avalMotivMotivosParticipacao: [
    "Conseguir um emprego/trabalho",
    "Abrir o meu próprio negócio",
  ],
  avalMotivFormaConhecimento: "pelas Redes Sociais",

  // Parte 1 - Expectativas (Q19-Q21)
  avalExpectAtendimento: "Sim",
  avalExpectEmprego: "Talvez",
  avalExpectRenda: "Média",

  // Parte 2 - Participação (Q22, Q22.1, Q23)
  avalParticipConcluiuCurso: "Sim",
  avalParticipMotivoNaoConclusao: undefined,
  avalParticipPercentualFrequencia: "76% a 100%",

  // Parte 2 - Avaliação do Curso (Q24)
  avalCursoDinamicasInclusao: 5,
  avalCursoMaterialDidatico: 4,
  avalCursoConteudo: 5,
  avalCursoClareza: 4,
  avalCursoConhecimentoInstrutores: 5,
  avalCursoOrganizacao: 4,
  avalCursoInfraestruturaBasica: 3,
  avalCursoInfraestruturaSalaAula: 3,

  // Parte 2 - Aprendizado (Q25-Q27)
  avalAprendizAmpliacaoConhecimento: "Ampliou / Melhorou",
  avalAprendizAtendimentoExpectativas: "Sim",
  avalAprendizSensacaoPreparo: "Parcialmente",

  // Parte 2 - Continuidade nos Estudos (Q28)
  avalContinuidadeRetomadaEstudos: "Sim, ao ensino técnico",

  // Parte 2 - Motivações após o Curso (Q29)
  avalMotivacoesPosPercepcoes: [
    "tem condições de atuar na área do Turismo",
    "desenvolveu novas percepções de mundo",
  ],

  // Parte 2 - Oportunidades Reais de Trabalho e Emprego (Q30, Q30.j, Q31)
  avalOportunSituacaoTrabalho:
    "Consegui um emprego, com carteira assinada, na área de Turismo.",
  avalOportunSituacaoTrabalhoOutra: undefined,
  avalOportunIntencaoAtuarTurismo: "Sim",

  // Parte 2 - Efetivação no Emprego e Aumento da Renda (Q32-Q34)
  avalEfetivEmprego: "Sim",
  avalEfetivAumentoRenda: "Sim",
  avalEfetivMelhoriaPadraoVida: "Sim, parcialmente",

  // Parte 2 - Avaliação geral (Q35-Q38)
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Mais gente da comunidade trabalhando com receptivo",
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

  it("tem exatamente 45 chaves (questionário fonte: 19 na Parte 1, 26 na Parte 2)", () => {
    expect(Object.keys(respostasAvaliacaoSchema.shape)).toHaveLength(45);
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

  it("avalPessoalCondicaoPcd é o tipo da deficiência, não Sim/Não (Q9)", () => {
    const foraDoEnum = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalPessoalCondicaoPcd: "Sim",
    });
    expect(foraDoEnum.success).toBe(false);

    const valido = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalPessoalCondicaoPcd: "Sim, tenho deficiência auditiva.",
    });
    expect(valido.success).toBe(true);
  });

  it("avalProfissAtividadeEspecifica é seleção fechada, não texto livre (Q12)", () => {
    const textoLivre = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalProfissAtividadeEspecifica: "Recepção em pousada local",
    });
    expect(textoLivre.success).toBe(false);
  });

  it("avalGeralMelhoriasComunidade é texto aberto, não seleção (Q36)", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalGeralMelhoriasComunidade: "Qualquer texto livre do aluno",
    });
    expect(result.success).toBe(true);
  });

  // AD-036: supera o AD-025, que havia travado este campo como seleção única.
  it("avalParticipMotivoNaoConclusao é seleção múltipla e aceita mais de um motivo (Q22.1)", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: [
        "Dificuldades financeiras",
        "Local muito distante de casa",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("campo de seleção múltipla aceita array de opções válidas", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalMotivMotivosParticipacao: ["Conseguir um emprego/trabalho"],
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
        "Conseguir um emprego/trabalho",
        "Abrir o meu próprio negócio",
        "Aplicar o conhecimento adquirido",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("avalMotivMotivosParticipacao rejeita 4 itens (edge case: limite excedido)", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      avalMotivMotivosParticipacao: [
        "Conseguir um emprego/trabalho",
        "Abrir o meu próprio negócio",
        "Aplicar o conhecimento adquirido",
        "Contribuir com o turismo no meu território",
      ],
    });
    expect(result.success).toBe(false);
  });

  describe("escala de Avaliação do Curso (Q24, 8 linhas, AD-020, 1 a 5)", () => {
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

  // Q23 mudou de número livre (0-100) para 4 faixas fechadas.
  it("avalParticipPercentualFrequencia aceita as 4 faixas e rejeita número (Q23)", () => {
    for (const faixa of ["Até 25%", "26% a 50%", "51% a 75%", "76% a 100%"]) {
      expect(
        respostasAvaliacaoSchema.safeParse({
          ...RESPOSTA_VALIDA,
          avalParticipPercentualFrequencia: faixa,
        }).success,
      ).toBe(true);
    }

    expect(
      respostasAvaliacaoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        avalParticipPercentualFrequencia: 90,
      }).success,
    ).toBe(false);
  });
});

describe("CHAVES_PARTE_1", () => {
  it("tem exatamente 19 entradas (Parte 1 do questionário fonte, Q3-Q21)", () => {
    expect(CHAVES_PARTE_1).toHaveLength(19);
  });

  it("cada entrada corresponde a uma chave real de respostasAvaliacaoSchema", () => {
    const chavesSchema = Object.keys(respostasAvaliacaoSchema.shape);
    for (const chave of CHAVES_PARTE_1) {
      expect(chavesSchema).toContain(chave);
    }
  });
});
