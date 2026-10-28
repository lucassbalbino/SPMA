// AD-050: o pós-curso só abre depois que o pré-curso do mesmo curso foi
// encerrado. O status chega por `curso.preCurso` (AD-052), que pode faltar.
import { describe, expect, it } from "vitest";
import { posCursoLiberado } from "./liberacao";

describe("posCursoLiberado", () => {
  it("libera o pós-curso só com o pré-curso encerrado", () => {
    expect(posCursoLiberado({ status: "ENCERRADO" })).toBe(true);
    expect(posCursoLiberado({ status: "EM_ANDAMENTO" })).toBe(false);
  });

  it("mantém o pós-curso fechado quando o curso não tem pré-curso", () => {
    expect(posCursoLiberado(null)).toBe(false);
  });
});
