import { describe, expect, it } from "vitest";
import {
  validarCompletudeAvaliacao,
  validarCompletudeParte1,
  validarCompletudeParte2,
} from "./completude";

// Parte 1 completa (17 sempre-obrigatórias + os 2 condicionais satisfeitos).
const PARTE_1_COMPLETA = {
  avalPessoalEstado: "SP",
  avalPessoalMunicipio: "Ubatuba",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "25 a 34 anos",
  avalPessoalEscolaridade: "Médio completo",
  avalPessoalRacaEtnia: "Parda",
  avalPessoalCondicaoPcd: "Não",
  avalProfissCondicaoTrabalho: "Desempregado(a)",
  avalProfissAtuaTurismo: "Sim",
  avalProfissAtividadeEspecifica: "Recepção em pousada local",
  avalProfissFaixaRenda: "Até 1 salário mínimo",
  avalExperienciaTrabalhoPrevio: "Não",
  avalExperienciaCursoAnterior: "Sim",
  avalExperienciaTipoCursoAnterior: "Curso livre",
  avalMotivMotivosParticipacao: ["Geração de renda"],
  avalMotivFormaConhecimento: "Redes sociais",
  avalExpectAtendimento: "Atendeu totalmente",
  avalExpectEmprego: "Atendeu parcialmente",
  avalExpectRenda: "Superou minhas expectativas",
};

// As 22 chaves de Parte 2 exigidas quando avalParticipConcluiuCurso="Sim".
const PARTE_2_COMPLETA_CONCLUIU = {
  avalParticipConcluiuCurso: "Sim",
  avalParticipPercentualFrequencia: 90,
  avalCursoDinamicasInclusao: 5,
  avalCursoMaterialDidatico: 4,
  avalCursoConteudo: 5,
  avalCursoClareza: 4,
  avalCursoConhecimentoInstrutores: 5,
  avalCursoOrganizacao: 4,
  avalCursoInfraestruturaBasica: 3,
  avalCursoInfraestruturaSalaAula: 3,
  avalAprendizAmpliacaoConhecimento: "Sim, totalmente",
  avalAprendizAtendimentoExpectativas: "Atendeu totalmente",
  avalAprendizSensacaoPreparo: "Sim, me sinto totalmente preparado(a)",
  avalContinuidadeRetomadaEstudos: "Pretendo retomar em breve",
  avalMotivacoesPosPercepcoes: ["Maior autoconfiança"],
  avalOportunSituacaoTrabalho: "Empregado(a) na área de Turismo",
  avalOportunIntencaoAtuarTurismo: "Sim",
  avalEfetivEmprego: "Sim",
  avalEfetivAumentoRenda: "Sim",
  avalEfetivMelhoriaPadraoVida: "Sim",
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Sim",
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
  it("avalParticipConcluiuCurso ausente -> incompleto, pendente é só essa chave", () => {
    const resultado = validarCompletudeParte2({});

    expect(resultado).toEqual({
      completo: false,
      pendentes: ["avalParticipConcluiuCurso"],
    });
  });

  it("avalParticipConcluiuCurso='Não' + avalParticipMotivoNaoConclusao preenchido -> completo=true, mesmo com as 22 chaves restantes ausentes", () => {
    const resultado = validarCompletudeParte2({
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("avalParticipConcluiuCurso='Não' sem avalParticipMotivoNaoConclusao -> incompleto, pendente é só essa chave (as 22 não aparecem)", () => {
    const resultado = validarCompletudeParte2({ avalParticipConcluiuCurso: "Não" });

    expect(resultado).toEqual({
      completo: false,
      pendentes: ["avalParticipMotivoNaoConclusao"],
    });
  });

  it("avalParticipConcluiuCurso='Sim' com as 22 chaves preenchidas -> completo=true", () => {
    expect(validarCompletudeParte2(PARTE_2_COMPLETA_CONCLUIU)).toEqual({
      completo: true,
      pendentes: [],
    });
  });

  it("avalParticipConcluiuCurso='Sim' com 1 das 22 chaves ausente -> incompleto, pendente lista exatamente essa chave", () => {
    const { avalGeralNota: _omitido, ...semNota } = PARTE_2_COMPLETA_CONCLUIU;
    const resultado = validarCompletudeParte2(semNota);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toEqual(["avalGeralNota"]);
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

  it("Parte 1 completa + avalParticipConcluiuCurso='Não' com motivo -> completo=true", () => {
    const resultado = validarCompletudeAvaliacao({
      ...PARTE_1_COMPLETA,
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Falta de tempo"],
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
