// Testes de integração da lista escopada de verbas (GV-11, GV-12, GV-13,
// GV-16), contra o banco real `spma_test`.
//
// Cenário: GO A com 2 verbas (uma com curso alocado), GO B com 1 verba, e um
// VO vinculado a A. Os documentos usam o prefixo 91094, que nenhum outro
// teste usa: o AM enxerga o banco inteiro, então as asserções dele filtram
// pelas verbas deste arquivo.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { listarVerbasDoEscopo } from "./consulta";

const CNPJ_GO_A = "91094000000101";
const CNPJ_GO_B = "91094000000202";
const CPF_VO_A = "91094000303";
const CPF_AM = "91094000404";
const CPF_AL = "91094000505";

const CNPJS = [CNPJ_GO_A, CNPJ_GO_B];
const DOCUMENTOS = [CPF_VO_A, CPF_AM, CPF_AL, ...CNPJS];

let cdVerbaAComCurso: number;
let cdVerbaASemCurso: number;
let cdVerbaB: number;

async function limpar() {
  await prisma.preCurso.deleteMany({ where: { cdOfertante: { in: CNPJS } } });
  await prisma.verba.deleteMany({ where: { cdOfertante: { in: CNPJS } } });
  await prisma.usuario.deleteMany({ where: { documento: { in: [CPF_VO_A, CPF_AM, CPF_AL] } } });
  await prisma.usuario.deleteMany({ where: { documento: { in: CNPJS } } });
}

describe("listarVerbasDoEscopo (integration)", () => {
  beforeAll(async () => {
    await limpar();

    await prisma.usuario.create({ data: { documento: CNPJ_GO_A, nome: "GO A Consulta", tipo: "GO" } });
    await prisma.usuario.create({ data: { documento: CNPJ_GO_B, nome: "GO B Consulta", tipo: "GO" } });
    await prisma.usuario.create({
      data: { documento: CPF_VO_A, nome: "VO de A", tipo: "VO", cdOfertante: CNPJ_GO_A },
    });
    await prisma.usuario.create({ data: { documento: CPF_AM, nome: "AM Consulta", tipo: "AM" } });
    await prisma.usuario.create({ data: { documento: CPF_AL, nome: "AL Consulta", tipo: "AL" } });

    cdVerbaAComCurso = (
      await prisma.verba.create({ data: { cdOfertante: CNPJ_GO_A, vlVerba: 10000 } })
    ).cdVerba;
    cdVerbaASemCurso = (
      await prisma.verba.create({ data: { cdOfertante: CNPJ_GO_A, vlVerba: 2500.5 } })
    ).cdVerba;
    cdVerbaB = (await prisma.verba.create({ data: { cdOfertante: CNPJ_GO_B, vlVerba: 700 } }))
      .cdVerba;

    await prisma.preCurso.create({
      data: {
        cdOfertante: CNPJ_GO_A,
        cdVerba: cdVerbaAComCurso,
        vlCursoAlocado: 4000,
        criadoPor: CNPJ_GO_A,
      },
    });
  });

  afterAll(async () => {
    await limpar();
    await prisma.$disconnect();
  });

  const usuario = (documento: string, tipo: "AM" | "GO" | "VO" | "AL", cdOfertante: string | null = null) => ({
    documento,
    tipo,
    cdOfertante,
  });

  it("GV-11: AM vê as verbas dos dois GOs, cada uma com o nome do GO", async () => {
    const lista = await listarVerbasDoEscopo(usuario(CPF_AM, "AM"));
    const deste = lista.filter((verba) => CNPJS.includes(verba.cdOfertante));

    expect(deste.map((verba) => [verba.cdVerba, verba.cdOfertante, verba.nomeOfertante])).toEqual([
      [cdVerbaAComCurso, CNPJ_GO_A, "GO A Consulta"],
      [cdVerbaASemCurso, CNPJ_GO_A, "GO A Consulta"],
      [cdVerbaB, CNPJ_GO_B, "GO B Consulta"],
    ]);
  });

  it("GV-12: GO A vê só as próprias 2 verbas", async () => {
    const lista = await listarVerbasDoEscopo(usuario(CNPJ_GO_A, "GO"));

    expect(lista.map((verba) => verba.cdVerba)).toEqual([cdVerbaAComCurso, cdVerbaASemCurso]);
  });

  it("GV-12: GO A não vê a verba de B nem pedindo o filtro de B", async () => {
    const lista = await listarVerbasDoEscopo(usuario(CNPJ_GO_A, "GO"), CNPJ_GO_B);

    expect(lista.map((verba) => verba.cdVerba)).toEqual([cdVerbaAComCurso, cdVerbaASemCurso]);
  });

  it("GV-12: GO B vê só a própria verba", async () => {
    const lista = await listarVerbasDoEscopo(usuario(CNPJ_GO_B, "GO"));

    expect(lista.map((verba) => verba.cdVerba)).toEqual([cdVerbaB]);
  });

  it("GV-13: VO vinculado a A vê as mesmas 2 verbas de A", async () => {
    const lista = await listarVerbasDoEscopo(usuario(CPF_VO_A, "VO", CNPJ_GO_A));

    expect(lista.map((verba) => verba.cdVerba)).toEqual([cdVerbaAComCurso, cdVerbaASemCurso]);
  });

  it("GV-16: saldo = valor total - soma alocada; sem curso, saldo = valor total", async () => {
    const lista = await listarVerbasDoEscopo(usuario(CNPJ_GO_A, "GO"));
    const comCurso = lista.find((verba) => verba.cdVerba === cdVerbaAComCurso);
    const semCurso = lista.find((verba) => verba.cdVerba === cdVerbaASemCurso);

    expect(comCurso?.vlVerba.toNumber()).toBe(10000);
    expect(comCurso?.saldoDisponivel.toNumber()).toBe(6000);
    expect(semCurso?.vlVerba.toNumber()).toBe(2500.5);
    expect(semCurso?.saldoDisponivel.toNumber()).toBe(2500.5);
  });

  it("falha fechada: AL recebe lista vazia, nunca a lista inteira", async () => {
    const lista = await listarVerbasDoEscopo(usuario(CPF_AL, "AL"));

    expect(lista).toEqual([]);
  });
});
