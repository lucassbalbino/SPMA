// Exclusão de aluno (RU-30 a RU-32) contra o banco real `spma_test`. A
// autoridade (quem pode excluir) é da rota, por `exigirAlvoEditavel`; aqui
// fica a regra do "filho": o que impede e o que sai junto.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ErroHttp } from "@/lib/api/erro-http";
import { paraColunas } from "@/lib/respostas/colunas";
import { excluirAluno } from "./gestao";

const CNPJ_GO = "45014556000101";
const CPF_ALUNO = "86288377011";
const CPF_GT = "86288377022";

let cdCurso: number;
let cdCurso2: number;

async function criarAluno() {
  await prisma.usuario.create({ data: { documento: CPF_ALUNO, tipo: "AL" } });
  await prisma.avaliacaoAluno.create({ data: { cpf: CPF_ALUNO, cdCurso } });
  await prisma.sessao.create({
    data: { cpfUsuario: CPF_ALUNO, expiraEm: new Date(Date.now() + 60 * 60 * 1000) },
  });
}

async function linhasDoAluno() {
  return {
    usuario: await prisma.usuario.count({ where: { documento: CPF_ALUNO } }),
    avaliacoes: await prisma.avaliacaoAluno.count({ where: { cpf: CPF_ALUNO } }),
    sessoes: await prisma.sessao.count({ where: { cpfUsuario: CPF_ALUNO } }),
  };
}

async function recusa(promessa: Promise<unknown>): Promise<ErroHttp> {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroHttp);
  return erro as ErroHttp;
}

const MENSAGEM = { erro: "Este aluno já tem dados preenchidos e não pode ser excluído." };

async function limparAluno() {
  await prisma.dadoPessoalAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
  await prisma.usuario.deleteMany({ where: { documento: CPF_ALUNO } });
}

async function limparTudo() {
  await limparAluno();
  await prisma.curso.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.verba.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.usuario.deleteMany({ where: { documento: { in: [CNPJ_GO, CPF_GT] } } });
}

describe("excluirAluno (integration)", () => {
  beforeAll(async () => {
    await limparTudo();
    await prisma.usuario.create({ data: { documento: CNPJ_GO, nome: "GO Aluno", tipo: "GO" } });
    await prisma.usuario.create({ data: { documento: CPF_GT, nome: "GT", tipo: "GT" } });
    const { cdVerba } = await prisma.verba.create({
      data: { dsVerba: "Verba aluno", cdOfertante: CNPJ_GO, vlVerba: 1000 },
    });
    const novoCurso = async () =>
      (
        await prisma.curso.create({
          data: { cdOfertante: CNPJ_GO, cdVerba, vlCursoAlocado: 10, criadoPor: CNPJ_GO },
        })
      ).cdCurso;
    cdCurso = await novoCurso();
    cdCurso2 = await novoCurso();
  });

  afterEach(limparAluno);

  afterAll(async () => {
    await limparTudo();
    await prisma.$disconnect();
  });

  // RU-30: sem dados, sai o aluno, a matrícula vazia e as sessões.
  it("aluno só com matrícula vazia: apaga usuário, matrículas e sessões", async () => {
    await criarAluno();
    await prisma.avaliacaoAluno.create({ data: { cpf: CPF_ALUNO, cdCurso: cdCurso2 } });
    expect(await linhasDoAluno()).toEqual({ usuario: 1, avaliacoes: 2, sessoes: 1 });

    await excluirAluno(CPF_ALUNO);

    expect(await linhasDoAluno()).toEqual({ usuario: 0, avaliacoes: 0, sessoes: 0 });
  });

  // RU-31: cada tipo de "dado" bloqueia sozinho, e nada some.
  it("com dados pessoais gravados: 409 e nada some", async () => {
    await criarAluno();
    await prisma.dadoPessoalAluno.create({ data: { cpf: CPF_ALUNO, p5: "a" } });

    const erro = await recusa(excluirAluno(CPF_ALUNO));

    expect(erro.status).toBe(409);
    expect(erro.corpo).toEqual(MENSAGEM);
    expect(await linhasDoAluno()).toEqual({ usuario: 1, avaliacoes: 1, sessoes: 1 });
  });

  it("com uma resposta gravada na avaliação: 409 e nada some", async () => {
    await criarAluno();
    await prisma.avaliacaoAluno.update({
      where: { cpf_cdCurso: { cpf: CPF_ALUNO, cdCurso } },
      data: paraColunas("avaliacao", { avalExperienciaTrabalhoPrevio: "Sim" }),
    });

    const erro = await recusa(excluirAluno(CPF_ALUNO));

    expect(erro.status).toBe(409);
    expect(erro.corpo).toEqual(MENSAGEM);
    expect(await linhasDoAluno()).toEqual({ usuario: 1, avaliacoes: 1, sessoes: 1 });
  });

  it("com uma avaliação concluída: 409 e nada some", async () => {
    await criarAluno();
    await prisma.avaliacaoAluno.update({
      where: { cpf_cdCurso: { cpf: CPF_ALUNO, cdCurso } },
      data: { status: "ENCERRADO" },
    });

    const erro = await recusa(excluirAluno(CPF_ALUNO));

    expect(erro.status).toBe(409);
    expect(erro.corpo).toEqual(MENSAGEM);
    expect(await linhasDoAluno()).toEqual({ usuario: 1, avaliacoes: 1, sessoes: 1 });
  });

  // RU-32: só Aluno.
  it("alvo que não é Aluno: 400 'Só é possível excluir aluno.' e ele continua", async () => {
    const erro = await recusa(excluirAluno(CPF_GT));

    expect(erro.status).toBe(400);
    expect(erro.corpo).toEqual({ erro: "Só é possível excluir aluno." });
    expect(await prisma.usuario.count({ where: { documento: CPF_GT } })).toBe(1);
  });
});
