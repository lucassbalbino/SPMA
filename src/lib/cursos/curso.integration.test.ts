// Persistência do curso em `TB_Curso` (AD-052), contra o banco real
// `spma_test`: criação pela rota (CUR-05, CUR-06, CUR-11) e exclusão
// (CUR-07, CUR-08). A sessão é simulada - a autorização não está em teste
// aqui, só o que a rota grava.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const CNPJ_GO = "33014556000196";
const CPF_ALUNO = "86288366757";

vi.mock("@/lib/api/guardas", () => ({
  exigirMutacao: async () => ({ usuario: { documento: CNPJ_GO, tipo: "GO", cdOfertante: null } }),
}));

// Falha injetada no último passo de dentro da transação de criação: montar o
// pós-curso devolvido. Desligada por padrão.
const falharNoPos = vi.hoisted(() => ({ ativo: false }));
vi.mock("@/lib/cursos/curso", async () => {
  const real = await vi.importActual<typeof import("@/lib/cursos/curso")>("@/lib/cursos/curso");
  return {
    ...real,
    comCurso: ((etapa, registro) => {
      if (falharNoPos.ativo && etapa === "posCurso") throw new Error("falha injetada");
      return real.comCurso(etapa, registro);
    }) as typeof real.comCurso,
  };
});

import { prisma } from "@/lib/db/prisma";
import { POST } from "@/app/api/cursos/route";

let cdVerba: number;

const criarCurso = (vlCursoAlocado: number) =>
  POST(
    new Request("http://localhost/api/cursos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cdVerba, vlCursoAlocado }),
    }),
  );

const contar = async () => ({
  cursos: await prisma.curso.count({ where: { cdOfertante: CNPJ_GO } }),
  preCursos: await prisma.preCurso.count({ where: { curso: { cdOfertante: CNPJ_GO } } }),
  posCursos: await prisma.posCurso.count({ where: { curso: { cdOfertante: CNPJ_GO } } }),
});

async function limpar() {
  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
  await prisma.curso.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.verba.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.usuario.deleteMany({ where: { documento: { in: [CNPJ_GO, CPF_ALUNO] } } });
}

describe("curso em TB_Curso (integration)", () => {
  beforeAll(async () => {
    await limpar();
    await prisma.usuario.create({ data: { documento: CNPJ_GO, nome: "GO Curso", tipo: "GO" } });
    await prisma.usuario.create({ data: { documento: CPF_ALUNO, nome: "Aluno Curso", tipo: "AL" } });
    cdVerba = (await prisma.verba.create({ data: { dsVerba: "Verba curso", cdOfertante: CNPJ_GO, vlVerba: 10000 } }))
      .cdVerba;
  });

  afterEach(async () => {
    falharNoPos.ativo = false;
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
    await prisma.curso.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  });

  afterAll(async () => {
    await limpar();
    await prisma.$disconnect();
  });

  // CUR-05: um curso, um pré e um pós com o mesmo código.
  it("cria o curso, o pré-curso e o pós-curso com o mesmo CD_Curso", async () => {
    const res = await criarCurso(1250.75);
    expect(res.status).toBe(201);
    const { preCurso } = await res.json();

    const curso = await prisma.curso.findUniqueOrThrow({
      where: { cdCurso: preCurso.cdCurso },
      include: { preCurso: true, posCurso: true },
    });
    expect({
      cdOfertante: curso.cdOfertante,
      cdVerba: curso.cdVerba,
      vlCursoAlocado: Number(curso.vlCursoAlocado),
      criadoPor: curso.criadoPor,
      preCurso: curso.preCurso?.cdCurso,
      posCurso: curso.posCurso?.cdCurso,
    }).toEqual({
      cdOfertante: CNPJ_GO,
      cdVerba,
      vlCursoAlocado: 1250.75,
      criadoPor: CNPJ_GO,
      preCurso: preCurso.cdCurso,
      posCurso: preCurso.cdCurso,
    });
  });

  // CUR-11: a resposta da criação traz os campos do curso no registro de cada etapa.
  it("devolve os campos do curso no pré-curso e no pós-curso, como antes", async () => {
    const corpo = await (await criarCurso(300)).json();

    expect(corpo.preCurso).toEqual(
      expect.objectContaining({
        cdOfertante: CNPJ_GO,
        cdVerba,
        vlCursoAlocado: "300",
        criadoPor: CNPJ_GO,
        dataCriacao: expect.any(String),
        status: "EM_ANDAMENTO",
        respostas: null,
      }),
    );
    expect(corpo.posCurso).toEqual(
      expect.objectContaining({
        cdCurso: corpo.preCurso.cdCurso,
        cdOfertante: CNPJ_GO,
        criadoPor: CNPJ_GO,
        dataCriacao: corpo.preCurso.dataCriacao,
        status: "EM_ANDAMENTO",
        respostas: null,
      }),
    );
    expect(Object.keys(corpo.preCurso)).not.toContain("curso");
    expect(Object.keys(corpo.posCurso)).not.toContain("curso");
  });

  // CUR-06: falha dentro da transação não deixa linha em nenhuma das três tabelas.
  it("não grava curso, pré nem pós quando a criação falha no meio", async () => {
    falharNoPos.ativo = true;

    const res = await criarCurso(100);

    expect(res.status).toBe(500);
    expect(await contar()).toEqual({ cursos: 0, preCursos: 0, posCursos: 0 });
  });

  // CUR-07: apagar o curso apaga o pré e o pós.
  it("apaga o pré-curso e o pós-curso junto com o curso", async () => {
    const { preCurso } = await (await criarCurso(100)).json();

    await prisma.curso.delete({ where: { cdCurso: preCurso.cdCurso } });

    expect(await prisma.preCurso.count({ where: { cdCurso: preCurso.cdCurso } })).toBe(0);
    expect(await prisma.posCurso.count({ where: { cdCurso: preCurso.cdCurso } })).toBe(0);
  });

  // CUR-08: curso com avaliação não pode ser apagado, e nada some.
  it("recusa apagar um curso com avaliação e mantém curso, pré, pós e avaliação", async () => {
    const { preCurso } = await (await criarCurso(100)).json();
    const cdCurso = preCurso.cdCurso;
    await prisma.avaliacaoAluno.create({ data: { cpf: CPF_ALUNO, cdCurso } });

    await expect(prisma.curso.delete({ where: { cdCurso } })).rejects.toThrow();

    expect(await prisma.curso.count({ where: { cdCurso } })).toBe(1);
    expect(await prisma.preCurso.count({ where: { cdCurso } })).toBe(1);
    expect(await prisma.posCurso.count({ where: { cdCurso } })).toBe(1);
    expect(await prisma.avaliacaoAluno.count({ where: { cdCurso } })).toBe(1);
  });
});
