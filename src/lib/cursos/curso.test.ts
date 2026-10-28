// CUR-11: as rotas devolvem os campos do curso no registro da etapa, com os
// mesmos nomes de antes de `TB_Curso` existir.
import { describe, expect, it } from "vitest";
import { comCurso, incluirCurso } from "./curso";

const dataCriacao = new Date("2026-10-28T12:00:00.000Z");
const curso = {
  cdOfertante: "60000369000126",
  cdVerba: 3,
  vlCursoAlocado: "1500.00",
  criadoPor: "60000369000126",
  dataCriacao,
};

describe("comCurso", () => {
  it("põe ofertante, verba, valor, criador e data no topo do pré-curso, sem a chave curso", () => {
    expect(comCurso("preCurso", { cdCurso: 7, status: "EM_ANDAMENTO", curso })).toEqual({
      cdCurso: 7,
      status: "EM_ANDAMENTO",
      cdOfertante: "60000369000126",
      cdVerba: 3,
      vlCursoAlocado: "1500.00",
      criadoPor: "60000369000126",
      dataCriacao,
    });
  });

  it("no pós-curso, expõe só ofertante, criador e data, os campos que o pós já expunha", () => {
    expect(comCurso("posCurso", { cdCurso: 7, status: "ENCERRADO", curso })).toEqual({
      cdCurso: 7,
      status: "ENCERRADO",
      cdOfertante: "60000369000126",
      criadoPor: "60000369000126",
      dataCriacao,
    });
  });
});

describe("incluirCurso", () => {
  it("pede ao banco exatamente os campos que a etapa expõe", () => {
    expect(incluirCurso("preCurso")).toEqual({
      curso: { select: { cdOfertante: true, cdVerba: true, vlCursoAlocado: true, criadoPor: true, dataCriacao: true } },
    });
    expect(incluirCurso("posCurso")).toEqual({
      curso: { select: { cdOfertante: true, criadoPor: true, dataCriacao: true } },
    });
  });
});
