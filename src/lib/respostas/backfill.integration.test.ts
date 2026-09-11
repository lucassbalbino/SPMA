// Teste de integração da migration de backfill (RESP-13, RESP-14, RESP-15,
// RESP-16), contra o banco real `spma_test`.
//
// O teste roda o SQL da própria migration - lido do arquivo que
// `prisma migrate deploy` executa -, não uma reimplementação dele: o que
// está sendo provado é o artefato que sobe em produção.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { lerRespostas } from "./repositorio";

const CPF_GO = "31128484008";
const CPF_ALUNO = "16256024022";

// Escalar de texto, escalar numérico, lista de 3 opções (ordem importa) e
// uma chave que o schema Zod atual não conhece (RESP-14).
const JSON_PRE_CURSO = {
  identifMunicipio: "Manaus",
  planejCargaHoraria: 40,
  publicoPerfil: ["Jovens", "Mulheres", "Idosos"],
  chaveDeQuestionarioAntigo: "resquício de troca de questionário",
};

const JSON_POS_CURSO = {
  posExecCargaHorariaRealizada: 38,
  posContEstrategias: ["Não foi adotada nenhuma estratégia de continuidade e ampliação."],
};

const JSON_AVALIACAO = {
  avalPessoalGenero: "Feminino",
  avalGeralNota: 9,
  avalMotivMotivosParticipacao: [
    "Abrir o meu próprio negócio",
    "Conseguir um emprego/trabalho",
  ],
};

let cdOfertante: number;
let cdCursoComRespostas: number;
let cdCursoSemRespostas: number;

function sqlDaMigration(): string[] {
  const raiz = path.resolve(process.cwd(), "prisma/migrations");
  const pasta = readdirSync(raiz).find((nome) => nome.endsWith("_backfill_respostas"));

  if (!pasta) {
    throw new Error("Migration de backfill não encontrada em prisma/migrations");
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

const TABELAS_COM_JSON = ["TB_Pre_Curso", "TB_Pos_Curso", "TB_Avaliacao_Aluno"] as const;

/** Tabelas que TINHAM a coluna quando o teste começou - ver `restaurarColunaJson`. */
const tinhamColunaAoIniciar = new Set<string>();

async function colunaExiste(tabela: string): Promise<boolean> {
  const linhas = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'Respostas'`,
    tabela,
  );

  return Number(linhas[0]?.n ?? 0) > 0;
}

/**
 * Recria a coluna `Respostas` que a migration `remover_coluna_respostas`
 * dropou. Sem isso não há como montar o estado PRÉ-migração, e sem esse
 * estado não há o que a migration de backfill converta - o teste perderia
 * justamente a evidência de RESP-13/14/16.
 */
async function recriarColunaJson(): Promise<void> {
  tinhamColunaAoIniciar.clear();

  for (const tabela of TABELAS_COM_JSON) {
    if (await colunaExiste(tabela)) {
      tinhamColunaAoIniciar.add(tabela);
      continue;
    }
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${tabela}\` ADD COLUMN \`Respostas\` JSON NULL`);
  }
}

/**
 * Devolve o schema ao estado exato que este teste encontrou - nunca a um
 * estado "que deveria ser".
 *
 * Isto já quebrou uma vez: uma versão anterior dropava a coluna sempre, e
 * quando o teste rodava num banco onde `remover_coluna_respostas` ainda NÃO
 * tinha sido aplicada, o `migrate deploy` seguinte tentava dropar uma coluna
 * que já não existia, falhava, e o banco ficava travado em P3009.
 */
async function restaurarColunaJson(): Promise<void> {
  for (const tabela of TABELAS_COM_JSON) {
    if (tinhamColunaAoIniciar.has(tabela)) continue;

    await prisma
      .$executeRawUnsafe(`ALTER TABLE \`${tabela}\` DROP COLUMN \`Respostas\``)
      .catch(() => undefined);
  }
}

/** Grava o JSON por SQL cru: a coluna não existe mais no client do Prisma. */
async function semearJson(
  tabela: (typeof TABELAS_COM_JSON)[number],
  onde: string,
  valores: unknown[],
  json: unknown,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE \`${tabela}\` SET \`Respostas\` = ? WHERE ${onde}`,
    JSON.stringify(json),
    ...valores,
  );
}

describe("migration de backfill das respostas (integration)", () => {
  beforeAll(async () => {
    await recriarColunaJson();

    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
    await prisma.usuario.deleteMany({ where: { cpf: { in: [CPF_GO, CPF_ALUNO] } } });

    const ofertante = await prisma.ofertante.create({
      data: { nome: "Ofertante Backfill Teste", uf: "AM" },
    });
    cdOfertante = ofertante.cdOfertante;

    await prisma.usuario.create({
      data: { cpf: CPF_GO, nome: "GO Backfill", tipo: "GO", cdOfertante },
    });
    await prisma.usuario.create({
      data: { cpf: CPF_ALUNO, nome: "Aluno Backfill", tipo: "AL" },
    });

    const verba = await prisma.verba.create({
      data: { cdOfertante, vlVerba: 100000 },
    });

    const comRespostas = await prisma.preCurso.create({
      data: {
        cdOfertante,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 1000,
        criadoPor: CPF_GO,
      },
    });
    cdCursoComRespostas = comRespostas.cdCurso;

    // RESP-16: registro com `Respostas` nulo não pode gerar linha nem quebrar.
    // Este fica sem `semearJson`, então a coluna segue nula.
    const semRespostas = await prisma.preCurso.create({
      data: {
        cdOfertante,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 1000,
        criadoPor: CPF_GO,
        status: "ENCERRADO",
        dataEncerramento: new Date("2026-01-15T12:00:00Z"),
      },
    });
    cdCursoSemRespostas = semRespostas.cdCurso;

    await prisma.posCurso.create({
      data: { cdCurso: cdCursoComRespostas, criadoPor: CPF_GO },
    });

    await prisma.avaliacaoAluno.create({
      data: { cpf: CPF_ALUNO, cdCurso: cdCursoComRespostas, parte1Completa: true },
    });

    await semearJson("TB_Pre_Curso", "`CD_Curso` = ?", [cdCursoComRespostas], JSON_PRE_CURSO);
    await semearJson("TB_Pos_Curso", "`CD_Curso` = ?", [cdCursoComRespostas], JSON_POS_CURSO);
    await semearJson(
      "TB_Avaliacao_Aluno",
      "`CPF` = ? AND `CD_Curso` = ?",
      [CPF_ALUNO, cdCursoComRespostas],
      JSON_AVALIACAO,
    );

    // Estado de partida: as tabelas novas ainda não têm nenhuma linha destes
    // registros - é o que a migration precisa produzir.
    await prisma.respostaPreCurso.deleteMany({
      where: { cdCurso: { in: [cdCursoComRespostas, cdCursoSemRespostas] } },
    });
    await prisma.respostaPosCurso.deleteMany({ where: { cdCurso: cdCursoComRespostas } });
    await prisma.respostaAvaliacao.deleteMany({ where: { cpf: CPF_ALUNO } });

    for (const comando of sqlDaMigration()) {
      await prisma.$executeRawUnsafe(comando);
    }
  });

  afterAll(async () => {
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
    await prisma.posCurso.deleteMany({ where: { cdCurso: cdCursoComRespostas } });
    await prisma.preCurso.deleteMany({ where: { cdOfertante } });
    await prisma.verba.deleteMany({ where: { cdOfertante } });
    await prisma.usuario.deleteMany({ where: { cpf: { in: [CPF_GO, CPF_ALUNO] } } });
    await prisma.ofertante.deleteMany({ where: { cdOfertante } });
    await restaurarColunaJson();
    await prisma.$disconnect();
  });

  it("a migration de backfill existe como SQL executado por migrate deploy", () => {
    expect(sqlDaMigration().length).toBeGreaterThan(0);
  });

  // RESP-13 + RESP-14: o objeto remontado é igual ao JSON original, inclusive
  // a chave que o schema Zod atual não conhece.
  it("remonta o pré-curso idêntico ao JSON original", async () => {
    expect(
      await lerRespostas(prisma, {
        formulario: "preCurso",
        cdCurso: cdCursoComRespostas,
      }),
    ).toEqual(JSON_PRE_CURSO);
  });

  // RESP-13: a posição de cada opção da múltipla escolha é preservada.
  it("preserva a ordem das opções da múltipla escolha", async () => {
    const linhas = await prisma.respostaPreCurso.findMany({
      where: { cdCurso: cdCursoComRespostas, chave: "publicoPerfil" },
      orderBy: { ordem: "asc" },
      select: { ordem: true, valor: true },
    });

    expect(linhas).toEqual([
      { ordem: 0, valor: "Jovens" },
      { ordem: 1, valor: "Mulheres" },
      { ordem: 2, valor: "Idosos" },
    ]);
  });

  // RESP-14: nenhuma chave é descartada por não estar no schema atual.
  it("migra a chave ausente do schema Zod atual", async () => {
    const linhas = await prisma.respostaPreCurso.findMany({
      where: { cdCurso: cdCursoComRespostas, chave: "chaveDeQuestionarioAntigo" },
      select: { ordem: true, valor: true },
    });

    expect(linhas).toEqual([
      { ordem: 0, valor: "resquício de troca de questionário" },
    ]);
  });

  it("remonta o pós-curso idêntico ao JSON original", async () => {
    expect(
      await lerRespostas(prisma, {
        formulario: "posCurso",
        cdCurso: cdCursoComRespostas,
      }),
    ).toEqual(JSON_POS_CURSO);
  });

  it("remonta a avaliação idêntica ao JSON original", async () => {
    expect(
      await lerRespostas(prisma, {
        formulario: "avaliacao",
        cpf: CPF_ALUNO,
        cdCurso: cdCursoComRespostas,
      }),
    ).toEqual(JSON_AVALIACAO);
  });

  // RESP-16: registro sem respostas não gera linha e não quebra a migration.
  it("não cria nenhuma linha para registro com Respostas nulo", async () => {
    expect(
      await prisma.respostaPreCurso.count({ where: { cdCurso: cdCursoSemRespostas } }),
    ).toBe(0);
  });

  // RESP-15: a migration só escreve nas tabelas novas.
  it("mantém status, dataEncerramento e demais colunas dos três formulários", async () => {
    const preCursoComRespostas = await prisma.preCurso.findUnique({
      where: { cdCurso: cdCursoComRespostas },
    });
    const preCursoSemRespostas = await prisma.preCurso.findUnique({
      where: { cdCurso: cdCursoSemRespostas },
    });
    const posCurso = await prisma.posCurso.findUnique({
      where: { cdCurso: cdCursoComRespostas },
    });
    const avaliacao = await prisma.avaliacaoAluno.findUnique({
      where: { cpf_cdCurso: { cpf: CPF_ALUNO, cdCurso: cdCursoComRespostas } },
    });

    expect(preCursoComRespostas?.status).toBe("EM_ANDAMENTO");
    expect(preCursoComRespostas?.dataEncerramento).toBeNull();
    expect(preCursoComRespostas?.criadoPor).toBe(CPF_GO);

    expect(preCursoSemRespostas?.status).toBe("ENCERRADO");
    expect(preCursoSemRespostas?.dataEncerramento).toEqual(
      new Date("2026-01-15T12:00:00Z"),
    );

    expect(posCurso?.status).toBe("EM_ANDAMENTO");
    expect(posCurso?.criadoPor).toBe(CPF_GO);

    expect(avaliacao?.status).toBe("EM_ANDAMENTO");
    expect(avaliacao?.parte1Completa).toBe(true);
  });

});
