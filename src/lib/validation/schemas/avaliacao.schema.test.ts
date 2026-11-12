import { describe, expect, it } from "vitest";
import { CHAVES_DADOS_PESSOAIS } from "./dados-pessoais.schema";
import { CHAVES_PARTE_1, respostasAvaliacaoSchema } from "./avaliacao.schema";

// As 7 chaves dos blocos que continuam removidos (Q28, Q30, Q30.j, Q31-Q34),
// escritas aqui em vez de derivadas do código: o teste tem de quebrar se
// alguma delas voltar ao schema. Q10-Q13 voltaram (AD-053).
const CHAVES_REMOVIDAS_MTUR = [
  "avalContinuidadeRetomadaEstudos",
  "avalOportunSituacaoTrabalho",
  "avalOportunSituacaoTrabalhoOutra",
  "avalOportunIntencaoAtuarTurismo",
  "avalEfetivEmprego",
  "avalEfetivAumentoRenda",
  "avalEfetivMelhoriaPadraoVida",
];

// Fixture com as 31 chaves do questionário fonte
// (`docs/Questionario_do_Aluno_1.md`) preenchidas com valores válidos,
// incluindo os condicionais aplicáveis - usada como base para os testes de
// campo individual (spread + override). Valores transcritos literalmente do
// papel, sem importar as constantes de opções do schema.
const RESPOSTA_VALIDA = {
  // Parte 1 - Situação Profissional (Q10-Q13)
  avalProfissCondicaoTrabalho: "Trabalhador(a) Formal (CLT)",
  avalProfissAtuaTurismo: "Sim",
  avalProfissAtividadeEspecifica: "Guiamento e Condução",
  avalProfissFaixaRenda: "Entre 01 e 03 salários mínimos",

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

  // Parte 2 - Motivações após o Curso (Q29)
  avalMotivacoesPosPercepcoes: [
    "tem condições de atuar na área do Turismo",
    "desenvolveu novas percepções de mundo",
  ],

  // Parte 2 - Avaliação geral (Q35-Q38)
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Mais gente da comunidade trabalhando com receptivo",
  avalGeralRecomendaCurso: "Sim",
  avalGeralComentariosFinais: "Curso excelente, mudou minha perspectiva de carreira",
};

describe("respostasAvaliacaoSchema", () => {
  it("aceita a resposta válida completa", () => {
    const result = respostasAvaliacaoSchema.safeParse(RESPOSTA_VALIDA);
    expect(result.success).toBe(true);
  });

  it("tem exatamente 31 chaves (12 na Parte 1, 19 na Parte 2)", () => {
    expect(Object.keys(respostasAvaliacaoSchema.shape)).toHaveLength(31);
  });

  // MTUR-09: os 3 blocos que o aluno só responde depois do certificado
  // (Alteracoes_MTur_1, itens 3.4 a 3.6) continuam fora do schema.
  it("não tem nenhuma das 7 chaves que seguem removidas pelo MTur", () => {
    const chaves = Object.keys(respostasAvaliacaoSchema.shape);
    for (const chave of CHAVES_REMOVIDAS_MTUR) {
      expect(chaves).not.toContain(chave);
    }
  });

  // MTUR-09: chave removida enviada numa gravação é descartada pelo schema,
  // então não chega a `gravarRespostas` e não vira linha.
  it("descarta em silêncio as chaves removidas e mantém as válidas", () => {
    const corpo: Record<string, unknown> = { avalExpectRenda: "Alta" };
    for (const chave of CHAVES_REMOVIDAS_MTUR) {
      corpo[chave] = "Sim";
    }

    expect(respostasAvaliacaoSchema.parse(corpo)).toEqual({ avalExpectRenda: "Alta" });
  });

  // PESSOAL-11: as 7 perguntas de dados pessoais não pertencem mais a este
  // formulário - vivem em `dados-pessoais.schema.ts`, chaveadas só pelo CPF.
  it("não tem nenhuma das 7 chaves de dados pessoais", () => {
    const chaves = Object.keys(respostasAvaliacaoSchema.shape);
    for (const chave of CHAVES_DADOS_PESSOAIS) {
      expect(chaves).not.toContain(chave);
    }
  });

  it("aceita objeto vazio (todas as chaves são opcionais na FORMA)", () => {
    expect(respostasAvaliacaoSchema.safeParse({}).success).toBe(true);
  });

  it("aceita um subconjunto de 1 campo válido", () => {
    const result = respostasAvaliacaoSchema.safeParse({
      avalExpectRenda: "Média",
    });
    expect(result.success).toBe(true);
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

  // RU-07 (doc 15): a recusa dos 4 motivos sai em português, na pergunta 17.
  it("avalMotivMotivosParticipacao com 4 itens recusa com 'Selecione no máximo 3 motivos'", () => {
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
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]?.path).toEqual(["avalMotivMotivosParticipacao"]);
    expect(result.error?.issues[0]?.message).toBe("Selecione no máximo 3 motivos");
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

describe("Situação Profissional (Q10-Q13, AD-053)", () => {
  // SPR-02: as opções do questionário original, na ordem do papel. Escritas
  // aqui, não importadas: o teste quebra se alguém mudar uma opção só no
  // código de produção.
  it.each([
    [
      "avalProfissCondicaoTrabalho",
      [
        "Estagiário(a).",
        "Microempreendedor Individual (MEI)",
        "Pessoa Jurídica – PJ (empresário)",
        "Profissional Liberal",
        "Trabalhador(a) Autônomo/Freelancer",
        "Trabalhador(a) Informal (sem vínculo contratual)",
        "Trabalhador(a) Formal (CLT)",
        "Estudante",
        "Desempregado",
      ],
    ],
    ["avalProfissAtuaTurismo", ["Sim", "Não"]],
    [
      "avalProfissAtividadeEspecifica",
      [
        "Serviços de Alimentação",
        "Alojamento (meios de hospedagem)",
        "Transporte (aéreo, terrestre, aquaviário)",
        "Aluguel de Transportes",
        "Cultura e Lazer (atrações turísticas, museus, parques)",
        "Agências de Viagem e Operadoras",
        "Eventos",
        "Guiamento e Condução",
        "Turismo de Base Comunitária",
        "Outro",
      ],
    ],
    [
      "avalProfissFaixaRenda",
      [
        "Sem renda",
        "Até 01 salário mínimo",
        "Entre 01 e 03 salários mínimos",
        "Entre 03 e 05 salários mínimos",
        "Entre 05 e 07 salários mínimos",
        "Entre 07 e 10 salários mínimos",
        "Acima de 10 salários mínimos",
      ],
    ],
  ] as const)("%s aceita exatamente as opções do papel, nessa ordem", (chave, opcoes) => {
    expect(respostasAvaliacaoSchema.shape[chave].unwrap().options).toEqual(opcoes);
    for (const opcao of opcoes) {
      expect(respostasAvaliacaoSchema.safeParse({ [chave]: opcao }).success).toBe(true);
    }
  });

  // SPR-03: valor fora da lista é recusado.
  it.each([
    "avalProfissCondicaoTrabalho",
    "avalProfissAtuaTurismo",
    "avalProfissAtividadeEspecifica",
    "avalProfissFaixaRenda",
  ])("%s recusa um valor fora das opções", (chave) => {
    expect(respostasAvaliacaoSchema.safeParse({ [chave]: "Talvez" }).success).toBe(false);
  });
});

describe("CHAVES_PARTE_1", () => {
  // Com Situação Profissional de volta (AD-053), a Parte 1 é Q10-Q21.
  it("lista exatamente as 12 chaves de Q10-Q21", () => {
    expect([...CHAVES_PARTE_1]).toEqual([
      "avalProfissCondicaoTrabalho",
      "avalProfissAtuaTurismo",
      "avalProfissAtividadeEspecifica",
      "avalProfissFaixaRenda",
      "avalExperienciaTrabalhoPrevio",
      "avalExperienciaCursoAnterior",
      "avalExperienciaTipoCursoAnterior",
      "avalMotivMotivosParticipacao",
      "avalMotivFormaConhecimento",
      "avalExpectAtendimento",
      "avalExpectEmprego",
      "avalExpectRenda",
    ]);
  });

  // PESSOAL-11/12: nenhuma chave pessoal sobrou no gate da Parte 1.
  it("não contém nenhuma das 7 chaves de dados pessoais", () => {
    for (const chave of CHAVES_DADOS_PESSOAIS) {
      expect(CHAVES_PARTE_1 as readonly string[]).not.toContain(chave);
    }
  });

  it("cada entrada corresponde a uma chave real de respostasAvaliacaoSchema", () => {
    const chavesSchema = Object.keys(respostasAvaliacaoSchema.shape);
    for (const chave of CHAVES_PARTE_1) {
      expect(chavesSchema).toContain(chave);
    }
  });
});
