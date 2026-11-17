// Migration `oportunidades_trabalho` (OPT-10, OPT-13, AD-055), contra o banco
// real `spma_test`, onde `prisma migrate deploy` já a aplicou.
//
// OPT-13 vem do próprio arquivo: a migration só acrescenta colunas que
// aceitam NULL. Sem UPDATE, DELETE, DROP ou MODIFY, nenhuma linha existente
// muda. OPT-10 vem do information_schema: tipo, NULL e posição das colunas.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

function comandosDaMigration(): string[] {
  const raiz = path.resolve(process.cwd(), "prisma/migrations");
  const pasta = readdirSync(raiz).find((nome) => nome.endsWith("_oportunidades_trabalho"));

  if (!pasta) {
    throw new Error("Migration oportunidades_trabalho não encontrada em prisma/migrations");
  }

  return readFileSync(path.join(raiz, pasta, "migration.sql"), "utf8")
    .split("\n")
    .filter((linha) => !linha.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((comando) => comando.trim())
    .filter(Boolean);
}

describe("migration oportunidades_trabalho (integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("OPT-13: só acrescenta colunas em TB_Avaliacao_Aluno, sem tocar em dado", () => {
    const comandos = comandosDaMigration();

    expect(comandos).toHaveLength(1);
    const [alter] = comandos;
    expect(alter).toMatch(/^ALTER TABLE `TB_Avaliacao_Aluno`/);
    expect(alter).not.toMatch(/\b(UPDATE|DELETE|DROP|MODIFY|CHANGE|RENAME|NOT NULL|DEFAULT)\b/i);
    expect(alter.match(/ADD COLUMN/g)).toHaveLength(6);
  });

  it("OPT-10: P30-P34 são CHAR(1) e P30Qual é TEXT, todas aceitando NULL, entre P29f e P35", async () => {
    const colunas = await prisma.$queryRawUnsafe<
      { nome: string; tipo: string; nulo: string }[]
    >(
      `SELECT COLUMN_NAME AS nome, COLUMN_TYPE AS tipo, IS_NULLABLE AS nulo
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TB_Avaliacao_Aluno'
       ORDER BY ORDINAL_POSITION`,
    );
    const nomes = colunas.map((coluna) => coluna.nome);
    const inicio = nomes.indexOf("P29f");

    expect(inicio).toBeGreaterThan(-1);
    expect(colunas.slice(inicio + 1, inicio + 8)).toEqual([
      { nome: "P30", tipo: "char(1)", nulo: "YES" },
      { nome: "P30Qual", tipo: "text", nulo: "YES" },
      { nome: "P31", tipo: "char(1)", nulo: "YES" },
      { nome: "P32", tipo: "char(1)", nulo: "YES" },
      { nome: "P33", tipo: "char(1)", nulo: "YES" },
      { nome: "P34", tipo: "char(1)", nulo: "YES" },
      expect.objectContaining({ nome: "P35" }),
    ]);
  });
});
