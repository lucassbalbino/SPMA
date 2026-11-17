import { describe, expect, it } from "vitest";
import {
  CHAVES_SOMENTE_CONCLUINTE,
  normalizarCondicionaisAvaliacao,
  pendenciasCondicionaisParte1,
  pendenciasCondicionaisParte2,
} from "./condicionais";

// Valores transcritos literalmente de `docs/Questionario_do_Aluno_1.md`.
// Com Q28 fora do questionário (MTUR-11) e Q30-Q34 de volta (AD-055), o
// bloco de quem concluiu é Q24-Q27, Q29-Q34 e Q35-Q38.
describe("CHAVES_SOMENTE_CONCLUINTE", () => {
  it("lista exatamente as 22 chaves de Q24-Q27, Q29-Q34 e Q35-Q38", () => {
    expect([...CHAVES_SOMENTE_CONCLUINTE]).toEqual([
      "avalCursoDinamicasInclusao",
      "avalCursoMaterialDidatico",
      "avalCursoConteudo",
      "avalCursoClareza",
      "avalCursoConhecimentoInstrutores",
      "avalCursoOrganizacao",
      "avalCursoInfraestruturaBasica",
      "avalCursoInfraestruturaSalaAula",
      "avalAprendizAmpliacaoConhecimento",
      "avalAprendizAtendimentoExpectativas",
      "avalAprendizSensacaoPreparo",
      "avalMotivacoesPosPercepcoes",
      "avalOportunSituacaoTrabalho",
      "avalOportunSituacaoTrabalhoOutra",
      "avalOportunIntencaoAtuarTurismo",
      "avalEfetivEmprego",
      "avalEfetivAumentoRenda",
      "avalEfetivMelhoriaPadraoVida",
      "avalGeralNota",
      "avalGeralMelhoriasComunidade",
      "avalGeralRecomendaCurso",
      "avalGeralComentariosFinais",
    ]);
  });
});

describe("normalizarCondicionaisAvaliacao", () => {
  // SPR-09: Q12 órfã é descartada no encerramento, como a Q16.
  it("Q11='Não' com Q12 respondida -> Q12 descartada", () => {
    const respostas = {
      avalProfissAtuaTurismo: "Não",
      avalProfissAtividadeEspecifica: "Eventos",
      avalProfissFaixaRenda: "Sem renda",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual({
      avalProfissAtuaTurismo: "Não",
      avalProfissFaixaRenda: "Sem renda",
    });
  });

  it("Q11='Sim' com Q12 respondida -> Q12 fica", () => {
    const respostas = {
      avalProfissAtuaTurismo: "Sim",
      avalProfissAtividadeEspecifica: "Eventos",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual(respostas);
  });

  it("Q15='Não' com Q16 respondida -> Q16 descartada", () => {
    const respostas = {
      avalExperienciaCursoAnterior: "Não",
      avalExperienciaTipoCursoAnterior: "Técnico",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual({
      avalExperienciaCursoAnterior: "Não",
    });
  });

  it("Q22='Sim' com Q22.1 respondida -> Q22.1 descartada (quem concluiu não tem motivo de abandono)", () => {
    const respostas = {
      avalParticipConcluiuCurso: "Sim",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
      avalParticipPercentualFrequencia: "76% a 100%",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual({
      avalParticipConcluiuCurso: "Sim",
      avalParticipPercentualFrequencia: "76% a 100%",
    });
  });

  // OPT-08: o "Quais?" órfão sai no encerramento.
  it("Q30 diferente de 'Outra' com Q30.j respondida -> Q30.j descartada", () => {
    const respostas = {
      avalParticipConcluiuCurso: "Sim",
      avalOportunSituacaoTrabalho: "Estou estudando.",
      avalOportunSituacaoTrabalhoOutra: "Guia voluntário",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual({
      avalParticipConcluiuCurso: "Sim",
      avalOportunSituacaoTrabalho: "Estou estudando.",
    });
  });

  it("Q30='Outra' com Q30.j respondida -> Q30.j fica", () => {
    const respostas = {
      avalParticipConcluiuCurso: "Sim",
      avalOportunSituacaoTrabalho: "Outra",
      avalOportunSituacaoTrabalhoOutra: "Guia voluntário",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual(respostas);
  });

  // OPT-09: as 22 chaves de concluinte, Q30-Q34 inclusive, saem quando Q22 = "Não".
  it("Q22='Não' -> as 22 chaves de 'apenas para quem concluiu' são descartadas, Q22.1 e Q23 ficam", () => {
    const respostas: Record<string, unknown> = {
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Horário inapropriado das aulas"],
      avalParticipPercentualFrequencia: "26% a 50%",
      avalExpectAtendimento: "Sim",
    };
    for (const chave of CHAVES_SOMENTE_CONCLUINTE) {
      respostas[chave] = chave === "avalGeralNota" ? 10 : "resposta de concluinte";
    }

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual({
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Horário inapropriado das aulas"],
      avalParticipPercentualFrequencia: "26% a 50%",
      avalExpectAtendimento: "Sim",
    });
  });

  it("Q22 ainda em branco -> nada do bloco de conclusão é descartado", () => {
    const respostas = { avalGeralNota: 9, avalCursoConteudo: 5 };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual(respostas);
  });

  it("Q22='Sim' com o bloco respondido -> nada é descartado, inclusive nota 0", () => {
    const respostas = {
      avalParticipConcluiuCurso: "Sim",
      avalGeralNota: 0,
      avalGeralComentariosFinais: "Gostei",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual(respostas);
  });

  it("respostas ausentes não quebram a normalização", () => {
    expect(normalizarCondicionaisAvaliacao(null)).toEqual({});
  });
});

describe("pendências condicionais", () => {
  // Q12 e Q16 são as condicionais da Parte 1 (Q12 voltou na AD-053).
  it("Q11='Sim' sem Q12 -> só ela pendente na Parte 1", () => {
    expect(pendenciasCondicionaisParte1({ avalProfissAtuaTurismo: "Sim" })).toEqual([
      "avalProfissAtividadeEspecifica",
    ]);
  });

  it("Q15='Sim' sem Q16 -> só ela pendente na Parte 1", () => {
    const pendentes = pendenciasCondicionaisParte1({
      avalExperienciaCursoAnterior: "Sim",
    });

    expect(pendentes).toEqual(["avalExperienciaTipoCursoAnterior"]);
  });

  it("Q22='Não' sem Q22.1 -> pendente na Parte 2", () => {
    expect(pendenciasCondicionaisParte2({ avalParticipConcluiuCurso: "Não" })).toEqual([
      "avalParticipMotivoNaoConclusao",
    ]);
  });

  it("Q22.1 como lista vazia conta como não preenchida", () => {
    const pendentes = pendenciasCondicionaisParte2({
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: [],
    });

    expect(pendentes).toEqual(["avalParticipMotivoNaoConclusao"]);
  });
});
