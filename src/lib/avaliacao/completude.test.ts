import { describe, expect, it } from "vitest";
import { CHAVES_DADOS_PESSOAIS } from "../validation/schemas/dados-pessoais.schema";
import {
  validarCompletudeAvaliacao,
  validarCompletudeParte1,
  validarCompletudeParte2,
} from "./completude";

// Parte 1 completa (7 sempre-obrigatórias + Q16, condicional satisfeito).
// Situação Profissional (Q10-Q13) saiu com a revisão do MTur (MTUR-08).
// As 7 perguntas de dados pessoais (Q3-Q9) NÃO entram mais: saíram do
// questionário do curso (PESSOAL-11/12) e são validadas em
// `src/lib/dados-pessoais/completude.test.ts`.
// Valores transcritos literalmente de `docs/Questionario_do_Aluno_1.md`, sem
// importar as constantes de opções do schema: o teste tem de quebrar se
// alguém renomear uma opção só no código de produção.
const PARTE_1_COMPLETA = {
  avalExperienciaTrabalhoPrevio: "Não",
  avalExperienciaCursoAnterior: "Sim",
  avalExperienciaTipoCursoAnterior: "Atualização profissional",
  avalMotivMotivosParticipacao: ["Conseguir um emprego/trabalho"],
  avalMotivFormaConhecimento: "pelas Redes Sociais",
  avalExpectAtendimento: "Sim",
  avalExpectEmprego: "Talvez",
  avalExpectRenda: "Média",
};

// As 15 chaves de Q24-Q27, Q29 e Q35-Q37 exigidas quando
// avalParticipConcluiuCurso="Sim" (MTUR-11), mais as 2 do bloco
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
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Mais gente da comunidade trabalhando com receptivo",
  avalGeralRecomendaCurso: "Sim",
};

describe("validarCompletudeParte1", () => {
  // MTUR-10: as 7 sempre-obrigatórias + Q16 bastam, sem nenhuma das 4 chaves
  // de Situação Profissional.
  it("as 7 chaves sempre-obrigatórias + Q16 -> completo=true, pendentes=[]", () => {
    expect(Object.keys(PARTE_1_COMPLETA)).toHaveLength(8);
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

  // MTUR-10: cada uma das 7 sempre-obrigatórias continua exigida.
  it.each([
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

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain(chave);
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

  it("avalParticipConcluiuCurso='Não' + motivo + frequência -> completo=true, mesmo com as 15 chaves de concluinte ausentes", () => {
    const resultado = validarCompletudeParte2({
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
      avalParticipPercentualFrequencia: "26% a 50%",
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("avalParticipConcluiuCurso='Não' sem avalParticipMotivoNaoConclusao -> incompleto (as 15 de concluinte não aparecem)", () => {
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

  // MTUR-11: Q22, Q23 e as 15 de concluinte bastam - nenhuma das 7 chaves
  // removidas da Parte 2 é cobrada.
  it("avalParticipConcluiuCurso='Sim' com as 17 chaves preenchidas -> completo=true", () => {
    expect(Object.keys(PARTE_2_COMPLETA_CONCLUIU)).toHaveLength(17);
    expect(validarCompletudeParte2(PARTE_2_COMPLETA_CONCLUIU)).toEqual({
      completo: true,
      pendentes: [],
    });
  });

  // MTUR-11: cada uma das 16 além do gate continua exigida - a pendência é
  // exatamente a chave que falta.
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
