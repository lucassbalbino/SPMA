import { describe, expect, it } from "vitest";
import { validarCompletudePosCurso } from "./completude";

// Fixture com os 26 campos preenchidos, incluindo o único condicional - base
// para os testes abaixo (spread + override/omissão).
const RESPOSTA_COMPLETA = {
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

describe("validarCompletudePosCurso", () => {
  it("os 26 campos completos e o condicional satisfeito -> completo=true, pendentes=[]", () => {
    const resultado = validarCompletudePosCurso(RESPOSTA_COMPLETA);

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("posFinValorDevolvido=0 é tratado como preenchido, não como pendência", () => {
    const resultado = validarCompletudePosCurso(RESPOSTA_COMPLETA);

    expect(resultado.pendentes).not.toContain("posFinValorDevolvido");
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
