import { describe, expect, it } from "vitest";
import { TAMANHO_PAGINA, tiposVisiveis, totalPaginas } from "./paginacao";

describe("totalPaginas", () => {
  it("usa páginas de 20 (GU-13)", () => {
    expect(TAMANHO_PAGINA).toBe(20);
  });

  // GU-16: max(1, ceil(total / 20)).
  it.each([
    [0, 1],
    [1, 1],
    [20, 1],
    [21, 2],
    [40, 2],
    [41, 3],
  ])("total %i → %i páginas", (total, esperado) => {
    expect(totalPaginas(total)).toBe(esperado);
  });
});

describe("tiposVisiveis", () => {
  // GU-09: valores escritos à mão, na ordem do enum.
  it("AM vê os seis tipos", () => {
    expect(tiposVisiveis("AM")).toEqual(["AM", "GT", "VT", "GO", "VO", "AL"]);
  });

  it("GT vê todos os tipos menos o AM (revisão 3)", () => {
    expect(tiposVisiveis("GT")).toEqual(["GT", "VT", "GO", "VO", "AL"]);
  });

  it("GO vê só Visualizador Ofertante e Aluno", () => {
    expect(tiposVisiveis("GO")).toEqual(["VO", "AL"]);
  });

  it.each(["VT", "VO", "AL"] as const)("%s não tem chip nenhum", (tipo) => {
    expect(tiposVisiveis(tipo)).toEqual([]);
  });
});
