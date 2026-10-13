// Testes de integração da consulta da gestão de usuários (GU-04/05/06,
// GU-10/11/13/16/18, GU-21), contra o banco real `spma_test`.
//
// O banco é compartilhado com os outros arquivos de integração, e para AM/GT
// o escopo é "todos": toda asserção de conteúdo filtra por `busca: "GU-T"`
// (prefixo do nome das fixtures), para não contar linhas de outro teste.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { UsuarioComEscopo } from "@/lib/auth/permissoes";
import { geradorDeCnpj } from "../../../e2e/helpers/cnpj";
import { ErroHttp } from "@/lib/api/erro-http";
import { consultarUsuarios, exigirAlvoEditavel, whereUsuariosVisiveis } from "./consulta";

// Prefixo "48": espaço de numeração deste arquivo (ver `e2e/helpers/cnpj.ts`).
const cnpj = geradorDeCnpj("48");

function digitoCpf(digitos: number[]): number {
  const peso = digitos.length + 1;
  const resto = digitos.reduce((soma, d, i) => soma + d * (peso - i), 0) % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** CPF válido no mesmo espaço de numeração "48". */
function cpf(indice: number): string {
  const base = `48${String(indice).padStart(7, "0")}`.split("").map(Number);
  const d1 = digitoCpf(base);
  return [...base, d1, digitoCpf([...base, d1])].join("");
}

const GO_A = cnpj(1);
const GO_B = cnpj(2);
const VO_A = cpf(1);
const VO_B = cpf(2);
const AL_A = cpf(3);
const AL_B = cpf(4);
const AL_SEM = cpf(5);
const GT = cpf(6);
const AM = cpf(7);
// Nunca criado: o alvo inexistente de GU-28.
const INEXISTENTE = cpf(8);
// Nome com dígito, para a busca mista de GU-11 ("GU-T 4").
const VT_MISTO = cpf(9);

const DOCUMENTOS = [GO_A, GO_B, VO_A, VO_B, AL_A, AL_B, AL_SEM, GT, AM, VT_MISTO];

const editorGoA: UsuarioComEscopo = { tipo: "GO", documento: GO_A, cdOfertante: null };
const editorGt: UsuarioComEscopo = { tipo: "GT", documento: GT, cdOfertante: null };
const editorAm: UsuarioComEscopo = { tipo: "AM", documento: AM, cdOfertante: null };

/** Apaga filhos antes dos pais, e VOs antes do GO a que se vinculam. */
async function limpar(documentos: string[]) {
  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: { in: documentos } } });
  await prisma.preCurso.deleteMany({ where: { cdOfertante: { in: documentos } } });
  await prisma.verba.deleteMany({ where: { cdOfertante: { in: documentos } } });
  await prisma.usuario.deleteMany({ where: { documento: { in: documentos }, tipo: "VO" } });
  await prisma.usuario.deleteMany({ where: { documento: { in: documentos } } });
}

/** Matricula o Aluno num curso novo do GO (verba + pré-curso + avaliação). */
async function matricular(cpfAluno: string, cnpjGo: string) {
  const verba = await prisma.verba.create({ data: { cdOfertante: cnpjGo, vlVerba: 1000 } });
  const curso = await prisma.preCurso.create({
    data: {
      cdOfertante: cnpjGo,
      cdVerba: verba.cdVerba,
      vlCursoAlocado: 100,
      criadoPor: cnpjGo,
    },
  });
  await prisma.avaliacaoAluno.create({ data: { cpf: cpfAluno, cdCurso: curso.cdCurso } });
}

/** A recusa precisa ser um `ErroHttp` com o status E a mensagem do spec. */
async function esperarRecusa(promessa: Promise<unknown>, status: number, erro: string) {
  const recusa = await promessa.then(
    () => null,
    (e: unknown) => e,
  );

  expect(recusa).toBeInstanceOf(ErroHttp);
  expect((recusa as ErroHttp).status).toBe(status);
  expect((recusa as ErroHttp).corpo).toEqual({ erro });
}

const SEM_PERMISSAO = "Você não tem permissão para editar este usuário";

function documentosDe(pagina: { usuarios: { documento: string }[] }): string[] {
  return pagina.usuarios.map((u) => u.documento);
}

describe("consulta de usuários (integration)", () => {
  beforeAll(async () => {
    await limpar(DOCUMENTOS);

    await prisma.usuario.createMany({
      data: [
        { documento: GO_A, nome: "GU-T GO A", tipo: "GO" },
        { documento: GO_B, nome: "GU-T GO B", tipo: "GO" },
        { documento: GT, nome: "GU-T GT", tipo: "GT" },
        { documento: AM, nome: "GU-T AM", tipo: "AM" },
        { documento: AL_A, nome: "GU-T AL A", tipo: "AL" },
        { documento: AL_B, nome: "GU-T AL B", tipo: "AL" },
        { documento: AL_SEM, nome: "GU-T AL SEM MATRICULA", tipo: "AL" },
        { documento: VT_MISTO, nome: "GU-T 4 BUSCA MISTA", tipo: "VT" },
      ],
    });
    await prisma.usuario.createMany({
      data: [
        { documento: VO_A, nome: "GU-T VO A", tipo: "VO", cdOfertante: GO_A },
        { documento: VO_B, nome: "GU-T VO B", tipo: "VO", cdOfertante: GO_B },
      ],
    });
    await matricular(AL_A, GO_A);
    await matricular(AL_B, GO_B);
  });

  afterAll(async () => {
    await limpar(DOCUMENTOS);
    await prisma.$disconnect();
  });

  it("GU-05: o GO vê exatamente o VO vinculado e o Aluno matriculado em curso seu", async () => {
    const pagina = await consultarUsuarios(editorGoA, { pagina: 1, busca: "GU-T" });

    expect(documentosDe(pagina).sort()).toEqual([VO_A, AL_A].sort());
    expect(pagina.total).toBe(2);
  });

  it("GU-04: o GT vê todos os usuários, de todos os tipos", async () => {
    const pagina = await consultarUsuarios(editorGt, { pagina: 1, busca: "GU-T" });

    expect(documentosDe(pagina).sort()).toEqual([...DOCUMENTOS].sort());
    expect(pagina.total).toBe(DOCUMENTOS.length);
  });

  it("GU-10: o filtro por tipo deixa só os usuários do escopo com aquele tipo", async () => {
    const pagina = await consultarUsuarios(editorGt, { pagina: 1, tipo: "AL", busca: "GU-T" });

    expect(documentosDe(pagina).sort()).toEqual([AL_A, AL_B, AL_SEM].sort());
  });

  it.each(["VT", "VO", "AL"] as const)("GU-06: %s não tem escopo de lista (null)", (tipo) => {
    expect(whereUsuariosVisiveis({ tipo, documento: cpf(99), cdOfertante: GO_A })).toBeNull();
  });

  it("GU-11: a busca por nome não diferencia maiúsculas de minúsculas", async () => {
    const pagina = await consultarUsuarios(editorGt, { pagina: 1, busca: "gu-t vo" });

    expect(documentosDe(pagina).sort()).toEqual([VO_A, VO_B].sort());
  });

  it("GU-11: a busca pelo CPF com pontuação acha só aquele usuário", async () => {
    const formatado = `${AL_B.slice(0, 3)}.${AL_B.slice(3, 6)}.${AL_B.slice(6, 9)}-${AL_B.slice(9)}`;

    const pagina = await consultarUsuarios(editorGt, { pagina: 1, busca: formatado });

    expect(documentosDe(pagina)).toEqual([AL_B]);
    expect(pagina.total).toBe(1);
  });

  it("GU-11: uma busca com letra compara só o nome, nunca os dígitos do documento", async () => {
    // Todo documento deste arquivo começa com "48": se o "4" de "GU-T 4" fosse
    // comparado com o documento, todos os fixtures voltariam.
    expect(VO_A).toContain("4");

    const pagina = await consultarUsuarios(editorGt, { pagina: 1, busca: "GU-T 4" });

    expect(documentosDe(pagina)).toEqual([VT_MISTO]);
    expect(pagina.total).toBe(1);
  });

  it("GU-21: editavel é true para o VO visto pelo GO e false para a própria linha do GT", async () => {
    const doGo = await consultarUsuarios(editorGoA, { pagina: 1, busca: "GU-T VO" });
    const doGt = await consultarUsuarios(editorGt, { pagina: 1, busca: "GU-T GT" });

    expect(doGo.usuarios).toEqual([
      { documento: VO_A, nome: "GU-T VO A", email: null, tipo: "VO", editavel: true },
    ]);
    expect(doGt.usuarios).toEqual([
      { documento: GT, nome: "GU-T GT", email: null, tipo: "GT", editavel: false },
    ]);
  });

  describe("exigirAlvoEditavel (GU-21/27/28/43)", () => {
    it("o GO recebe o VO vinculado a ele", async () => {
      await expect(exigirAlvoEditavel(editorGoA, VO_A)).resolves.toEqual({
        documento: VO_A,
        nome: "GU-T VO A",
        email: null,
        tipo: "VO",
      });
    });

    it("GU-27: o VO de outro GO dá 403", async () => {
      await esperarRecusa(exigirAlvoEditavel(editorGoA, VO_B), 403, SEM_PERMISSAO);
    });

    it("GU-28: para o GO, um documento inexistente dá 403, não 404", async () => {
      await esperarRecusa(exigirAlvoEditavel(editorGoA, INEXISTENTE), 403, SEM_PERMISSAO);
    });

    it("GU-27: o GT diante de um AM existente (fora da matriz) dá 403", async () => {
      await esperarRecusa(exigirAlvoEditavel(editorGt, AM), 403, SEM_PERMISSAO);
    });

    it("GU-28: para o GT, um documento inexistente dá 404", async () => {
      await esperarRecusa(
        exigirAlvoEditavel(editorGt, INEXISTENTE),
        404,
        "Usuário não encontrado",
      );
    });

    it("GU-21: o GT diante de si mesmo dá 403", async () => {
      await esperarRecusa(exigirAlvoEditavel(editorGt, GT), 403, SEM_PERMISSAO);
    });

    it("o AM recebe o GT", async () => {
      await expect(exigirAlvoEditavel(editorAm, GT)).resolves.toEqual({
        documento: GT,
        nome: "GU-T GT",
        email: null,
        tipo: "GT",
      });
    });
  });

  describe("paginação (GU-13/16/18)", () => {
    // 25 fixtures: "GU-T PAG 01".."GU-T PAG 23" e dois "GU-T PAG 24". O de
    // documento MAIOR é inserido primeiro, para a ordem de inserção não
    // coincidir com a ordem esperada do desempate.
    const PAG = Array.from({ length: 25 }, (_, i) => cpf(101 + i));
    const EMPATE_MAIOR = PAG[24];
    const EMPATE_MENOR = PAG[23];

    beforeAll(async () => {
      await limpar(PAG);
      await prisma.usuario.create({
        data: { documento: EMPATE_MAIOR, nome: "GU-T PAG 24", tipo: "VT" },
      });
      await prisma.usuario.create({
        data: { documento: EMPATE_MENOR, nome: "GU-T PAG 24", tipo: "VT" },
      });
      await prisma.usuario.createMany({
        data: PAG.slice(0, 23).map((documento, i) => ({
          documento,
          nome: `GU-T PAG ${String(i + 1).padStart(2, "0")}`,
          tipo: "VT" as const,
        })),
      });
    });

    afterAll(async () => {
      await limpar(PAG);
    });

    it("página 1 traz 20, ordenados por nome", async () => {
      const pagina = await consultarUsuarios(editorGt, { pagina: 1, busca: "GU-T PAG" });

      expect(pagina.usuarios.map((u) => u.nome)).toEqual(
        Array.from({ length: 20 }, (_, i) => `GU-T PAG ${String(i + 1).padStart(2, "0")}`),
      );
      expect(pagina.total).toBe(25);
      expect(pagina.pagina).toBe(1);
      expect(pagina.totalPaginas).toBe(2);
    });

    it("página 2 traz os 5 restantes, com o empate de nome desfeito pelo documento", async () => {
      const pagina = await consultarUsuarios(editorGt, { pagina: 2, busca: "GU-T PAG" });

      expect(documentosDe(pagina)).toEqual([PAG[20], PAG[21], PAG[22], EMPATE_MENOR, EMPATE_MAIOR]);
      expect(pagina.total).toBe(25);
      expect(pagina.pagina).toBe(2);
      expect(pagina.totalPaginas).toBe(2);
    });

    it("página além da última devolve lista vazia com os totais reais", async () => {
      const pagina = await consultarUsuarios(editorGt, { pagina: 3, busca: "GU-T PAG" });

      expect(pagina).toEqual({ usuarios: [], total: 25, pagina: 3, totalPaginas: 2 });
    });
  });
});
