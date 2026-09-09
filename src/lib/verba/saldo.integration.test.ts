// Testes de integração do cálculo de saldo (REQ-OV-11/12), contra o banco
// real `spma_test`. `PreCurso` já existe no schema mesmo sem rota de criação
// de curso ainda - os cursos aqui são inseridos direto via Prisma, só para
// exercitar a agregação.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { calcularSaldoVerba, validarAlocacao, validarNovoValorTotal } from "./saldo";
import { obterVerbaIlimitada } from "./ilimitada";

const CPF_GO_SALDO = "91092093010";
const CPF_AM_SALDO = "39053344705";

let cdOfertante: number;
let cdVerbaVazia: number;
let cdVerbaComCurso: number;
let cdVerbaIlimitada: number;

describe("saldo da verba (integration)", () => {
  beforeAll(async () => {
    await prisma.usuario.deleteMany({
      where: { cpf: { in: [CPF_GO_SALDO, CPF_AM_SALDO] } },
    });

    const ofertante = await prisma.ofertante.create({
      data: { nome: "Ofertante Saldo Teste", uf: "SP" },
    });
    cdOfertante = ofertante.cdOfertante;

    await prisma.usuario.create({
      data: {
        cpf: CPF_GO_SALDO,
        nome: "GO Saldo Teste",
        tipo: "GO",
        cdOfertante,
      },
    });

    const verbaVazia = await prisma.verba.create({
      data: { cdOfertante, vlVerba: 10000 },
    });
    cdVerbaVazia = verbaVazia.cdVerba;

    const verbaComCurso = await prisma.verba.create({
      data: { cdOfertante, vlVerba: 10000 },
    });
    cdVerbaComCurso = verbaComCurso.cdVerba;

    await prisma.preCurso.create({
      data: {
        cdOfertante,
        cdVerba: cdVerbaComCurso,
        vlCursoAlocado: 4000,
        criadoPor: CPF_GO_SALDO,
      },
    });

    // AD-040: a verba ilimitada é única e nacional - vem da migration, não é
    // criada por teste. Um curso caríssimo custeado por ela prova que o teto
    // não existe nem depois de alocação nenhuma.
    await prisma.usuario.create({
      data: { cpf: CPF_AM_SALDO, nome: "AM Saldo Teste", tipo: "AM" },
    });

    cdVerbaIlimitada = (await obterVerbaIlimitada()).cdVerba;

    await prisma.preCurso.create({
      data: {
        cdOfertante,
        cdVerba: cdVerbaIlimitada,
        vlCursoAlocado: 99999999.99,
        criadoPor: CPF_AM_SALDO,
      },
    });
  });

  afterAll(async () => {
    await prisma.preCurso.deleteMany({ where: { cdOfertante } });
    await prisma.verba.deleteMany({ where: { cdOfertante } });
    await prisma.usuario.deleteMany({
      where: { cpf: { in: [CPF_GO_SALDO, CPF_AM_SALDO] } },
    });
    await prisma.ofertante.deleteMany({ where: { cdOfertante } });
    await prisma.$disconnect();
  });

  it("CA-OV-10: verba sem nenhum curso vinculado tem saldo igual ao valor total", async () => {
    const saldo = await calcularSaldoVerba(cdVerbaVazia);

    expect(saldo.ilimitada).toBe(false);
    expect(saldo.totalAlocado.toNumber()).toBe(0);
    expect(saldo.saldoDisponivel?.toNumber()).toBe(10000);
  });

  it("CA-OV-11: verba com um curso alocado tem saldo reduzido pelo valor alocado", async () => {
    const saldo = await calcularSaldoVerba(cdVerbaComCurso);

    expect(saldo.totalAlocado.toNumber()).toBe(4000);
    expect(saldo.saldoDisponivel?.toNumber()).toBe(6000);
  });

  it("validarNovoValorTotal: permite igualar o valor já alocado (AD-016)", async () => {
    const valido = await validarNovoValorTotal(cdVerbaComCurso, 4000);

    expect(valido).toBe(true);
  });

  it("validarNovoValorTotal: rejeita valor menor que o já alocado", async () => {
    const valido = await validarNovoValorTotal(cdVerbaComCurso, 3999.99);

    expect(valido).toBe(false);
  });

  it("CA-OV-12: validarAlocacao aceita uma alocação que iguala o saldo disponível (AD-016)", async () => {
    const resultado = await validarAlocacao(cdVerbaComCurso, 6000);

    expect(resultado.valido).toBe(true);
    expect(resultado.saldoDisponivel?.toNumber()).toBe(6000);
  });

  it("CA-OV-13: validarAlocacao rejeita uma alocação acima do saldo disponível e informa o saldo", async () => {
    const resultado = await validarAlocacao(cdVerbaComCurso, 6000.01);

    expect(resultado.valido).toBe(false);
    expect(resultado.saldoDisponivel?.toNumber()).toBe(6000);
  });

  it("AD-040: a verba ilimitada não tem saldo - `saldoDisponivel` é null, mesmo com curso alocado", async () => {
    const saldo = await calcularSaldoVerba(cdVerbaIlimitada);

    expect(saldo.ilimitada).toBe(true);
    expect(saldo.saldoDisponivel).toBeNull();
    expect(saldo.totalAlocado.toNumber()).toBeGreaterThan(0);
  });

  it("AD-040: validarAlocacao aceita qualquer valor na verba ilimitada", async () => {
    const resultado = await validarAlocacao(cdVerbaIlimitada, 99999999.99);

    expect(resultado.valido).toBe(true);
    expect(resultado.saldoDisponivel).toBeNull();
  });

  it("AD-040: obterVerbaIlimitada devolve sempre a mesma verba, sem Ofertante", async () => {
    const primeira = await obterVerbaIlimitada();
    const segunda = await obterVerbaIlimitada();

    expect(primeira.cdVerba).toBe(segunda.cdVerba);
    expect(primeira.cdOfertante).toBeNull();
    expect(primeira.ilimitada).toBe(true);
  });
});
