import { describe, expect, it } from "vitest";
import { validarCompletudePosCurso } from "./completude";

// Fixture com os 26 campos preenchidos, incluindo o único condicional - base
// para os testes abaixo (spread + override/omissão). Valores transcritos
// literalmente de `docs/Questionario_do_Gestor_Pos_Curso.md`, sem importar as
// constantes de opções do schema: o teste tem de quebrar se alguém renomear
// uma opção só no código de produção.
const RESPOSTA_COMPLETA = {
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

describe("validarCompletudePosCurso", () => {
  it("os 26 campos completos e o condicional satisfeito -> completo=true, pendentes=[]", () => {
    const resultado = validarCompletudePosCurso(RESPOSTA_COMPLETA);

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("valor monetário 0 é tratado como preenchido, não como pendência", () => {
    const resultado = validarCompletudePosCurso(RESPOSTA_COMPLETA);

    expect(resultado.pendentes).not.toContain("posFinValorBolsaPermanencia");
    expect(resultado.completo).toBe(true);
  });

  it("posExecHouveAlteracaoPlanejamento='Sim' sem posExecAlteracaoDetalhe -> pendente e incompleto (REQ-PO-07)", () => {
    const { posExecAlteracaoDetalhe: _omitido, ...semDetalhe } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePosCurso(semDetalhe);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("posExecAlteracaoDetalhe");
  });

  it("posExecHouveAlteracaoPlanejamento='Não' -> posExecAlteracaoDetalhe não aparece em pendentes mesmo vazio", () => {
    const { posExecAlteracaoDetalhe: _omitido, ...base } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePosCurso({
      ...base,
      posExecHouveAlteracaoPlanejamento: "Não",
    });

    expect(resultado.completo).toBe(true);
    expect(resultado.pendentes).toEqual([]);
  });

  it("campo sempre-obrigatório ausente (não condicional) também aparece em pendentes", () => {
    const { posAcompanhPlanoAcao: _omitido, ...semCampo } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePosCurso(semCampo);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("posAcompanhPlanoAcao");
  });

  it("Q5 (Lição Individual) ausente -> pendente: pergunta nova, não existia no dicionário derivado", () => {
    const { posAcompanhLicaoIndividual: _omitido, ...semCampo } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePosCurso(semCampo);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("posAcompanhLicaoIndividual");
  });

  it("Q23 (bolsa permanência) ausente -> pendente: pergunta nova, não existia no dicionário derivado", () => {
    const { posFinValorBolsaPermanencia: _omitido, ...semCampo } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePosCurso(semCampo);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("posFinValorBolsaPermanencia");
  });

  it("opção excludente de Q6 sozinha é aceita", () => {
    const resultado = validarCompletudePosCurso({
      ...RESPOSTA_COMPLETA,
      posAcompanhMonitoramento: [
        "Nenhuma ação de monitoramento foi realizada durante o desenvolvimento do Curso/Ação de Qualificação.",
      ],
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("opção excludente de Q6 combinada com outra -> pendente (contradição rejeitada)", () => {
    const resultado = validarCompletudePosCurso({
      ...RESPOSTA_COMPLETA,
      posAcompanhMonitoramento: [
        "Reuniões periódicas com alunos.",
        "Nenhuma ação de monitoramento foi realizada durante o desenvolvimento do Curso/Ação de Qualificação.",
      ],
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("posAcompanhMonitoramento");
  });

  it("pendência condicional aparece mesmo com a maioria dos outros campos sempre-obrigatórios também ausentes (preenchimento bem no início)", () => {
    // A checagem condicional roda independente do resultado do safeParse
    // base - por isso a pendência aparece mesmo quando quase tudo mais
    // ainda está ausente, diferente do que aconteceria com um
    // `.superRefine` encadeado no schema (ver comentário em completude.ts).
    const resultado = validarCompletudePosCurso({
      posExecHouveAlteracaoPlanejamento: "Sim",
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("posExecAlteracaoDetalhe");
  });
});
