import { describe, expect, it } from "vitest";
import {
  criarPosCursoSchema,
  datasReaisEmOrdem,
  respostasPosCursoSchema,
} from "./pos-curso.schema";

// Fixture com os 26 campos do Dicionário de Campos (spec.md) preenchidos com
// valores válidos, incluindo o único condicional - usada como base para os
// testes de campo individual (spread + override).
const RESPOSTA_VALIDA = {
  posAcompanhProblemasEstudo: ["Dificuldade de concentração"],
  posAcompanhConceitosTrabalhados: "Sustentabilidade e turismo de base comunitária",
  posAcompanhPlanoAcao: "Reforço individual semanal",
  posAcompanhAvaliacaoCognitiva: "Prova escrita",
  posAcompanhMonitoramento: ["Relatórios de frequência"],

  posExecDataInicioReal: "2026-03-01",
  posExecDataTerminoReal: "2026-06-01",
  posExecCargaHorariaRealizada: 120,
  posExecDificuldadesEnfrentadas: ["Evasão de alunos"],
  posExecHouveAlteracaoPlanejamento: "Sim",
  posExecAlteracaoDetalhe: "Curso estendido em 2 semanas por feriados",

  posParticNumInscritos: 40,
  posParticNumMatriculados: 35,
  posParticNumConcluintes: 30,
  posParticMotivosAbandono: "Conflito com trabalho",
  posParticRelacaoDemandaOferta: "Demanda superou a oferta de vagas",
  posParticIntencaoNovaOferta: "Sim",

  posFinValorTotalExecutado: 15000,
  posFinValorDespesaDocentes: 8000,
  posFinValorDespesaMaterialDidatico: 3000,
  posFinValorDespesaInfraestrutura: 4000,
  posFinHouveDevolucaoRecursos: "Não",
  posFinValorDevolvido: 0,
  posFinNecessidadeAditivo: "Não",

  posContEstrategiasContinuidade: ["Nova turma no mesmo local"],
  posContEstrategiasAmpliacao: ["Aumento do número de vagas"],
};

describe("criarPosCursoSchema", () => {
  it("aceita cdCurso positivo", () => {
    expect(criarPosCursoSchema.safeParse({ cdCurso: 1 }).success).toBe(true);
  });

  it("rejeita cdCurso ausente", () => {
    expect(criarPosCursoSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita cdCurso não-positivo", () => {
    expect(criarPosCursoSchema.safeParse({ cdCurso: 0 }).success).toBe(false);
    expect(criarPosCursoSchema.safeParse({ cdCurso: -1 }).success).toBe(false);
  });
});

describe("respostasPosCursoSchema", () => {
  it("aceita a resposta válida completa", () => {
    const result = respostasPosCursoSchema.safeParse(RESPOSTA_VALIDA);
    expect(result.success).toBe(true);
  });

  it("tem exatamente 26 chaves (Dicionário de Campos, spec.md)", () => {
    expect(Object.keys(respostasPosCursoSchema.shape)).toHaveLength(26);
  });

  it("posAcompanhAvaliacaoCognitiva rejeita valor fora do enum", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posAcompanhAvaliacaoCognitiva: "Inventado",
    });
    expect(result.success).toBe(false);
  });

  it("posParticMotivosAbandono rejeita valor fora do enum", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posParticMotivosAbandono: "Inventado",
    });
    expect(result.success).toBe(false);
  });

  it("campo de seleção múltipla aceita array de opções válidas", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posAcompanhProblemasEstudo: [
        "Dificuldade de leitura e interpretação",
        "Baixa frequência às aulas",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("campo de seleção múltipla rejeita item fora do enum", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posAcompanhProblemasEstudo: ["Problema inventado"],
    });
    expect(result.success).toBe(false);
  });

  it("campo de seleção múltipla obrigatório rejeita lista vazia", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posContEstrategiasContinuidade: [],
    });
    expect(result.success).toBe(false);
  });

  describe("valores monetários (Bloco 4) nunca negativos", () => {
    const camposMonetarios = [
      "posFinValorTotalExecutado",
      "posFinValorDespesaDocentes",
      "posFinValorDespesaMaterialDidatico",
      "posFinValorDespesaInfraestrutura",
      "posFinValorDevolvido",
    ] as const;

    it.each(camposMonetarios)("%s rejeita valor negativo", (campo) => {
      const result = respostasPosCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [campo]: -1,
      });
      expect(result.success).toBe(false);
    });

    it.each(camposMonetarios)("%s aceita 0", (campo) => {
      const result = respostasPosCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [campo]: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("forma parcial (PATCH, REQ-PO-04/05)", () => {
    it("aceita objeto vazio", () => {
      expect(respostasPosCursoSchema.partial().safeParse({}).success).toBe(true);
    });

    it("aceita um subconjunto de 1 campo válido", () => {
      const result = respostasPosCursoSchema.partial().safeParse({
        posParticNumInscritos: 10,
      });
      expect(result.success).toBe(true);
    });

    it("ainda rejeita um campo presente com valor fora de forma", () => {
      const result = respostasPosCursoSchema.partial().safeParse({
        posFinValorTotalExecutado: -5,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("datasReaisEmOrdem (edge case: término antes do início)", () => {
  it("término anterior ao início -> inválido", () => {
    expect(
      datasReaisEmOrdem({
        posExecDataInicioReal: "2026-06-01",
        posExecDataTerminoReal: "2026-03-01",
      }),
    ).toBe(false);
  });

  it("término igual ao início -> válido", () => {
    expect(
      datasReaisEmOrdem({
        posExecDataInicioReal: "2026-06-01",
        posExecDataTerminoReal: "2026-06-01",
      }),
    ).toBe(true);
  });

  it("término posterior ao início -> válido", () => {
    expect(
      datasReaisEmOrdem({
        posExecDataInicioReal: "2026-03-01",
        posExecDataTerminoReal: "2026-06-01",
      }),
    ).toBe(true);
  });

  it("só uma das datas presente -> válido (regra não se aplica ainda)", () => {
    expect(datasReaisEmOrdem({ posExecDataInicioReal: "2026-06-01" })).toBe(true);
    expect(datasReaisEmOrdem({ posExecDataTerminoReal: "2026-03-01" })).toBe(true);
  });

  it("nenhuma das datas presente -> válido", () => {
    expect(datasReaisEmOrdem({})).toBe(true);
  });
});
