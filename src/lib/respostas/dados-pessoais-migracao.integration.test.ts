// Teste de integração da migration que descarta as respostas pessoais já
// gravadas no questionário do curso (PESSOAL-21 a PESSOAL-24), contra o banco
// real `spma_test`.
//
// O teste roda o SQL da própria migration - lido do arquivo que
// `prisma migrate deploy` executa -, não uma reimplementação dele: o que está
// sendo provado é o artefato que sobe em produção. Mesmo padrão de
// `backfill.integration.test.ts`.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { lerRespostas } from "./repositorio";

const CPF_GO = "50918372640";
const CPF_ALUNO_COM_PESSOAIS = "74290531814";
const CPF_ALUNO_SEM_PESSOAIS = "61523847026";

// As 7 chaves pessoais, escritas aqui de novo em vez de importadas de
// `CHAVES_DADOS_PESSOAIS`: o teste tem de quebrar se a constante e o SQL da
// migration divergirem, e importar a constante esconderia exatamente isso.
const RESPOSTAS_PESSOAIS = {
  avalPessoalEstado: "AM",
  avalPessoalMunicipio: "Manaus, AM",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "26 a 35 anos",
  avalPessoalEscolaridade: "Ensino médio completo",
  avalPessoalRacaEtnia: "Pardo",
  avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
};

// Respostas que NÃO são pessoais e têm de sobreviver intactas - inclusive uma
// de seleção múltipla, cuja ordem também é verificada.
const RESPOSTAS_DO_CURSO = {
  avalProfissCondicaoTrabalho: "Desempregado",
  avalExpectRenda: "Média",
  avalGeralNota: 9,
  avalMotivMotivosParticipacao: [
    "Abrir o meu próprio negócio",
    "Conseguir um emprego/trabalho",
  ],
};

const DATA_ENCERRAMENTO = new Date("2026-02-10T12:00:00Z");

let cdOfertante: number;
let cdCurso: number;

function sqlDaMigration(): string[] {
  const raiz = path.resolve(process.cwd(), "prisma/migrations");
  const pasta = readdirSync(raiz).find((nome) =>
    nome.endsWith("_descartar_dados_pessoais_do_questionario"),
  );

  if (!pasta) {
    throw new Error("Migration de descarte não encontrada em prisma/migrations");
  }

  return readFileSync(path.join(raiz, pasta, "migration.sql"), "utf8")
    .split(";")
    .map((comando) =>
      comando
        .split("\n")
        .filter((linha) => !linha.trimStart().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((comando) => comando.length > 0);
}

async function rodarMigration(): Promise<void> {
  for (const comando of sqlDaMigration()) {
    await prisma.$executeRawUnsafe(comando);
  }
}

async function linhasDaAvaliacao(cpf: string): Promise<{ chave: string; ordem: number; valor: string }[]> {
  return prisma.respostaAvaliacao.findMany({
    where: { cpf, cdCurso },
    orderBy: [{ chave: "asc" }, { ordem: "asc" }],
    select: { chave: true, ordem: true, valor: true },
  });
}

/** Grava uma linha por (chave, posição), como a Avaliação gravava antes. */
async function semearRespostas(cpf: string, respostas: Record<string, unknown>): Promise<void> {
  const linhas = Object.entries(respostas).flatMap(([chave, valor]) =>
    (Array.isArray(valor) ? valor : [valor]).map((item, ordem) => ({
      cpf,
      cdCurso,
      chave,
      ordem,
      valor: String(item),
    })),
  );

  await prisma.respostaAvaliacao.createMany({ data: linhas });
}

describe("migration de descarte dos dados pessoais da avaliação (integration)", () => {
  beforeAll(async () => {
    const cpfs = [CPF_GO, CPF_ALUNO_COM_PESSOAIS, CPF_ALUNO_SEM_PESSOAIS];

    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: { in: cpfs } } });
    await prisma.usuario.deleteMany({ where: { cpf: { in: cpfs } } });

    const ofertante = await prisma.ofertante.create({
      data: { nome: "Ofertante Descarte Teste", uf: "AM" },
    });
    cdOfertante = ofertante.cdOfertante;

    await prisma.usuario.create({
      data: { cpf: CPF_GO, nome: "GO Descarte", tipo: "GO", cdOfertante },
    });
    await prisma.usuario.create({
      data: { cpf: CPF_ALUNO_COM_PESSOAIS, nome: "Aluno Com Pessoais", tipo: "AL" },
    });
    await prisma.usuario.create({
      data: { cpf: CPF_ALUNO_SEM_PESSOAIS, nome: "Aluno Sem Pessoais", tipo: "AL" },
    });

    const verba = await prisma.verba.create({ data: { cdOfertante, vlVerba: 100000 } });
    const curso = await prisma.preCurso.create({
      data: {
        cdOfertante,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 1000,
        criadoPor: CPF_GO,
      },
    });
    cdCurso = curso.cdCurso;

    // Avaliação ENCERRADA, com as duas metades de resposta misturadas: é o
    // estado que existia antes desta feature.
    await prisma.avaliacaoAluno.create({
      data: {
        cpf: CPF_ALUNO_COM_PESSOAIS,
        cdCurso,
        status: "ENCERRADO",
        parte1Completa: true,
        dataEncerramento: DATA_ENCERRAMENTO,
      },
    });
    await semearRespostas(CPF_ALUNO_COM_PESSOAIS, {
      ...RESPOSTAS_PESSOAIS,
      ...RESPOSTAS_DO_CURSO,
    });

    // Avaliação que nunca teve resposta pessoal (PESSOAL-24).
    await prisma.avaliacaoAluno.create({
      data: { cpf: CPF_ALUNO_SEM_PESSOAIS, cdCurso, parte1Completa: false },
    });
    await semearRespostas(CPF_ALUNO_SEM_PESSOAIS, RESPOSTAS_DO_CURSO);

    await rodarMigration();
  });

  afterAll(async () => {
    const cpfs = [CPF_GO, CPF_ALUNO_COM_PESSOAIS, CPF_ALUNO_SEM_PESSOAIS];

    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: { in: cpfs } } });
    await prisma.preCurso.deleteMany({ where: { cdOfertante } });
    await prisma.verba.deleteMany({ where: { cdOfertante } });
    await prisma.usuario.deleteMany({ where: { cpf: { in: cpfs } } });
    await prisma.ofertante.deleteMany({ where: { cdOfertante } });
    await prisma.$disconnect();
  });

  it("a migration de descarte existe como SQL executado por migrate deploy", () => {
    expect(sqlDaMigration().length).toBeGreaterThan(0);
  });

  // PESSOAL-21: nenhuma linha de chave pessoal sobra na avaliação.
  it("remove todas as linhas das 7 chaves pessoais", async () => {
    const chavesRestantes = (await linhasDaAvaliacao(CPF_ALUNO_COM_PESSOAIS)).map(
      (linha) => linha.chave,
    );

    for (const chave of Object.keys(RESPOSTAS_PESSOAIS)) {
      expect(chavesRestantes).not.toContain(chave);
    }

    expect(
      await prisma.respostaAvaliacao.count({
        where: { cdCurso, chave: { in: Object.keys(RESPOSTAS_PESSOAIS) } },
      }),
    ).toBe(0);
  });

  // PESSOAL-22: o questionário do curso fica exatamente como estava.
  it("deixa intactas as respostas de chave não-pessoal", async () => {
    expect(
      await lerRespostas(prisma, {
        formulario: "avaliacao",
        cpf: CPF_ALUNO_COM_PESSOAIS,
        cdCurso,
      }),
    ).toEqual(RESPOSTAS_DO_CURSO);

    // A ordem das opções da múltipla escolha sobrevive.
    expect(
      (await linhasDaAvaliacao(CPF_ALUNO_COM_PESSOAIS)).filter(
        (linha) => linha.chave === "avalMotivMotivosParticipacao",
      ),
    ).toEqual([
      { chave: "avalMotivMotivosParticipacao", ordem: 0, valor: "Abrir o meu próprio negócio" },
      { chave: "avalMotivMotivosParticipacao", ordem: 1, valor: "Conseguir um emprego/trabalho" },
    ]);
  });

  // PESSOAL-23: nenhuma conta, nenhuma avaliação e nenhuma coluna de estado
  // são tocadas - o descarte é só de linha de resposta.
  it("preserva a conta do Aluno, a avaliação e as colunas de estado", async () => {
    const aluno = await prisma.usuario.findUnique({
      where: { cpf: CPF_ALUNO_COM_PESSOAIS },
    });
    const avaliacao = await prisma.avaliacaoAluno.findUnique({
      where: { cpf_cdCurso: { cpf: CPF_ALUNO_COM_PESSOAIS, cdCurso } },
    });

    expect(aluno?.tipo).toBe("AL");
    expect(avaliacao).not.toBeNull();
    expect(avaliacao?.status).toBe("ENCERRADO");
    expect(avaliacao?.parte1Completa).toBe(true);
    expect(avaliacao?.dataEncerramento).toEqual(DATA_ENCERRAMENTO);
  });

  // PESSOAL-24: rodar sobre um banco sem nenhuma resposta pessoal não erra e
  // não remove nada. A primeira execução já levou todas, então esta segunda
  // roda exatamente nessa condição.
  it("roda sem erro e sem efeito quando não há nenhuma resposta pessoal", async () => {
    const antesComPessoais = await linhasDaAvaliacao(CPF_ALUNO_COM_PESSOAIS);
    const antesSemPessoais = await linhasDaAvaliacao(CPF_ALUNO_SEM_PESSOAIS);

    await expect(rodarMigration()).resolves.toBeUndefined();

    expect(await linhasDaAvaliacao(CPF_ALUNO_COM_PESSOAIS)).toEqual(antesComPessoais);
    expect(await linhasDaAvaliacao(CPF_ALUNO_SEM_PESSOAIS)).toEqual(antesSemPessoais);
  });

  // PESSOAL-22 na avaliação que nunca teve dado pessoal: nada foi removido.
  it("não toca na avaliação que nunca teve resposta pessoal", async () => {
    expect(
      await lerRespostas(prisma, {
        formulario: "avaliacao",
        cpf: CPF_ALUNO_SEM_PESSOAIS,
        cdCurso,
      }),
    ).toEqual(RESPOSTAS_DO_CURSO);

    const avaliacao = await prisma.avaliacaoAluno.findUnique({
      where: { cpf_cdCurso: { cpf: CPF_ALUNO_SEM_PESSOAIS, cdCurso } },
    });

    expect(avaliacao?.status).toBe("EM_ANDAMENTO");
    expect(avaliacao?.parte1Completa).toBe(false);
    expect(avaliacao?.dataEncerramento).toBeNull();
  });
});
