// Exclusão de formação (RU-23 a RU-27) contra o banco real `spma_test`.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ErroHttp } from "@/lib/api/erro-http";
import { calcularSaldoVerba } from "@/lib/verba/saldo";
import { excluirCurso } from "./exclusao";

const CNPJ_GO = "44014556000101";
const CNPJ_GO_OUTRO = "44014556000202";
const CPF_VO = "86288366011";
const CPF_AM = "86288366022";
const CPF_ALUNO = "86288366033";

const GO = { tipo: "GO", documento: CNPJ_GO, cdOfertante: null } as const;
const GO_OUTRO = { tipo: "GO", documento: CNPJ_GO_OUTRO, cdOfertante: null } as const;
const VO = { tipo: "VO", documento: CPF_VO, cdOfertante: CNPJ_GO } as const;
const AM = { tipo: "AM", documento: CPF_AM, cdOfertante: null } as const;

let cdVerba: number;

async function criarFormacao(vlCursoAlocado = 400): Promise<number> {
  const curso = await prisma.curso.create({
    data: { cdOfertante: CNPJ_GO, cdVerba, vlCursoAlocado, criadoPor: CNPJ_GO },
  });
  await prisma.preCurso.create({ data: { cdCurso: curso.cdCurso } });
  await prisma.posCurso.create({ data: { cdCurso: curso.cdCurso } });
  return curso.cdCurso;
}

async function linhas(cdCurso: number) {
  return {
    curso: await prisma.curso.count({ where: { cdCurso } }),
    preCurso: await prisma.preCurso.count({ where: { cdCurso } }),
    posCurso: await prisma.posCurso.count({ where: { cdCurso } }),
  };
}

const TODAS = { curso: 1, preCurso: 1, posCurso: 1 };
const NENHUMA = { curso: 0, preCurso: 0, posCurso: 0 };

async function recusa(promessa: Promise<unknown>): Promise<ErroHttp> {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroHttp);
  return erro as ErroHttp;
}

async function limpar() {
  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
  await prisma.curso.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.verba.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.usuario.deleteMany({
    where: { documento: { in: [CPF_VO, CPF_AM, CPF_ALUNO, CNPJ_GO, CNPJ_GO_OUTRO] } },
  });
}

describe("excluirCurso (integration)", () => {
  beforeAll(async () => {
    await limpar();
    await prisma.usuario.create({ data: { documento: CNPJ_GO, nome: "GO Exclusão", tipo: "GO" } });
    await prisma.usuario.create({
      data: { documento: CNPJ_GO_OUTRO, nome: "GO Outro", tipo: "GO" },
    });
    await prisma.usuario.create({ data: { documento: CPF_ALUNO, nome: "Aluno", tipo: "AL" } });
    cdVerba = (
      await prisma.verba.create({
        data: { dsVerba: "Verba exclusão", cdOfertante: CNPJ_GO, vlVerba: 1000 },
      })
    ).cdVerba;
  });

  afterEach(async () => {
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
    await prisma.curso.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  });

  afterAll(async () => {
    await limpar();
    await prisma.$disconnect();
  });

  // RU-23: some o curso, o pré e o pós.
  it("formação sem aluno e em andamento: apaga curso, pré e pós", async () => {
    const cdCurso = await criarFormacao();
    expect(await linhas(cdCurso)).toEqual(TODAS);

    await excluirCurso(cdCurso, GO);

    expect(await linhas(cdCurso)).toEqual(NENHUMA);
  });

  // RU-24: o saldo volta ao valor de antes da criação.
  it("o saldo do recurso volta a incluir o valor que a formação alocava", async () => {
    const antes = (await calcularSaldoVerba(cdVerba)).saldoDisponivel.toNumber();
    const cdCurso = await criarFormacao(400);
    expect((await calcularSaldoVerba(cdVerba)).saldoDisponivel.toNumber()).toBe(antes - 400);

    await excluirCurso(cdCurso, GO);

    expect((await calcularSaldoVerba(cdVerba)).saldoDisponivel.toNumber()).toBe(antes);
  });

  // RU-25
  it("com aluno matriculado: 409 com a mensagem e nada é apagado", async () => {
    const cdCurso = await criarFormacao();
    await prisma.avaliacaoAluno.create({ data: { cpf: CPF_ALUNO, cdCurso } });

    const erro = await recusa(excluirCurso(cdCurso, GO));

    expect(erro.status).toBe(409);
    expect(erro.corpo).toEqual({
      erro: "Esta formação tem aluno cadastrado e não pode ser excluída.",
    });
    expect(await linhas(cdCurso)).toEqual(TODAS);
    expect(await prisma.avaliacaoAluno.count({ where: { cdCurso } })).toBe(1);
  });

  // RU-26
  it("com o Cadastro de Formação concluído: 409 com a mensagem e nada é apagado", async () => {
    const cdCurso = await criarFormacao();
    await prisma.preCurso.update({ where: { cdCurso }, data: { status: "ENCERRADO" } });

    const erro = await recusa(excluirCurso(cdCurso, GO));

    expect(erro.status).toBe(409);
    expect(erro.corpo).toEqual({ erro: "Cadastro de Formação concluído não pode ser excluído." });
    expect(await linhas(cdCurso)).toEqual(TODAS);
  });

  // RU-27: quem não gerencia a formação recebe 403, e nada some.
  it.each([
    ["GO de outro ofertante", GO_OUTRO],
    ["VO do próprio ofertante", VO],
  ])("%s: 403 e nada é apagado", async (_caso, solicitante) => {
    const cdCurso = await criarFormacao();

    const erro = await recusa(excluirCurso(cdCurso, solicitante));

    expect(erro.status).toBe(403);
    expect(await linhas(cdCurso)).toEqual(TODAS);
  });

  // AD-040: o AM gerencia formação de qualquer ofertante, então também exclui.
  it("AM exclui formação de qualquer ofertante", async () => {
    const cdCurso = await criarFormacao();

    await excluirCurso(cdCurso, AM);

    expect(await linhas(cdCurso)).toEqual(NENHUMA);
  });

  // RU-27 e edge case de exclusão repetida.
  it("formação inexistente, ou já excluída: 404", async () => {
    const cdCurso = await criarFormacao();
    await excluirCurso(cdCurso, GO);

    const erro = await recusa(excluirCurso(cdCurso, GO));

    expect(erro.status).toBe(404);
    expect(erro.corpo).toEqual({ erro: "Formação não encontrada" });
  });
});
