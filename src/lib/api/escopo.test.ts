import { describe, expect, it } from "vitest";
import { escopoDeLeitura, whereDeEscopo } from "./escopo";

const nacional = { documento: "52998224725", cdOfertante: null };
const CNPJ_GO = "11222333000181";

describe("escopoDeLeitura", () => {
  it.each(["AM", "GT", "VT"] as const)("%s sem filtro lê tudo", (tipo) => {
    expect(escopoDeLeitura({ tipo, ...nacional })).toEqual({ tipo: "todos" });
  });

  it.each(["AM", "GT", "VT"] as const)("%s honra o filtro informado", (tipo) => {
    expect(escopoDeLeitura({ tipo, ...nacional }, CNPJ_GO)).toEqual({
      tipo: "ofertante",
      cdOfertante: CNPJ_GO,
    });
  });

  // A regra de segurança que as 7 cópias do switch repetiam à mão.
  it("GO é preso ao próprio documento e IGNORA o filtro do cliente", () => {
    expect(
      escopoDeLeitura(
        { tipo: "GO", documento: CNPJ_GO, cdOfertante: null },
        "99999999000199",
      ),
    ).toEqual({ tipo: "ofertante", cdOfertante: CNPJ_GO });
  });

  it("VO é preso ao GO vinculado e IGNORA o filtro do cliente", () => {
    expect(
      escopoDeLeitura(
        { tipo: "VO", documento: "52998224725", cdOfertante: CNPJ_GO },
        "99999999000199",
      ),
    ).toEqual({ tipo: "ofertante", cdOfertante: CNPJ_GO });
  });

  // Falha fechado: "" nunca casa com um documento real.
  it("VO sem vínculo resolvido cai num escopo impossível, não em 'todos'", () => {
    expect(
      escopoDeLeitura({ tipo: "VO", documento: "52998224725", cdOfertante: null }),
    ).toEqual({ tipo: "ofertante", cdOfertante: "" });
  });

  it("AL lê pela própria identidade", () => {
    expect(
      escopoDeLeitura({ tipo: "AL", documento: "52998224725", cdOfertante: null }),
    ).toEqual({ tipo: "proprioAluno", cpf: "52998224725" });
  });
});

describe("whereDeEscopo", () => {
  const porOfertante = (cd: string) => ({ preCurso: { cdOfertante: cd } });
  const semEscopo = () => ({ preCurso: { cdOfertante: "" } });

  it("'todos' não filtra nada", () => {
    expect(whereDeEscopo({ tipo: "todos" }, porOfertante, semEscopo)).toEqual({});
  });

  it("'ofertante' aplica o caminho do model", () => {
    expect(
      whereDeEscopo({ tipo: "ofertante", cdOfertante: CNPJ_GO }, porOfertante, semEscopo),
    ).toEqual({ preCurso: { cdOfertante: CNPJ_GO } });
  });

  it("AL cai no ramo sem escopo de Ofertante", () => {
    expect(
      whereDeEscopo({ tipo: "proprioAluno", cpf: "x" }, porOfertante, semEscopo),
    ).toEqual({ preCurso: { cdOfertante: "" } });
  });
});
