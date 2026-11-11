// Migration `situacao_profissional` (SPR-14 a SPR-16, AD-053), contra o banco
// real `spma_test`.
//
// Roda o UPDATE lido do arquivo que `prisma migrate deploy` executa, não uma
// reimplementação dele (mesmo raciocínio de `verba/identificacao-migracao`).
// O ALTER fica de fora: as colunas P10-P13 já existem aqui. Uma avaliação
// "antes da migration" é simulada com P10-P13 em NULL, que é o que o ALTER
// dá às linhas existentes.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

const CNPJ_GO = "62000000000191";
const CPF_ABERTA = "62000000001";
const CPF_ENCERRADA = "62000000002";
const ENCERRAMENTO = new Date("2026-10-30T15:00:00.000Z");

function updateDaMigration(): string {
  const raiz = path.resolve(process.cwd(), "prisma/migrations");
  const pasta = readdirSync(raiz).find((nome) => nome.endsWith("_situacao_profissional"));

  if (!pasta) {
    throw new Error("Migration situacao_profissional não encontrada em prisma/migrations");
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
    throw new Error("UPDATE não encontrado na migration");
  }

  return update;
}

// Parte 1 (sem P10-P13) e parte da Parte 2 já respondidas, como estavam
// antes da migration.
const RESPOSTAS = {
  p14: "b",
  p15: "a",
  p16: "c",
  p17a: true,
  p17b: false,
  p18: "b",
  p19: "a",
  p20: "b",
  p21: "c",
  p22: "a",
  p23: "d",
  p24_1: 5,
  p35: 9,
  p36: "Mais turistas na comunidade",
};

async function limpar(): Promise<void> {
  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: { in: [CPF_ABERTA, CPF_ENCERRADA] } } });
  await prisma.curso.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.verba.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.usuario.deleteMany({ where: { documento: { in: [CNPJ_GO, CPF_ABERTA, CPF_ENCERRADA] } } });
}

// As colunas de resposta ficam omitidas por padrão (`src/lib/db/prisma.ts`),
// então a leitura as pede uma a uma.
const ler = (cpf: string) =>
  prisma.avaliacaoAluno.findFirstOrThrow({
    where: { cpf },
    select: {
      status: true,
      parte1Completa: true,
      dataEncerramento: true,
      p10: true,
      p11: true,
      p12: true,
      p13: true,
      ...Object.fromEntries(Object.keys(RESPOSTAS).map((campo) => [campo, true])),
    },
  });

let cdCurso: number;

describe("migration situacao_profissional (integration)", () => {
  beforeAll(async () => {
    await limpar();
    await prisma.usuario.createMany({
      data: [
        { documento: CNPJ_GO, nome: "GO Situação Profissional", tipo: "GO" },
        { documento: CPF_ABERTA, nome: "Aluno Aberta", tipo: "AL" },
        { documento: CPF_ENCERRADA, nome: "Aluno Encerrada", tipo: "AL" },
      ],
    });
    const verba = await prisma.verba.create({
      data: { dsVerba: "Verba SPR", cdOfertante: CNPJ_GO, vlVerba: 10000 },
    });
    cdCurso = (
      await prisma.curso.create({
        data: { cdOfertante: CNPJ_GO, cdVerba: verba.cdVerba, vlCursoAlocado: 1000, criadoPor: CNPJ_GO },
      })
    ).cdCurso;

    await prisma.avaliacaoAluno.create({
      data: { cpf: CPF_ABERTA, cdCurso, parte1Completa: true, ...RESPOSTAS },
    });
    await prisma.avaliacaoAluno.create({
      data: {
        cpf: CPF_ENCERRADA,
        cdCurso,
        status: "ENCERRADO",
        parte1Completa: true,
        dataEncerramento: ENCERRAMENTO,
        ...RESPOSTAS,
      },
    });

    await prisma.$executeRawUnsafe(updateDaMigration());
  });

  afterAll(async () => {
    await limpar();
    await prisma.$disconnect();
  });

  it("SPR-14: avaliação em andamento fica com a Parte 1 incompleta", async () => {
    const aberta = await ler(CPF_ABERTA);

    expect(aberta.status).toBe("EM_ANDAMENTO");
    expect(aberta.parte1Completa).toBe(false);
  });

  it("SPR-15: avaliação encerrada mantém status, Parte 1 completa e data de encerramento", async () => {
    const encerrada = await ler(CPF_ENCERRADA);

    expect(encerrada.status).toBe("ENCERRADO");
    expect(encerrada.parte1Completa).toBe(true);
    expect(encerrada.dataEncerramento).toEqual(ENCERRAMENTO);
  });

  it("SPR-15/SPR-16: as respostas já gravadas ficam iguais e P10-P13 vazias, aberta ou encerrada", async () => {
    for (const cpf of [CPF_ABERTA, CPF_ENCERRADA]) {
      const avaliacao = await ler(cpf);

      expect(avaliacao).toMatchObject(RESPOSTAS);
      expect([avaliacao.p10, avaliacao.p11, avaliacao.p12, avaliacao.p13]).toEqual([null, null, null, null]);
    }
  });
});
