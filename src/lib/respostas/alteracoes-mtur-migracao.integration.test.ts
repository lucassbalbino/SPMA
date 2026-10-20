// Teste de integração da migration que aplica a revisão dos questionários
// pelo MTur às respostas já gravadas (MTUR-13 a MTUR-17), contra o banco real
// `spma_test`.
//
// O teste roda o SQL da própria migration - lido do arquivo que
// `prisma migrate deploy` executa -, não uma reimplementação dele. Mesmo
// padrão de `dados-pessoais-migracao.integration.test.ts`.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

const CNPJ_GO = "48291736000150";
// Um Aluno por cenário: o dado pessoal é chaveado só pelo CPF.
const CPF_NEGRO_FISICA = "83920174650";
const CPF_PARDO_AUDITIVA = "83920174731";
const CPF_PRETO_VISUAL = "83920174812";
const CPF_BRANCO_INTELECTUAL = "83920174903";
const CPF_SEM_PCD = "83920175047";
const CPFS_ALUNOS = [
  CPF_NEGRO_FISICA,
  CPF_PARDO_AUDITIVA,
  CPF_PRETO_VISUAL,
  CPF_BRANCO_INTELECTUAL,
  CPF_SEM_PCD,
];

// Textos e chaves escritos aqui de novo em vez de importados do schema: o
// teste tem de quebrar se o schema e o SQL da migration divergirem.
const PCD_FISICA =
  "Sim, tenho deficiência física (paralisias, amputações, ausência de membros, lesões nervosas ou musculares, etc.)";

const CHAVES_REMOVIDAS = [
  "avalProfissCondicaoTrabalho",
  "avalProfissAtuaTurismo",
  "avalProfissAtividadeEspecifica",
  "avalProfissFaixaRenda",
  "avalContinuidadeRetomadaEstudos",
  "avalOportunSituacaoTrabalho",
  "avalOportunSituacaoTrabalhoOutra",
  "avalOportunIntencaoAtuarTurismo",
  "avalEfetivEmprego",
  "avalEfetivAumentoRenda",
  "avalEfetivMelhoriaPadraoVida",
];

const RESPOSTAS_REMOVIDAS = Object.fromEntries(CHAVES_REMOVIDAS.map((chave) => [chave, "Sim"]));

// As 7 sempre-obrigatórias da Parte 1 depois da revisão, com Q15 = "Não".
const PARTE_1_SEM_Q16 = {
  avalExperienciaTrabalhoPrevio: "Não",
  avalExperienciaCursoAnterior: "Não",
  avalMotivMotivosParticipacao: ["Conseguir um emprego/trabalho", "Abrir o meu próprio negócio"],
  avalMotivFormaConhecimento: "pelas Redes Sociais",
  avalExpectAtendimento: "Sim",
  avalExpectEmprego: "Talvez",
  avalExpectRenda: "Média",
};

let cdCurso: number;

function sqlDaMigration(): string[] {
  const raiz = path.resolve(process.cwd(), "prisma/migrations");
  const pasta = readdirSync(raiz).find((nome) => nome.endsWith("_alteracoes_mtur_1"));

  if (!pasta) {
    throw new Error("Migration alteracoes_mtur_1 não encontrada em prisma/migrations");
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

function linhas(respostas: Record<string, unknown>) {
  return Object.entries(respostas).flatMap(([chave, valor]) =>
    (Array.isArray(valor) ? valor : [valor]).map((item, ordem) => ({
      chave,
      ordem,
      valor: String(item),
    })),
  );
}

async function semearAvaliacao(
  cpf: string,
  respostas: Record<string, unknown>,
  estado: { status?: "ENCERRADO"; parte1Completa: boolean },
): Promise<void> {
  await prisma.avaliacaoAluno.create({ data: { cpf, cdCurso, ...estado } });
  await prisma.respostaAvaliacao.createMany({
    data: linhas(respostas).map((linha) => ({ cpf, cdCurso, ...linha })),
  });
}

async function semearDadosPessoais(cpf: string, respostas: Record<string, string>) {
  await prisma.dadoPessoalAluno.createMany({
    data: linhas(respostas).map((linha) => ({ cpf, ...linha })),
  });
}

async function dadoPessoal(cpf: string, chave: string): Promise<string | undefined> {
  const linha = await prisma.dadoPessoalAluno.findFirst({ where: { cpf, chave } });
  return linha?.valor;
}

async function parte1Completa(cpf: string): Promise<boolean | undefined> {
  const avaliacao = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
  });
  return avaliacao?.parte1Completa;
}

async function chavesDaAvaliacao(cpf: string): Promise<string[]> {
  const todas = await prisma.respostaAvaliacao.findMany({
    where: { cpf, cdCurso },
    select: { chave: true },
  });
  return [...new Set(todas.map((linha) => linha.chave))].sort();
}

async function limpar(): Promise<void> {
  const documentos = [CNPJ_GO, ...CPFS_ALUNOS];
  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: { in: CPFS_ALUNOS } } });
  await prisma.preCurso.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.verba.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.usuario.deleteMany({ where: { documento: { in: documentos } } });
}

describe("migration alteracoes_mtur_1 (integration)", () => {
  beforeAll(async () => {
    await limpar();

    await prisma.usuario.create({
      data: { documento: CNPJ_GO, nome: "GO MTur", tipo: "GO", uf: "AM" },
    });
    for (const cpf of CPFS_ALUNOS) {
      await prisma.usuario.create({ data: { documento: cpf, nome: "Aluno MTur", tipo: "AL" } });
    }

    const verba = await prisma.verba.create({
      data: { dsVerba: "Verba MTur", cdOfertante: CNPJ_GO, vlVerba: 100000 },
    });
    const curso = await prisma.preCurso.create({
      data: { cdOfertante: CNPJ_GO, cdVerba: verba.cdVerba, vlCursoAlocado: 1000, criadoPor: CNPJ_GO },
    });
    cdCurso = curso.cdCurso;

    // Pré-curso Q10 com os 4 textos antigos e um já no texto novo; "Eventos"
    // também numa chave que não é Q10, que não pode ser tocada.
    await prisma.respostaPreCurso.createMany({
      data: [
        ...linhas({
          qualifCaracteristicas: [
            "Alojamento (recepcionista / camareiro(a) / copeiro(a) / outros)",
            "Serviços de Alimentação (bartender / auxiliar de cozinha / outros)",
            "Cultura e Lazer (produtor(a) / recreacionista / artesã(o) / outros)",
            "Eventos",
            "Turismo de Base Comunitária",
          ],
          qualifNomeCurso: "Eventos",
          // Texto livre que coincide com um texto antigo longo de Q10.
          qualifCaracteristicasOutra: "Cultura e Lazer (produtor(a) / recreacionista / artesã(o) / outros)",
        }),
      ].map((linha) => ({ cdCurso, ...linha })),
    });

    // Dado pessoal: "Negro" também numa chave que não é Q8.
    await semearDadosPessoais(CPF_NEGRO_FISICA, {
      avalPessoalRacaEtnia: "Negro",
      avalPessoalCondicaoPcd: PCD_FISICA,
      avalPessoalMunicipio: "Negro",
    });
    // Texto livre de município que coincide com um texto antigo de PCD.
    await semearDadosPessoais(CPF_PARDO_AUDITIVA, {
      avalPessoalRacaEtnia: "Pardo",
      avalPessoalCondicaoPcd: "Sim, tenho deficiência auditiva.",
      avalPessoalMunicipio: "Sim, tenho deficiência auditiva.",
    });
    await semearDadosPessoais(CPF_PRETO_VISUAL, {
      avalPessoalRacaEtnia: "Preto",
      avalPessoalCondicaoPcd: "Sim, tenho deficiência visual.",
    });
    await semearDadosPessoais(CPF_BRANCO_INTELECTUAL, {
      avalPessoalRacaEtnia: "Branco",
      avalPessoalCondicaoPcd: "Sim, tenho deficiência intelectual/mental.",
    });
    await semearDadosPessoais(CPF_SEM_PCD, {
      avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
    });

    // Parte 1 restante completa (Q15 = "Não"), só travada por Situação
    // Profissional, que tinha ficado em branco.
    await semearAvaliacao(
      CPF_NEGRO_FISICA,
      { ...PARTE_1_SEM_Q16, ...RESPOSTAS_REMOVIDAS, avalGeralNota: 9 },
      { parte1Completa: false },
    );
    // Q15 = "Sim" sem Q16: continua incompleta.
    await semearAvaliacao(
      CPF_PARDO_AUDITIVA,
      { ...PARTE_1_SEM_Q16, avalExperienciaCursoAnterior: "Sim" },
      { parte1Completa: false },
    );
    // Falta uma das 7 sempre-obrigatórias: continua incompleta.
    const { avalExpectRenda: _omitida, ...semRenda } = PARTE_1_SEM_Q16;
    await semearAvaliacao(CPF_PRETO_VISUAL, semRenda, { parte1Completa: false });
    // Q15 = "Sim" com Q16: completa.
    await semearAvaliacao(
      CPF_BRANCO_INTELECTUAL,
      {
        ...PARTE_1_SEM_Q16,
        avalExperienciaCursoAnterior: "Sim",
        avalExperienciaTipoCursoAnterior: "Técnico",
      },
      { parte1Completa: false },
    );
    // Avaliação encerrada também perde as chaves removidas.
    await semearAvaliacao(
      CPF_SEM_PCD,
      { ...PARTE_1_SEM_Q16, ...RESPOSTAS_REMOVIDAS },
      { status: "ENCERRADO", parte1Completa: true },
    );

    await rodarMigration();
  });

  afterAll(async () => {
    await limpar();
    await prisma.$disconnect();
  });

  // MTUR-13: os 4 textos antigos de Q10 viram os novos, na mesma posição.
  it("troca os textos antigos de qualifCaracteristicas sem alterar a Ordem", async () => {
    const q10 = await prisma.respostaPreCurso.findMany({
      where: { cdCurso, chave: "qualifCaracteristicas" },
      orderBy: { ordem: "asc" },
      select: { ordem: true, valor: true },
    });

    expect(q10).toEqual([
      { ordem: 0, valor: "Hospedagem (recepcionista / camareiro(a) / copeiro(a))" },
      { ordem: 1, valor: "Serviços de Alimentação (bartender / auxiliar de cozinha)" },
      { ordem: 2, valor: "Cultura e Lazer (produtor(a) / recreacionista / artesã(o))" },
      { ordem: 3, valor: "Eventos (cerimonialista / organizador(a) de eventos)" },
      { ordem: 4, valor: "Turismo de Base Comunitária" },
    ]);
  });

  // MTUR-17: o mesmo texto noutra chave do pré-curso fica intacto.
  it("não toca os textos antigos fora de qualifCaracteristicas", async () => {
    const nome = await prisma.respostaPreCurso.findFirst({
      where: { cdCurso, chave: "qualifNomeCurso" },
    });
    const outra = await prisma.respostaPreCurso.findFirst({
      where: { cdCurso, chave: "qualifCaracteristicasOutra" },
    });

    expect(nome?.valor).toBe("Eventos");
    expect(outra?.valor).toBe("Cultura e Lazer (produtor(a) / recreacionista / artesã(o) / outros)");
  });

  // MTUR-14: Q8 "Negro" vira "Preto".
  it("troca Negro por Preto em avalPessoalRacaEtnia", async () => {
    expect(await dadoPessoal(CPF_NEGRO_FISICA, "avalPessoalRacaEtnia")).toBe("Preto");
  });

  // MTUR-17: as outras raças, o "Preto" já gravado e "Negro" noutra chave
  // ficam intactos.
  it("deixa intactas as outras raças e o texto Negro fora de Q8", async () => {
    expect(await dadoPessoal(CPF_PARDO_AUDITIVA, "avalPessoalRacaEtnia")).toBe("Pardo");
    expect(await dadoPessoal(CPF_PRETO_VISUAL, "avalPessoalRacaEtnia")).toBe("Preto");
    expect(await dadoPessoal(CPF_BRANCO_INTELECTUAL, "avalPessoalRacaEtnia")).toBe("Branco");
    expect(await dadoPessoal(CPF_NEGRO_FISICA, "avalPessoalMunicipio")).toBe("Negro");
    expect(await dadoPessoal(CPF_PARDO_AUDITIVA, "avalPessoalMunicipio")).toBe(
      "Sim, tenho deficiência auditiva.",
    );
  });

  // MTUR-14: os 4 tipos de deficiência colapsam em "Sim.".
  it.each([CPF_NEGRO_FISICA, CPF_PARDO_AUDITIVA, CPF_PRETO_VISUAL, CPF_BRANCO_INTELECTUAL])(
    "troca o tipo de deficiência por Sim. (CPF %s)",
    async (cpf) => {
      expect(await dadoPessoal(cpf, "avalPessoalCondicaoPcd")).toBe("Sim.");
    },
  );

  it("deixa intacto 'Não sou uma Pessoa com Deficiência.'", async () => {
    expect(await dadoPessoal(CPF_SEM_PCD, "avalPessoalCondicaoPcd")).toBe(
      "Não sou uma Pessoa com Deficiência.",
    );
  });

  // MTUR-15: as 11 chaves somem e as outras ficam, inclusive numa avaliação
  // encerrada.
  it("remove as 11 chaves e mantém as demais, em andamento e encerrada", async () => {
    const restantes = [...Object.keys(PARTE_1_SEM_Q16)].sort();

    expect(await chavesDaAvaliacao(CPF_NEGRO_FISICA)).toEqual(
      [...restantes, "avalGeralNota"].sort(),
    );
    expect(await chavesDaAvaliacao(CPF_SEM_PCD)).toEqual(restantes);
    expect(
      await prisma.respostaAvaliacao.count({ where: { cdCurso, chave: { in: CHAVES_REMOVIDAS } } }),
    ).toBe(0);
  });

  // MTUR-15: a ordem da múltipla escolha que sobrou não muda.
  it("preserva a ordem das opções da múltipla escolha que ficou", async () => {
    const motivos = await prisma.respostaAvaliacao.findMany({
      where: { cpf: CPF_NEGRO_FISICA, cdCurso, chave: "avalMotivMotivosParticipacao" },
      orderBy: { ordem: "asc" },
      select: { ordem: true, valor: true },
    });

    expect(motivos).toEqual([
      { ordem: 0, valor: "Conseguir um emprego/trabalho" },
      { ordem: 1, valor: "Abrir o meu próprio negócio" },
    ]);
  });

  // MTUR-16: Parte 1 recalculada pela regra de MTUR-10, só de false para true.
  it("marca Parte1_Completa onde as 7 chaves estão respondidas e Q16 não falta", async () => {
    expect(await parte1Completa(CPF_NEGRO_FISICA)).toBe(true);
    expect(await parte1Completa(CPF_BRANCO_INTELECTUAL)).toBe(true);
  });

  it("não marca Parte1_Completa quando falta Q16 com Q15='Sim' ou uma das 7", async () => {
    expect(await parte1Completa(CPF_PARDO_AUDITIVA)).toBe(false);
    expect(await parte1Completa(CPF_PRETO_VISUAL)).toBe(false);
  });

  it("mantém Parte1_Completa e o status da avaliação encerrada", async () => {
    const avaliacao = await prisma.avaliacaoAluno.findUnique({
      where: { cpf_cdCurso: { cpf: CPF_SEM_PCD, cdCurso } },
    });

    expect(avaliacao?.parte1Completa).toBe(true);
    expect(avaliacao?.status).toBe("ENCERRADO");
  });

  // MTUR-17: rodar de novo não muda nada.
  it("é idempotente: uma segunda execução deixa o mesmo estado", async () => {
    const antes = {
      pre: await prisma.respostaPreCurso.findMany({ where: { cdCurso }, orderBy: { id: "asc" } }),
      pessoais: await prisma.dadoPessoalAluno.findMany({
        where: { cpf: { in: CPFS_ALUNOS } },
        orderBy: { id: "asc" },
      }),
      avaliacoes: await prisma.avaliacaoAluno.findMany({
        where: { cdCurso },
        orderBy: { cpf: "asc" },
      }),
      respostas: await prisma.respostaAvaliacao.findMany({
        where: { cdCurso },
        orderBy: { id: "asc" },
      }),
    };

    await rodarMigration();

    expect({
      pre: await prisma.respostaPreCurso.findMany({ where: { cdCurso }, orderBy: { id: "asc" } }),
      pessoais: await prisma.dadoPessoalAluno.findMany({
        where: { cpf: { in: CPFS_ALUNOS } },
        orderBy: { id: "asc" },
      }),
      avaliacoes: await prisma.avaliacaoAluno.findMany({
        where: { cdCurso },
        orderBy: { cpf: "asc" },
      }),
      respostas: await prisma.respostaAvaliacao.findMany({
        where: { cdCurso },
        orderBy: { id: "asc" },
      }),
    }).toEqual(antes);
  });
});
