import { describe, expect, it } from "vitest";
import {
  validarCompletudeAvaliacao,
  validarCompletudeParte1,
  validarCompletudeParte2,
} from "./completude";

// Parte 1 completa (17 sempre-obrigatórias + os 2 condicionais satisfeitos).
// Valores transcritos literalmente de `docs/Questionario_do_Aluno_1.md`, sem
// importar as constantes de opções do schema: o teste tem de quebrar se
// alguém renomear uma opção só no código de produção.
const PARTE_1_COMPLETA = {
  avalPessoalEstado: "SP",
  avalPessoalMunicipio: "Ubatuba - SP",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "26 a 35 anos",
  avalPessoalEscolaridade: "Ensino médio completo",
  avalPessoalRacaEtnia: "Pardo",
  avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
  avalProfissCondicaoTrabalho: "Desempregado",
  avalProfissAtuaTurismo: "Sim",
  avalProfissAtividadeEspecifica: "Alojamento (meios de hospedagem)",
  avalProfissFaixaRenda: "Até 01 salário mínimo",
  avalExperienciaTrabalhoPrevio: "Não",
  avalExperienciaCursoAnterior: "Sim",
  avalExperienciaTipoCursoAnterior: "Atualização profissional",
  avalMotivMotivosParticipacao: ["Conseguir um emprego/trabalho"],
  avalMotivFormaConhecimento: "pelas Redes Sociais",
  avalExpectAtendimento: "Sim",
  avalExpectEmprego: "Talvez",
  avalExpectRenda: "Média",
};

// As 21 chaves de Q24 a Q37 exigidas quando avalParticipConcluiuCurso="Sim",
// mais as 2 do bloco "Participação" (Q22 e Q23), que todo aluno responde.
const PARTE_2_COMPLETA_CONCLUIU = {
  avalParticipConcluiuCurso: "Sim",
  avalParticipPercentualFrequencia: "76% a 100%",
  avalCursoDinamicasInclusao: 5,
  avalCursoMaterialDidatico: 4,
  avalCursoConteudo: 5,
  avalCursoClareza: 4,
  avalCursoConhecimentoInstrutores: 5,
  avalCursoOrganizacao: 4,
  avalCursoInfraestruturaBasica: 3,
  avalCursoInfraestruturaSalaAula: 3,
  avalAprendizAmpliacaoConhecimento: "Ampliou / Melhorou",
  avalAprendizAtendimentoExpectativas: "Sim",
  avalAprendizSensacaoPreparo: "Parcialmente",
  avalContinuidadeRetomadaEstudos: "Sim, ao ensino técnico",
  avalMotivacoesPosPercepcoes: ["tem condições de atuar na área do Turismo"],
  avalOportunSituacaoTrabalho:
    "Consegui um emprego, com carteira assinada, na área de Turismo.",
  avalOportunIntencaoAtuarTurismo: "Sim",
  avalEfetivEmprego: "Sim",
  avalEfetivAumentoRenda: "Sim",
  avalEfetivMelhoriaPadraoVida: "Sim, parcialmente",
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Mais gente da comunidade trabalhando com receptivo",
  avalGeralRecomendaCurso: "Sim",
};

describe("validarCompletudeParte1", () => {
  it("as 17 chaves sempre-obrigatórias + os 2 condicionais satisfeitos -> completo=true, pendentes=[]", () => {
    expect(validarCompletudeParte1(PARTE_1_COMPLETA)).toEqual({
      completo: true,
      pendentes: [],
    });
  });

  it("avalProfissAtuaTurismo='Sim' sem avalProfissAtividadeEspecifica -> pendente e incompleto", () => {
    const { avalProfissAtividadeEspecifica: _omitido, ...semDetalhe } =
      PARTE_1_COMPLETA;
    const resultado = validarCompletudeParte1(semDetalhe);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalProfissAtividadeEspecifica");
  });

  it("avalExperienciaCursoAnterior='Sim' sem avalExperienciaTipoCursoAnterior -> pendente e incompleto", () => {
    const { avalExperienciaTipoCursoAnterior: _omitido, ...semTipo } =
      PARTE_1_COMPLETA;
    const resultado = validarCompletudeParte1(semTipo);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalExperienciaTipoCursoAnterior");
  });

  it("avalProfissAtuaTurismo='Não' -> avalProfissAtividadeEspecifica não aparece em pendentes mesmo ausente", () => {
    const { avalProfissAtividadeEspecifica: _omitido, ...base } = PARTE_1_COMPLETA;
    const resultado = validarCompletudeParte1({
      ...base,
      avalProfissAtuaTurismo: "Não",
    });

    expect(resultado.pendentes).not.toContain("avalProfissAtividadeEspecifica");
  });

  it("avalPessoalCondicaoPcd é seleção de tipo de deficiência, não Sim/Não (Q9)", () => {
    const resultado = validarCompletudeParte1({
      ...PARTE_1_COMPLETA,
      avalPessoalCondicaoPcd: "Não",
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalPessoalCondicaoPcd");
  });

  it("avalMotivMotivosParticipacao aceita até 3 motivos e rejeita 4 (Q17)", () => {
    const tres = validarCompletudeParte1({
      ...PARTE_1_COMPLETA,
      avalMotivMotivosParticipacao: [
        "Conseguir um emprego/trabalho",
        "Abrir o meu próprio negócio",
        "Aplicar o conhecimento adquirido",
      ],
    });
    expect(tres.completo).toBe(true);

    const quatro = validarCompletudeParte1({
      ...PARTE_1_COMPLETA,
      avalMotivMotivosParticipacao: [
        "Conseguir um emprego/trabalho",
        "Abrir o meu próprio negócio",
        "Aplicar o conhecimento adquirido",
        "Contribuir com o turismo no meu território",
      ],
    });
    expect(quatro.completo).toBe(false);
    expect(quatro.pendentes).toContain("avalMotivMotivosParticipacao");
  });

  it("campo sempre-obrigatório ausente (não condicional) aparece em pendentes", () => {
    const { avalPessoalMunicipio: _omitido, ...semCampo } = PARTE_1_COMPLETA;
    const resultado = validarCompletudeParte1(semCampo);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalPessoalMunicipio");
  });

  it("pendência condicional aparece mesmo com a maioria dos outros campos sempre-obrigatórios também ausentes", () => {
    // A checagem condicional roda independente do resultado do safeParse
    // base - prova direta contra a lição de `formulario-pre-curso`
    // (`.superRefine` encadeado é pulado quando o schema base já tem
    // qualquer issue) - aqui a técnica evita isso desde o início.
    const resultado = validarCompletudeParte1({
      avalProfissAtuaTurismo: "Sim",
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalProfissAtividadeEspecifica");
  });
});

describe("validarCompletudeParte2", () => {
  it("Parte 2 vazia -> incompleto, pendentes são as 2 chaves do bloco Participação", () => {
    const resultado = validarCompletudeParte2({});

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toEqual(
      expect.arrayContaining([
        "avalParticipConcluiuCurso",
        "avalParticipPercentualFrequencia",
      ]),
    );
  });

  it("avalParticipConcluiuCurso='Não' + motivo + frequência -> completo=true, mesmo com as 21 chaves de Q24-Q37 ausentes", () => {
    const resultado = validarCompletudeParte2({
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
      avalParticipPercentualFrequencia: "26% a 50%",
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("avalParticipConcluiuCurso='Não' sem avalParticipMotivoNaoConclusao -> incompleto (as 21 de Q24-Q37 não aparecem)", () => {
    const resultado = validarCompletudeParte2({
      avalParticipConcluiuCurso: "Não",
      avalParticipPercentualFrequencia: "26% a 50%",
    });

    expect(resultado).toEqual({
      completo: false,
      pendentes: ["avalParticipMotivoNaoConclusao"],
    });
  });

  // Q23 está no bloco "Participação", antes do cabeçalho "Avaliação do curso
  // (apenas para quem concluiu)" - por isso vale mesmo para quem não concluiu.
  it("avalParticipPercentualFrequencia é exigida mesmo quando não concluiu (Q23)", () => {
    const resultado = validarCompletudeParte2({
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalParticipPercentualFrequencia");
  });

  it("avalParticipPercentualFrequencia é faixa, não número (Q23)", () => {
    const resultado = validarCompletudeParte2({
      ...PARTE_2_COMPLETA_CONCLUIU,
      avalParticipPercentualFrequencia: 90,
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalParticipPercentualFrequencia");
  });

  it("avalParticipMotivoNaoConclusao é seleção múltipla e aceita mais de um motivo (Q22.1)", () => {
    const resultado = validarCompletudeParte2({
      avalParticipConcluiuCurso: "Não",
      avalParticipPercentualFrequencia: "Até 25%",
      avalParticipMotivoNaoConclusao: [
        "Dificuldades financeiras",
        "Horário inapropriado das aulas",
        "Outro",
      ],
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("avalParticipConcluiuCurso='Sim' com as 23 chaves preenchidas -> completo=true", () => {
    expect(validarCompletudeParte2(PARTE_2_COMPLETA_CONCLUIU)).toEqual({
      completo: true,
      pendentes: [],
    });
  });

  it("avalParticipConcluiuCurso='Sim' com 1 chave ausente -> incompleto, pendente lista exatamente essa chave", () => {
    const { avalGeralNota: _omitido, ...semNota } = PARTE_2_COMPLETA_CONCLUIU;
    const resultado = validarCompletudeParte2(semNota);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toEqual(["avalGeralNota"]);
  });

  // Q30.j do questionário fonte: "Outra. Quais?" - único condicional da
  // Parte 2.
  it("avalOportunSituacaoTrabalho='Outra' sem avalOportunSituacaoTrabalhoOutra -> pendente", () => {
    const resultado = validarCompletudeParte2({
      ...PARTE_2_COMPLETA_CONCLUIU,
      avalOportunSituacaoTrabalho: "Outra",
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalOportunSituacaoTrabalhoOutra");
  });

  it("avalOportunSituacaoTrabalho='Outra' com a especificação preenchida -> completo=true", () => {
    const resultado = validarCompletudeParte2({
      ...PARTE_2_COMPLETA_CONCLUIU,
      avalOportunSituacaoTrabalho: "Outra",
      avalOportunSituacaoTrabalhoOutra: "Trabalho voluntário no centro cultural",
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("avalOportunSituacaoTrabalhoOutra não é exigida quando a opção escolhida não é 'Outra'", () => {
    const resultado = validarCompletudeParte2(PARTE_2_COMPLETA_CONCLUIU);

    expect(resultado.pendentes).not.toContain("avalOportunSituacaoTrabalhoOutra");
  });

  it("avalGeralComentariosFinais ausente nunca aparece em pendentes, mesmo com tudo o resto completo", () => {
    const resultado = validarCompletudeParte2(PARTE_2_COMPLETA_CONCLUIU);

    expect(resultado.pendentes).not.toContain("avalGeralComentariosFinais");
  });
});

describe("validarCompletudeAvaliacao", () => {
  it("une pendências de Parte 1 e Parte 2 (uma pendência de cada)", () => {
    const { avalPessoalMunicipio: _omitido, ...parte1SemMunicipio } =
      PARTE_1_COMPLETA;
    const { avalGeralNota: _omitidoNota, ...parte2SemNota } =
      PARTE_2_COMPLETA_CONCLUIU;

    const resultado = validarCompletudeAvaliacao({
      ...parte1SemMunicipio,
      ...parte2SemNota,
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalPessoalMunicipio");
    expect(resultado.pendentes).toContain("avalGeralNota");
  });

  it("Parte 1 completa + avalParticipConcluiuCurso='Não' com motivo e frequência -> completo=true", () => {
    const resultado = validarCompletudeAvaliacao({
      ...PARTE_1_COMPLETA,
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Problemas pessoais/familiares"],
      avalParticipPercentualFrequencia: "Até 25%",
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("Parte 1 e Parte 2 completas -> completo=true, pendentes=[]", () => {
    const resultado = validarCompletudeAvaliacao({
      ...PARTE_1_COMPLETA,
      ...PARTE_2_COMPLETA_CONCLUIU,
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });
});
