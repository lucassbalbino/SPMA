// Backfill da identificação da verba (IDV-10, IDV-14), contra o banco real
// `spma_test`.
//
// Roda o UPDATE lido do arquivo que `prisma migrate deploy` executa, não uma
// reimplementação dele (mesmo raciocínio de `respostas/backfill`). Os dois
// ALTER da migration ficam de fora: a coluna já existe aqui. Uma verba "antes
// da migration" é simulada com `DS_Verba` vazio, que é o default que o
// primeiro ALTER dá às linhas existentes.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

const CNPJ_GO = "61000000000191";

function updateDaMigration(): string {
  const raiz = path.resolve(process.cwd(), "prisma/migrations");
  const pasta = readdirSync(raiz).find((nome) => nome.endsWith("_identificacao_verba"));

  if (!pasta) {
    throw new Error("Migration identificacao_verba não encontrada em prisma/migrations");
  }

  const update = readFileSync(path.join(raiz, pasta, "migration.sql"), "utf8")
    .split(";")
    .map((comando) =>
      comando
        .split("\n")
        .filter((linha) => !linha.trimStart().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .find((comando) => comando.startsWith("UPDATE"));

  if (!update) {
    throw new Error("UPDATE de backfill não encontrado na migration");
  }

  return update;
}

let cdSemNomeA: number;
let cdSemNomeB: number;
let cdComNome: number;

describe("migration identificacao_verba (integration)", () => {
  beforeAll(async () => {
    await prisma.verba.deleteMany({ where: { cdOfertante: CNPJ_GO } });
    await prisma.usuario.deleteMany({ where: { documento: CNPJ_GO } });
    await prisma.usuario.create({ data: { documento: CNPJ_GO, nome: "GO Backfill", tipo: "GO" } });

    cdSemNomeA = (
      await prisma.verba.create({
        data: { cdOfertante: CNPJ_GO, dsVerba: "", vlVerba: 1500.5, dtVerba: new Date("2026-03-15") },
      })
    ).cdVerba;
    cdSemNomeB = (
      await prisma.verba.create({ data: { cdOfertante: CNPJ_GO, dsVerba: "", vlVerba: 700 } })
    ).cdVerba;
    cdComNome = (
      await prisma.verba.create({
        data: { cdOfertante: CNPJ_GO, dsVerba: "Capacitação 2026", vlVerba: 300 },
      })
    ).cdVerba;

    await prisma.$executeRawUnsafe(updateDaMigration());
  });

  afterAll(async () => {
    await prisma.verba.deleteMany({ where: { cdOfertante: CNPJ_GO } });
    await prisma.usuario.deleteMany({ where: { documento: CNPJ_GO } });
    await prisma.$disconnect();
  });

  it('IDV-10/IDV-14: cada verba existente vira "Verba #<cdVerba>" e mantém o próprio cdVerba', async () => {
    const a = await prisma.verba.findUniqueOrThrow({ where: { cdVerba: cdSemNomeA } });
    const b = await prisma.verba.findUniqueOrThrow({ where: { cdVerba: cdSemNomeB } });

    expect(a.dsVerba).toBe(`Verba #${cdSemNomeA}`);
    expect(b.dsVerba).toBe(`Verba #${cdSemNomeB}`);
  });

  it("IDV-10: nenhum outro campo da verba muda", async () => {
    const a = await prisma.verba.findUniqueOrThrow({ where: { cdVerba: cdSemNomeA } });

    expect(a.cdOfertante).toBe(CNPJ_GO);
    expect(a.vlVerba.toString()).toBe("1500.5");
    expect(a.dtVerba?.toISOString().slice(0, 10)).toBe("2026-03-15");
  });

  it("não sobrescreve uma identificação já preenchida", async () => {
    const comNome = await prisma.verba.findUniqueOrThrow({ where: { cdVerba: cdComNome } });

    expect(comNome.dsVerba).toBe("Capacitação 2026");
  });
});
