import { describe, expect, it } from "vitest";
import {
  criarPosCursoSchema,
  datasReaisEmOrdem,
  respostasPosCursoSchema,
} from "./pos-curso.schema";

// Fixture com as 26 chaves do questionário fonte
// (`docs/Questionario_do_Gestor_Pos_Curso.md`) preenchidas com valores
// válidos, incluindo o único condicional - usada como base para os testes de
// campo individual (spread + override).
const RESPOSTA_VALIDA = {
  posAcompanhProblemasEstudo:
    "Sim, foram definidos pelos Docentes em conjunto com a Coordenação Didático-Pedagógica.",
  posAcompanhConceitosTrabalhados:
    "Sim, foram detalhados os conceitos pelos Docentes em conjunto com a Coordenação Didático-Pedagógica.",
  posAcompanhPlanoAcao:
    "Sim, o Plano de Ação foi definido pelos Docentes em conjunto com a Coordenação Didático-Pedagógica responsável.",
  posAcompanhProvaSituacao:
    "Sim, foi elaborada pelos Docentes, mas só foi realizada pelos alunos no primeiro dia de aula.",
  posAcompanhLicaoIndividual: "Sim, foi realizada.",
  posAcompanhMonitoramento: ["Reuniões periódicas com alunos."],

  posExecDataInicioReal: "2026-03-01",
  posExecDataTerminoReal: "2026-06-01",
  posExecCargaHorariaRealizada: 120,
  posExecDificuldadesEnfrentadas: "Evasão de alunos nas semanas de chuva forte",
  posExecHouveAlteracaoPlanejamento: "Sim",
  posExecAlteracaoDetalhe: "Curso estendido em 2 semanas por feriados",

  posParticNumInscritos: 40,
  posParticNumMatriculados: 35,
  posParticNumConcluintes: 30,
  posParticMotivosAbandono: ["Dificuldades financeiras", "Horário inapropriado das aulas"],
  posParticDemandaMaiorQueOferta: "Sim",
  posParticIntencaoNovaOferta: "Sim",

  posFinValorTotal: 15000,
  posFinValorProfessores: 8000,
  posFinValorMateriais: 3000,
  posFinValorInfraestrutura: 4000,
  posFinValorBolsaPermanencia: 0,
  posFinHouveDevolucaoRecursos: "Não",
  posFinNecessidadeAditivo: "Não",

  posContEstrategias: ["Estabelecimento de parcerias junto a entidades públicas."],
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

  it("tem exatamente 26 chaves (questionário fonte, Q1-Q26)", () => {
    expect(Object.keys(respostasPosCursoSchema.shape)).toHaveLength(26);
  });

  it("posAcompanhProvaSituacao rejeita valor fora do enum", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posAcompanhProvaSituacao: "Inventado",
    });
    expect(result.success).toBe(false);
  });

  it("posAcompanhProblemasEstudo é seleção única, não múltipla (Q1)", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posAcompanhProblemasEstudo: ["Não se aplica."],
    });
    expect(result.success).toBe(false);
  });

  it("posExecDificuldadesEnfrentadas é texto aberto, não seleção (Q10)", () => {
    const aberto = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posExecDificuldadesEnfrentadas: "Qualquer texto livre do gestor",
    });
    expect(aberto.success).toBe(true);

    const comoArray = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posExecDificuldadesEnfrentadas: ["Evasão de alunos"],
    });
    expect(comoArray.success).toBe(false);
  });

  // AD-036: supera o AD-025, que havia travado este campo como seleção única
  // quando a lista real ainda não existia.
  it("posParticMotivosAbandono é seleção múltipla e aceita mais de um motivo (Q16)", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posParticMotivosAbandono: [
        "Falta de motivação/interesse",
        "Local muito distante de casa",
        "Outro",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("posParticMotivosAbandono rejeita item fora do enum", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posParticMotivosAbandono: ["Motivo inventado"],
    });
    expect(result.success).toBe(false);
  });

  it("posContEstrategias aceita array de opções válidas", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posContEstrategias: [
        "Estabelecimento de parcerias junto a entidades privadas.",
        "Integração do Curso a projetos e/ou programas desenvolvidos no território.",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("campo de seleção múltipla rejeita item fora do enum", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posAcompanhMonitoramento: ["Ação inventada"],
    });
    expect(result.success).toBe(false);
  });

  it("campo de seleção múltipla obrigatório rejeita lista vazia", () => {
    const result = respostasPosCursoSchema.safeParse({
      ...RESPOSTA_VALIDA,
      posContEstrategias: [],
    });
    expect(result.success).toBe(false);
  });

  // As duas perguntas de múltipla escolha cuja última alternativa nega todas
  // as outras (Q6 e Q26).
  describe("opções excludentes", () => {
    const CASOS = [
      {
        chave: "posAcompanhMonitoramento",
        exclusiva:
          "Nenhuma ação de monitoramento foi realizada durante o desenvolvimento do Curso/Ação de Qualificação.",
        outra: "Reuniões periódicas com alunos.",
      },
      {
        chave: "posContEstrategias",
        exclusiva: "Não foi adotada nenhuma estratégia de continuidade e ampliação.",
        outra: "Estabelecimento de parcerias junto a entidades públicas.",
      },
    ] as const;

    it.each(CASOS)("$chave aceita a opção excludente sozinha", ({ chave, exclusiva }) => {
      const result = respostasPosCursoSchema.safeParse({
        ...RESPOSTA_VALIDA,
        [chave]: [exclusiva],
      });
      expect(result.success).toBe(true);
    });

    it.each(CASOS)(
      "$chave rejeita a opção excludente combinada com outra",
      ({ chave, exclusiva, outra }) => {
        const result = respostasPosCursoSchema.safeParse({
          ...RESPOSTA_VALIDA,
          [chave]: [outra, exclusiva],
        });
        expect(result.success).toBe(false);
      },
    );
  });

  describe("valores monetários (Q19-Q23) nunca negativos", () => {
    const camposMonetarios = [
      "posFinValorTotal",
      "posFinValorProfessores",
      "posFinValorMateriais",
      "posFinValorInfraestrutura",
      "posFinValorBolsaPermanencia",
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
        posFinValorTotal: -5,
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
