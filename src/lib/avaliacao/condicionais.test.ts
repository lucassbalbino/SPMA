import { describe, expect, it } from "vitest";
import {
  CHAVES_SOMENTE_CONCLUINTE,
  normalizarCondicionaisAvaliacao,
  pendenciasCondicionaisParte1,
  pendenciasCondicionaisParte2,
} from "./condicionais";

// Valores transcritos literalmente de `docs/Questionario_do_Aluno_1.md`.
// MTUR-11: com Q28 e Q30-Q34 fora do questionário, o bloco de quem concluiu
// é Q24-Q27, Q29 e Q35-Q38.
describe("CHAVES_SOMENTE_CONCLUINTE", () => {
  it("lista exatamente as 16 chaves de Q24-Q27, Q29 e Q35-Q38", () => {
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
      "avalGeralNota",
      "avalGeralMelhoriasComunidade",
      "avalGeralRecomendaCurso",
      "avalGeralComentariosFinais",
    ]);
  });
});

describe("normalizarCondicionaisAvaliacao", () => {
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

  it("Q22='Não' -> as 16 chaves de 'apenas para quem concluiu' são descartadas, Q22.1 e Q23 ficam", () => {
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
  // Q16 é a única condicional que sobrou na Parte 1 (Q12 saiu com MTUR-08).
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
