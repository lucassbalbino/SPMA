import { describe, expect, it } from "vitest";
import {
  CHAVES_SOMENTE_CONCLUINTE,
  normalizarCondicionaisAvaliacao,
  pendenciasCondicionaisParte1,
  pendenciasCondicionaisParte2,
} from "./condicionais";

// Valores transcritos literalmente de `docs/Questionario_do_Aluno_1.md`.
describe("normalizarCondicionaisAvaliacao", () => {
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

  it("Q22='Não' -> as 23 chaves de 'apenas para quem concluiu' são descartadas, Q22.1 e Q23 ficam", () => {
    const respostas: Record<string, unknown> = {
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Horário inapropriado das aulas"],
      avalParticipPercentualFrequencia: "26% a 50%",
      avalPessoalEstado: "SP",
    };
    for (const chave of CHAVES_SOMENTE_CONCLUINTE) {
      respostas[chave] = chave === "avalGeralNota" ? 10 : "resposta de concluinte";
    }

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual({
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Horário inapropriado das aulas"],
      avalParticipPercentualFrequencia: "26% a 50%",
      avalPessoalEstado: "SP",
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
      avalOportunSituacaoTrabalho: "Outra",
      avalOportunSituacaoTrabalhoOutra: "Trabalho voluntário",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual(respostas);
  });

  it("Q30 deixou de ser 'Outra' -> o texto livre de Q30.j é descartado", () => {
    const respostas = {
      avalParticipConcluiuCurso: "Sim",
      avalOportunSituacaoTrabalho: "Estou desempregado.",
      avalOportunSituacaoTrabalhoOutra: "Trabalho voluntário",
    };

    expect(normalizarCondicionaisAvaliacao(respostas)).toEqual({
      avalParticipConcluiuCurso: "Sim",
      avalOportunSituacaoTrabalho: "Estou desempregado.",
    });
  });

  it("respostas ausentes não quebram a normalização", () => {
    expect(normalizarCondicionaisAvaliacao(null)).toEqual({});
  });
});

describe("pendências condicionais", () => {
  it("Q11='Sim' sem Q12 e Q15='Sim' sem Q16 -> as duas pendentes na Parte 1", () => {
    const pendentes = pendenciasCondicionaisParte1({
      avalProfissAtuaTurismo: "Sim",
      avalExperienciaCursoAnterior: "Sim",
    });

    expect(pendentes).toEqual([
      "avalProfissAtividadeEspecifica",
      "avalExperienciaTipoCursoAnterior",
    ]);
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

  it("Q30='Outra' sem o texto livre -> pendente na Parte 2", () => {
    expect(
      pendenciasCondicionaisParte2({ avalOportunSituacaoTrabalho: "Outra" }),
    ).toEqual(["avalOportunSituacaoTrabalhoOutra"]);
  });
});
