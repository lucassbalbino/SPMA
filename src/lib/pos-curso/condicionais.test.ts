import { describe, expect, it } from "vitest";
import {
  normalizarCondicionaisPosCurso,
  pendenciasCondicionaisPosCurso,
} from "./condicionais";

// Valores transcritos literalmente de
// `docs/Questionario_do_Gestor_Pos_Curso.md` (Q11/Q12).
describe("normalizarCondicionaisPosCurso", () => {
  it("Q11='Sim' -> o detalhe da alteração é preservado", () => {
    const respostas = {
      posExecHouveAlteracaoPlanejamento: "Sim",
      posExecAlteracaoDetalhe: "Curso estendido em 2 semanas por feriados",
    };

    expect(normalizarCondicionaisPosCurso(respostas)).toEqual(respostas);
  });

  it("Q11='Não' com Q12 preenchida -> Q12 descartada (contradição não chega ao registro encerrado)", () => {
    const respostas = {
      posExecDificuldadesEnfrentadas: "Evasão nas semanas de chuva",
      posExecHouveAlteracaoPlanejamento: "Não",
      posExecAlteracaoDetalhe: "Curso estendido em 2 semanas por feriados",
    };

    expect(normalizarCondicionaisPosCurso(respostas)).toEqual({
      posExecDificuldadesEnfrentadas: "Evasão nas semanas de chuva",
      posExecHouveAlteracaoPlanejamento: "Não",
    });
  });

  it("Q11 ainda em branco -> Q12 preservada (preenchimento fora de ordem)", () => {
    const respostas = { posExecAlteracaoDetalhe: "rascunho do motivo" };

    expect(normalizarCondicionaisPosCurso(respostas)).toEqual(respostas);
  });

  it("respostas ausentes não quebram a normalização", () => {
    expect(normalizarCondicionaisPosCurso(null)).toEqual({});
  });
});

describe("pendenciasCondicionaisPosCurso", () => {
  it("Q11='Sim' sem Q12 -> pendência (REQ-PO-07)", () => {
    expect(
      pendenciasCondicionaisPosCurso({ posExecHouveAlteracaoPlanejamento: "Sim" }),
    ).toEqual(["posExecAlteracaoDetalhe"]);
  });

  it("Q11='Não' -> sem pendência", () => {
    expect(
      pendenciasCondicionaisPosCurso({ posExecHouveAlteracaoPlanejamento: "Não" }),
    ).toEqual([]);
  });
});
