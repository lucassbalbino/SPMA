// O modelo físico e o mapa de colunas não podem divergir (COL-10): toda
// chave do mapa tem as suas colunas no modelo certo, com o tipo certo
// (COL-07), e toda coluna `P*` do modelo tem dono no mapa.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAPA, campoPrisma, colunasDaEntrada, type Formulario } from "./colunas";

const MODELOS: Record<Formulario, string> = {
  preCurso: "PreCurso",
  posCurso: "PosCurso",
  avaliacao: "AvaliacaoAluno",
  dadosPessoais: "DadoPessoalAluno",
};

const TIPO_PRISMA = {
  unica: "String? @db.Char(1)",
  sigla: "String? @db.Char(2)",
  texto: "String? @db.Text",
  inteiro: "Int?",
  nota: "Int? @db.TinyInt",
  decimal: "Decimal? @db.Decimal(12, 2)",
  data: "DateTime? @db.Date",
  multipla: "Boolean?",
} as const;

// O percentual de evasão (Pré-Curso P18) é o único decimal que não é valor em reais.
function tipoEsperado(formulario: Formulario, tipo: keyof typeof TIPO_PRISMA, coluna: string): string {
  return formulario === "preCurso" && coluna === "P18" ? "Decimal? @db.Decimal(5, 2)" : TIPO_PRISMA[tipo];
}

const schema = readFileSync(path.resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

/** Colunas `P*` do modelo: coluna no banco → { campo, tipo com atributos de banco }. */
function colunasDoModelo(modelo: string): Map<string, { campo: string; tipo: string }> {
  const corpo = schema.match(new RegExp(`^model ${modelo} \\{([\\s\\S]*?)^\\}`, "m"))?.[1] ?? "";
  const colunas = new Map<string, { campo: string; tipo: string }>();

  for (const linha of corpo.split("\n")) {
    const achado = linha.match(/^\s*(\w+)\s+(\S+)\s+@map\("(P[^"]+)"\)\s*(@db\.\w+(?:\([^)]*\))?)?/);
    if (achado) {
      const [, campo, tipo, coluna, db] = achado;
      colunas.set(coluna, { campo, tipo: db ? `${tipo} ${db}` : tipo });
    }
  }

  return colunas;
}

describe("schema.prisma ↔ mapa de colunas (COL-10)", () => {
  for (const formulario of Object.keys(MAPA) as Formulario[]) {
    it(`${MODELOS[formulario]} tem exatamente as colunas do mapa, no tipo certo`, () => {
      const doModelo = colunasDoModelo(MODELOS[formulario]);
      const esperadas = MAPA[formulario].flatMap((entrada) =>
        colunasDaEntrada(entrada).map((coluna) => ({ coluna, tipo: tipoEsperado(formulario, entrada.tipo, coluna) })),
      );

      expect([...doModelo.keys()].sort()).toEqual(esperadas.map((e) => e.coluna).sort());
      for (const { coluna, tipo } of esperadas) {
        expect(doModelo.get(coluna)).toEqual({ campo: campoPrisma(coluna), tipo });
      }
    });
  }

  it("as tabelas de respostas por linha não existem mais (COL-09)", () => {
    expect(schema).not.toMatch(/model Resposta(PreCurso|PosCurso|Avaliacao)\b/);
    expect(schema).not.toMatch(/@map\("(Chave|Ordem|Valor)"\)/);
  });
});
