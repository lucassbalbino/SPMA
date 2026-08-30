import { describe, expect, it } from "vitest";
import {
  chavesOrfas,
  condicaoDe,
  estaPreenchido,
  pendenciasDasRegras,
  semOrfas,
  type RegraCondicional,
} from "./condicionais";

interface Exemplo {
  mae?: string;
  filha?: string;
  lista?: string[];
  nota?: number;
}

const REGRAS: readonly RegraCondicional<Exemplo>[] = [
  {
    chave: "filha",
    dependeDe: ["mae"],
    exigidaQuando: (dados) => dados.mae === "Sim",
  },
];

describe("estaPreenchido", () => {
  it("0 é resposta válida (escalas, valores monetários, nota 0-10)", () => {
    expect(estaPreenchido(0)).toBe(true);
  });

  it("string vazia e lista vazia não são respostas", () => {
    expect(estaPreenchido("")).toBe(false);
    expect(estaPreenchido([])).toBe(false);
  });

  it("undefined e null não são respostas", () => {
    expect(estaPreenchido(undefined)).toBe(false);
    expect(estaPreenchido(null)).toBe(false);
  });
});

describe("pendenciasDasRegras", () => {
  it("condição verdadeira sem resposta -> pendência", () => {
    expect(pendenciasDasRegras(REGRAS, { mae: "Sim" })).toEqual(["filha"]);
  });

  it("condição verdadeira com resposta -> sem pendência", () => {
    expect(pendenciasDasRegras(REGRAS, { mae: "Sim", filha: "x" })).toEqual([]);
  });

  it("condição falsa -> sem pendência, mesmo com a filha vazia", () => {
    expect(pendenciasDasRegras(REGRAS, { mae: "Não" })).toEqual([]);
  });
});

describe("chavesOrfas", () => {
  it("condição falsa com a filha respondida -> órfã", () => {
    expect(chavesOrfas(REGRAS, { mae: "Não", filha: "resposta antiga" })).toEqual(["filha"]);
  });

  it("condição verdadeira -> nunca órfã", () => {
    expect(chavesOrfas(REGRAS, { mae: "Sim", filha: "x" })).toEqual([]);
  });

  it("pergunta-mãe ainda em branco -> a filha NÃO é órfã (preenchimento fora de ordem não perde dado)", () => {
    expect(chavesOrfas(REGRAS, { filha: "x" })).toEqual([]);
  });

  it("filha vazia não é órfã (nada a descartar)", () => {
    expect(chavesOrfas(REGRAS, { mae: "Não", filha: "" })).toEqual([]);
  });
});

describe("semOrfas", () => {
  it("remove a chave órfã e preserva o resto", () => {
    const limpo = semOrfas(REGRAS, { mae: "Não", filha: "antiga", nota: 0 });

    expect(limpo).toEqual({ mae: "Não", nota: 0 });
  });

  it("não muta a entrada", () => {
    const original = { mae: "Não", filha: "antiga" };
    semOrfas(REGRAS, original);

    expect(original).toEqual({ mae: "Não", filha: "antiga" });
  });

  it("`extras` remove chaves de um gate de bloco inteiro", () => {
    const limpo = semOrfas(REGRAS, { mae: "Sim", filha: "x", nota: 9 }, ["nota"]);

    expect(limpo).toEqual({ mae: "Sim", filha: "x" });
  });

  it("sem órfãs, devolve os dados como estão", () => {
    const dados = { mae: "Sim", filha: "x" };

    expect(semOrfas(REGRAS, dados)).toEqual(dados);
  });
});

describe("condicaoDe", () => {
  it("devolve o predicado da regra", () => {
    const condicao = condicaoDe(REGRAS, "filha");

    expect(condicao({ mae: "Sim" })).toBe(true);
    expect(condicao({ mae: "Não" })).toBe(false);
  });

  it("chave sem regra -> erro (erro de digitação não vira campo invisível)", () => {
    expect(() => condicaoDe(REGRAS, "mae")).toThrow(/regra condicional/);
  });
});
