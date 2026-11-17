import { describe, expect, it } from "vitest";
import { CHAVES_DADOS_PESSOAIS } from "../validation/schemas/dados-pessoais.schema";
import {
  validarCompletudeAvaliacao,
  validarCompletudeParte1,
  validarCompletudeParte2,
} from "./completude";

// Parte 1 completa (10 sempre-obrigatórias + Q12 e Q16, condicionais
// satisfeitos). Situação Profissional (Q10-Q13) voltou na AD-053.
// As 7 perguntas de dados pessoais (Q3-Q9) NÃO entram mais: saíram do
// questionário do curso (PESSOAL-11/12) e são validadas em
// `src/lib/dados-pessoais/completude.test.ts`.
// Valores transcritos literalmente de `docs/Questionario_do_Aluno_1.md`, sem
// importar as constantes de opções do schema: o teste tem de quebrar se
// alguém renomear uma opção só no código de produção.
const PARTE_1_COMPLETA = {
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

// As 20 chaves de Q24-Q27, Q29-Q34 e Q35-Q37 exigidas quando
// avalParticipConcluiuCurso="Sim" (Q30-Q34 voltaram na AD-055), mais as 2 do bloco
// "Participação" (Q22 e Q23), que todo aluno responde.
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
  avalMotivacoesPosPercepcoes: ["tem condições de atuar na área do Turismo"],
  avalOportunSituacaoTrabalho: "Estou trabalhando como MEI (próprio negócio).",
  avalOportunIntencaoAtuarTurismo: "Sim",
  avalEfetivEmprego: "Não",
  avalEfetivAumentoRenda: "Sim",
  avalEfetivMelhoriaPadraoVida: "Sim, totalmente",
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Mais gente da comunidade trabalhando com receptivo",
  avalGeralRecomendaCurso: "Sim",
};

describe("validarCompletudeParte1", () => {
  // SPR-05: as 10 sempre-obrigatórias + Q12 e Q16 completam a Parte 1.
  it("as 10 chaves sempre-obrigatórias + Q12 e Q16 -> completo=true, pendentes=[]", () => {
    expect(Object.keys(PARTE_1_COMPLETA)).toHaveLength(12);
    expect(validarCompletudeParte1(PARTE_1_COMPLETA)).toEqual({
      completo: true,
      pendentes: [],
    });
  });

  // MTUR-10: Q16 só é exigida quando Q15 = "Sim".
  it("avalExperienciaCursoAnterior='Não' sem Q16 -> completo=true", () => {
    const { avalExperienciaTipoCursoAnterior: _omitido, ...base } = PARTE_1_COMPLETA;

    expect(
      validarCompletudeParte1({ ...base, avalExperienciaCursoAnterior: "Não" }),
    ).toEqual({ completo: true, pendentes: [] });
  });

  // MTUR-10 e SPR-05: cada uma das 10 sempre-obrigatórias é exigida, e a
  // pendência é exatamente a chave que falta.
  it.each([
    "avalProfissCondicaoTrabalho",
    "avalProfissAtuaTurismo",
    "avalProfissFaixaRenda",
    "avalExperienciaTrabalhoPrevio",
    "avalExperienciaCursoAnterior",
    "avalMotivMotivosParticipacao",
    "avalMotivFormaConhecimento",
    "avalExpectAtendimento",
    "avalExpectEmprego",
    "avalExpectRenda",
  ] as const)("sem %s -> incompleto, pendente lista essa chave", (chave) => {
    const { [chave]: _omitido, ...semChave } = PARTE_1_COMPLETA;
    const resultado = validarCompletudeParte1(semChave);

    expect(resultado).toEqual({ completo: false, pendentes: [chave] });
  });

  // SPR-06: Q12 é exigida quando Q11 = "Sim".
  it("avalProfissAtuaTurismo='Sim' sem avalProfissAtividadeEspecifica -> pendente e incompleto", () => {
    const { avalProfissAtividadeEspecifica: _omitido, ...semAtividade } = PARTE_1_COMPLETA;

    expect(validarCompletudeParte1(semAtividade)).toEqual({
      completo: false,
      pendentes: ["avalProfissAtividadeEspecifica"],
    });
  });

  // SPR-07: com Q11 = "Não", a Q12 em branco não é cobrada.
  it("avalProfissAtuaTurismo='Não' sem avalProfissAtividadeEspecifica -> completo=true", () => {
    const { avalProfissAtividadeEspecifica: _omitido, ...base } = PARTE_1_COMPLETA;

    expect(validarCompletudeParte1({ ...base, avalProfissAtuaTurismo: "Não" })).toEqual({
      completo: true,
      pendentes: [],
    });
  });

  it("avalExperienciaCursoAnterior='Sim' sem avalExperienciaTipoCursoAnterior -> pendente e incompleto", () => {
    const { avalExperienciaTipoCursoAnterior: _omitido, ...semTipo } =
      PARTE_1_COMPLETA;
    const resultado = validarCompletudeParte1(semTipo);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalExperienciaTipoCursoAnterior");
  });

  // PESSOAL-12: o veredito da Parte 1 sai das perguntas que sobraram, e
  // nenhuma das 7 pessoais é cobrada - nem quando nenhuma delas foi enviada.
  it("não cobra nenhuma das 7 perguntas de dados pessoais", () => {
    const resultado = validarCompletudeParte1(PARTE_1_COMPLETA);

    expect(resultado).toEqual({ completo: true, pendentes: [] });
    for (const chave of CHAVES_DADOS_PESSOAIS) {
      expect(resultado.pendentes).not.toContain(chave);
    }
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

  it("pendência condicional aparece mesmo com a maioria dos outros campos sempre-obrigatórios também ausentes", () => {
    // A checagem condicional roda independente do resultado do safeParse
    // base - prova direta contra a lição de `formulario-pre-curso`
    // (`.superRefine` encadeado é pulado quando o schema base já tem
    // qualquer issue) - aqui a técnica evita isso desde o início.
    const resultado = validarCompletudeParte1({
      avalExperienciaCursoAnterior: "Sim",
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalExperienciaTipoCursoAnterior");
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

  it("avalParticipConcluiuCurso='Não' + motivo + frequência -> completo=true, mesmo com as 20 chaves de concluinte ausentes", () => {
    const resultado = validarCompletudeParte2({
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
      avalParticipPercentualFrequencia: "26% a 50%",
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("avalParticipConcluiuCurso='Não' sem avalParticipMotivoNaoConclusao -> incompleto (as 20 de concluinte não aparecem)", () => {
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

  // MTUR-11 e OPT-06: Q22, Q23 e as 20 de concluinte bastam - a Q28, que
  // segue removida, não é cobrada.
  it("avalParticipConcluiuCurso='Sim' com as 22 chaves preenchidas -> completo=true", () => {
    expect(Object.keys(PARTE_2_COMPLETA_CONCLUIU)).toHaveLength(22);
    expect(validarCompletudeParte2(PARTE_2_COMPLETA_CONCLUIU)).toEqual({
      completo: true,
      pendentes: [],
    });
  });

  // MTUR-11 e OPT-06: cada uma das 21 além do gate é exigida - a pendência é
  // exatamente a chave que falta. Inclui Q30, Q31, Q32, Q33 e Q34.
  it.each(
    Object.keys(PARTE_2_COMPLETA_CONCLUIU).filter((c) => c !== "avalParticipConcluiuCurso"),
  )("avalParticipConcluiuCurso='Sim' sem %s -> pendente lista exatamente essa chave", (chave) => {
    const semChave: Record<string, unknown> = { ...PARTE_2_COMPLETA_CONCLUIU };
    delete semChave[chave];

    expect(validarCompletudeParte2(semChave)).toEqual({
      completo: false,
      pendentes: [chave],
    });
  });

  // OPT-07: Q30 = "Outra" exige o "Quais?".
  it("avalOportunSituacaoTrabalho='Outra' sem avalOportunSituacaoTrabalhoOutra -> pendente", () => {
    expect(
      validarCompletudeParte2({ ...PARTE_2_COMPLETA_CONCLUIU, avalOportunSituacaoTrabalho: "Outra" }),
    ).toEqual({ completo: false, pendentes: ["avalOportunSituacaoTrabalhoOutra"] });
  });

  it("avalOportunSituacaoTrabalho='Outra' com a especificação preenchida -> completo=true", () => {
    expect(
      validarCompletudeParte2({
        ...PARTE_2_COMPLETA_CONCLUIU,
        avalOportunSituacaoTrabalho: "Outra",
        avalOportunSituacaoTrabalhoOutra: "Trabalho voluntário no centro cultural",
      }),
    ).toEqual({ completo: true, pendentes: [] });
  });

  it("avalGeralComentariosFinais ausente nunca aparece em pendentes, mesmo com tudo o resto completo", () => {
    const resultado = validarCompletudeParte2(PARTE_2_COMPLETA_CONCLUIU);

    expect(resultado.pendentes).not.toContain("avalGeralComentariosFinais");
  });
});

describe("validarCompletudeAvaliacao", () => {
  it("une pendências de Parte 1 e Parte 2 (uma pendência de cada)", () => {
    const { avalExpectRenda: _omitido, ...parte1SemRenda } =
      PARTE_1_COMPLETA;
    const { avalGeralNota: _omitidoNota, ...parte2SemNota } =
      PARTE_2_COMPLETA_CONCLUIU;

    const resultado = validarCompletudeAvaliacao({
      ...parte1SemRenda,
      ...parte2SemNota,
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("avalExpectRenda");
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
