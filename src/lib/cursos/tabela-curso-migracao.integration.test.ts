// Teste de integração da migration `tabela_curso` (CUR-14 a CUR-18, AD-052).
//
// Roda a migration do jeito que a produção roda: `prisma migrate deploy`.
// Cada cenário recria um banco descartável, aplica as migrations anteriores,
// semeia cursos no formato antigo (dados do curso em TB_Pre_Curso) por SQL e
// aplica a migration nova. O `spma_test` dos outros testes não é tocado.
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

const BANCO = "spma_migracao_curso";
const NOVA = "_tabela_curso";
const RAIZ = path.resolve(process.cwd(), "prisma/migrations");

const CNPJ_GO = "11222333000181";
const CNPJ_GO_2 = "11444777000161";
const CPF_AM = "52998224725";
const CPF_ALUNO = "39053344705";

const urlDoBanco = () => {
  const url = new URL(process.env.DATABASE_URL as string);
  url.pathname = `/${BANCO}`;
  return url.toString();
};

const pastas = readdirSync(RAIZ)
  .filter((nome) => /^\d+_/.test(nome))
  .sort();
const nova = pastas.find((nome) => nome.endsWith(NOVA));
const anteriores = pastas.slice(0, pastas.indexOf(nova!));

let banco: PrismaClient | undefined;
let temporario: string | undefined;

/**
 * `prisma migrate deploy` no banco descartável, com as pastas informadas.
 * `alterar` troca o texto do migration.sql da migration nova, para provar que
 * a conferência pega um backfill errado.
 */
async function deploy(
  migrations: string[],
  alterar?: (sql: string) => string,
): Promise<{ ok: boolean; saida: string }> {
  const destino = path.join(temporario!, "migrations");
  for (const pasta of migrations) {
    cpSync(path.join(RAIZ, pasta), path.join(destino, pasta), { recursive: true });
  }
  cpSync(path.join(RAIZ, "migration_lock.toml"), path.join(destino, "migration_lock.toml"));
  if (alterar) {
    const arquivo = path.join(destino, nova!, "migration.sql");
    writeFileSync(arquivo, alterar(readFileSync(arquivo, "utf8")));
  }

  const config = path.join(temporario!, "prisma.config.ts");
  const opcoes = {
    schema: path.resolve(process.cwd(), "prisma/schema.prisma"),
    migrations: { path: destino },
    datasource: { url: urlDoBanco() },
  };
  writeFileSync(config, `export default ${JSON.stringify(opcoes)};\n`);

  return new Promise((resolve) => {
    const processo = spawn(`npx prisma migrate deploy --config "${config}"`, {
      shell: true,
      env: { ...process.env, DATABASE_URL: urlDoBanco() },
    });
    let saida = "";
    processo.stdout.on("data", (parte) => (saida += parte));
    processo.stderr.on("data", (parte) => (saida += parte));
    processo.on("close", (codigo) => resolve({ ok: codigo === 0, saida }));
  });
}

async function rodarMigration(alterar?: (sql: string) => string): Promise<void> {
  const { ok, saida } = await deploy([nova!], alterar);
  if (!ok) throw new Error(saida);
}

async function consultar<T = Record<string, unknown>>(sql: string, ...parametros: unknown[]) {
  return banco!.$queryRawUnsafe<T[]>(sql, ...parametros);
}

/** Aplica o reversao.sql comando a comando, como o cliente mysql sem --force. */
async function reverter(): Promise<void> {
  const sql = readFileSync(path.join(RAIZ, nova!, "reversao.sql"), "utf8")
    .split("\n")
    .filter((linha) => !linha.startsWith("--"))
    .join("\n");
  // Uma conexão só, como o cliente mysql: a trava é uma tabela temporária,
  // que só existe na sessão que a criou.
  await banco!.$transaction(async (tx) => {
    for (const comando of sql.split(";").map((parte) => parte.trim()).filter(Boolean)) {
      await tx.$executeRawUnsafe(comando);
    }
  });
}

const colunas = async (tabela: string) =>
  (
    await consultar<{ nome: string }>(
      `SELECT COLUMN_NAME AS nome FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      tabela,
    )
  ).map((linha) => linha.nome);

const tabelas = async () =>
  (
    await consultar<{ nome: string }>(
      "SELECT TABLE_NAME AS nome FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
    )
  ).map((linha) => linha.nome);

const DATA_A = new Date("2026-09-01T10:00:00.123Z");
const DATA_B = new Date("2026-09-15T16:30:00.000Z");
const DATA_C = new Date("2026-10-02T08:05:00.500Z");

type CursoAntigo = { ofertante: string; valor: string; criador: string; data: Date; status: string };

/**
 * Banco no estado imediatamente anterior à migration: três cursos de dois
 * ofertantes, com verbas, valores, criadores e datas diferentes, dois
 * pós-cursos e uma avaliação.
 */
async function prepararBancoAntigo(): Promise<number[]> {
  await banco?.$disconnect();
  banco = undefined;
  await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${BANCO}\``);
  await prisma.$executeRawUnsafe(`CREATE DATABASE \`${BANCO}\``);
  if (temporario) rmSync(temporario, { recursive: true, force: true });
  temporario = mkdtempSync(path.join(os.tmpdir(), "spma-migracao-curso-"));

  const anterior = await deploy(anteriores);
  if (!anterior.ok) throw new Error(anterior.saida);
  banco = new PrismaClient({ adapter: new PrismaMariaDb(urlDoBanco()) });

  for (const [documento, tipo] of [
    [CNPJ_GO, "GO"],
    [CNPJ_GO_2, "GO"],
    [CPF_AM, "AM"],
    [CPF_ALUNO, "AL"],
  ]) {
    await banco.$executeRawUnsafe(
      "INSERT INTO TB_Usuario (Documento_Usuario, NM_Usuario, TP_Usuario) VALUES (?, ?, ?)",
      documento,
      `${tipo} migração curso`,
      tipo,
    );
  }
  const verba = async (ofertante: string) => {
    await banco!.$executeRawUnsafe(
      "INSERT INTO TB_Verba (CD_Ofertante, DS_Verba, VL_Verba) VALUES (?, 'Verba', 100000)",
      ofertante,
    );
    return Number((await consultar<{ cd: number }>("SELECT MAX(CD_Verba) AS cd FROM TB_Verba"))[0].cd);
  };
  const verbaA = await verba(CNPJ_GO);
  const verbaB = await verba(CNPJ_GO_2);

  const curso = async (ofertante: string, cdVerba: number, c: Omit<CursoAntigo, "ofertante">) => {
    await banco!.$executeRawUnsafe(
      `INSERT INTO TB_Pre_Curso (CD_Ofertante, CD_Verba, VL_Curso_Alocado, Status, Criado_Por, Data_Criacao, Data_Encerramento, P8, P11)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ofertante,
      cdVerba,
      c.valor,
      c.status,
      c.criador,
      c.data,
      c.status === "ENCERRADO" ? DATA_C : null,
      `Curso de ${c.valor}`,
      "b",
    );
    return Number((await consultar<{ cd: number }>("SELECT MAX(CD_Curso) AS cd FROM TB_Pre_Curso"))[0].cd);
  };
  const cursos = [
    await curso(CNPJ_GO, verbaA, { valor: "1500.50", criador: CNPJ_GO, data: DATA_A, status: "ENCERRADO" }),
    await curso(CNPJ_GO, verbaA, { valor: "200.00", criador: CPF_AM, data: DATA_B, status: "EM_ANDAMENTO" }),
    await curso(CNPJ_GO_2, verbaB, { valor: "999.99", criador: CNPJ_GO_2, data: DATA_C, status: "EM_ANDAMENTO" }),
  ];

  // O pós do primeiro curso tem um criador diferente do pré: só dado antigo
  // (da rota de pós-curso já removida) pode ter isso, e ele é descartado.
  await banco.$executeRawUnsafe(
    "INSERT INTO TB_Pos_Curso (CD_Curso, Status, Criado_Por, Data_Ultima_Atualizacao, P5) VALUES (?, 'EM_ANDAMENTO', ?, NOW(3), 'c')",
    cursos[0],
    CPF_AM,
  );
  await banco.$executeRawUnsafe(
    "INSERT INTO TB_Pos_Curso (CD_Curso, Status, Criado_Por, Data_Ultima_Atualizacao) VALUES (?, 'EM_ANDAMENTO', ?, NOW(3))",
    cursos[2],
    CNPJ_GO_2,
  );
  await banco.$executeRawUnsafe(
    "INSERT INTO TB_Avaliacao_Aluno (CPF, CD_Curso, Status, P35) VALUES (?, ?, 'EM_ANDAMENTO', 8)",
    CPF_ALUNO,
    cursos[0],
  );

  return cursos;
}

// Cada cenário faz dois `prisma migrate deploy` num banco novo.
const PREPARO_MS = 180_000;

describe("migration tabela_curso (integration)", { timeout: PREPARO_MS }, () => {
  afterAll(async () => {
    await banco?.$disconnect();
    if (temporario) rmSync(temporario, { recursive: true, force: true });
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${BANCO}\``);
    await prisma.$disconnect();
  });

  describe("com cursos válidos", () => {
    let cursos: number[];
    let etapasAntes: { pre: unknown[]; pos: unknown[]; avaliacao: unknown[] };

    beforeAll(async () => {
      cursos = await prepararBancoAntigo();
      etapasAntes = {
        pre: await consultar("SELECT CD_Curso, Status, Data_Encerramento, P8, P11 FROM TB_Pre_Curso ORDER BY CD_Curso"),
        pos: await consultar(
          "SELECT CD_Curso, Status, Data_Ultima_Atualizacao, Data_Encerramento, P5 FROM TB_Pos_Curso ORDER BY CD_Curso",
        ),
        avaliacao: await consultar("SELECT CPF, CD_Curso, Status, P35 FROM TB_Avaliacao_Aluno"),
      };
      await rodarMigration();
    }, PREPARO_MS);

    // CUR-14: um curso por pré-curso, com os valores do pré-curso de origem.
    it("cria um curso por pré-curso com o mesmo código, ofertante, verba, valor, criador e data", async () => {
      const linhas = await consultar(
        "SELECT CD_Curso, CD_Ofertante, VL_Curso_Alocado, Criado_Por, Data_Criacao FROM TB_Curso ORDER BY CD_Curso",
      );

      expect(linhas.map((linha) => ({ ...linha, VL_Curso_Alocado: Number(linha.VL_Curso_Alocado) }))).toEqual([
        { CD_Curso: cursos[0], CD_Ofertante: CNPJ_GO, VL_Curso_Alocado: 1500.5, Criado_Por: CNPJ_GO, Data_Criacao: DATA_A },
        { CD_Curso: cursos[1], CD_Ofertante: CNPJ_GO, VL_Curso_Alocado: 200, Criado_Por: CPF_AM, Data_Criacao: DATA_B },
        { CD_Curso: cursos[2], CD_Ofertante: CNPJ_GO_2, VL_Curso_Alocado: 999.99, Criado_Por: CNPJ_GO_2, Data_Criacao: DATA_C },
      ]);
    });

    // CUR-14: cada curso continua na verba do pré-curso de origem.
    it("mantém cada curso na verba de origem", async () => {
      const linhas = await consultar<{ CD_Ofertante: string; CD_Verba: number }>(
        "SELECT c.CD_Ofertante, c.CD_Verba FROM TB_Curso c JOIN TB_Verba v ON v.CD_Verba = c.CD_Verba ORDER BY c.CD_Curso",
      );
      const verbaDe = async (ofertante: string) =>
        Number((await consultar<{ cd: number }>("SELECT CD_Verba AS cd FROM TB_Verba WHERE CD_Ofertante = ?", ofertante))[0].cd);

      expect(linhas.map((linha) => Number(linha.CD_Verba))).toEqual([
        await verbaDe(CNPJ_GO),
        await verbaDe(CNPJ_GO),
        await verbaDe(CNPJ_GO_2),
      ]);
    });

    // CUR-15: o próximo código gerado vem depois de todos os migrados.
    it("gera para um curso novo um código maior que todos os migrados", async () => {
      await banco!.$executeRawUnsafe(
        "INSERT INTO TB_Curso (CD_Ofertante, CD_Verba, VL_Curso_Alocado, Criado_Por) SELECT ?, CD_Verba, 1, ? FROM TB_Verba LIMIT 1",
        CNPJ_GO,
        CNPJ_GO,
      );
      const [{ cd }] = await consultar<{ cd: number }>("SELECT MAX(CD_Curso) AS cd FROM TB_Curso");

      expect(Number(cd)).toBeGreaterThan(Math.max(...cursos));
      await banco!.$executeRawUnsafe("DELETE FROM TB_Curso WHERE CD_Curso = ?", cd);
    });

    // CUR-18: status, encerramento e respostas das três etapas não mudam.
    it("mantém status, datas e respostas do pré, do pós e da avaliação", async () => {
      expect(await consultar("SELECT CD_Curso, Status, Data_Encerramento, P8, P11 FROM TB_Pre_Curso ORDER BY CD_Curso")).toEqual(
        etapasAntes.pre,
      );
      expect(
        await consultar("SELECT CD_Curso, Status, Data_Ultima_Atualizacao, Data_Encerramento, P5 FROM TB_Pos_Curso ORDER BY CD_Curso"),
      ).toEqual(etapasAntes.pos);
      expect(await consultar("SELECT CPF, CD_Curso, Status, P35 FROM TB_Avaliacao_Aluno")).toEqual(etapasAntes.avaliacao);
    });

    // CUR-01 e CUR-03: as colunas do curso vivem só em TB_Curso.
    it("deixa os dados do curso só em TB_Curso", async () => {
      expect(await colunas("TB_Curso")).toEqual([
        "CD_Curso",
        "CD_Ofertante",
        "CD_Verba",
        "VL_Curso_Alocado",
        "Data_Criacao",
        "Criado_Por",
      ]);
      for (const coluna of ["CD_Ofertante", "CD_Verba", "VL_Curso_Alocado", "Criado_Por", "Data_Criacao"]) {
        expect(await colunas("TB_Pre_Curso")).not.toContain(coluna);
      }
      for (const coluna of ["Criado_Por", "Data_Criacao"]) {
        expect(await colunas("TB_Pos_Curso")).not.toContain(coluna);
      }
      // CUR-04: o que é da etapa fica na etapa.
      expect(await colunas("TB_Pre_Curso")).toEqual(expect.arrayContaining(["Status", "Data_Encerramento"]));
      expect(await colunas("TB_Pos_Curso")).toEqual(
        expect.arrayContaining(["Status", "Data_Encerramento", "Data_Ultima_Atualizacao"]),
      );
      expect(await tabelas()).not.toContain("_Conferencia_Tabela_Curso");
    });

    // CUR-02: pré, pós e avaliação apontam para TB_Curso; cascata no pré e no
    // pós, recusa na avaliação (CUR-07, CUR-08).
    it("liga pré, pós e avaliação a TB_Curso por chave estrangeira", async () => {
      expect(
        await consultar(
          `SELECT TABLE_NAME AS tabela, REFERENCED_TABLE_NAME AS referencia, DELETE_RULE AS aoApagar
           FROM information_schema.REFERENTIAL_CONSTRAINTS
           WHERE CONSTRAINT_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'TB_Curso' ORDER BY TABLE_NAME`,
        ),
      ).toEqual([
        { tabela: "TB_Avaliacao_Aluno", referencia: "TB_Curso", aoApagar: "RESTRICT" },
        { tabela: "TB_Pos_Curso", referencia: "TB_Curso", aoApagar: "CASCADE" },
        { tabela: "TB_Pre_Curso", referencia: "TB_Curso", aoApagar: "CASCADE" },
      ]);
    });

    // CUR-23: depois de uma migration concluída, a reversão para na trava.
    it("recusa a reversão depois que a migration terminou, sem apagar nada", async () => {
      await expect(reverter()).rejects.toThrow(/contract_ja_comecou/);
      expect(await tabelas()).toContain("TB_Curso");
    });
  });

  // CUR-16, CUR-17 e CUR-23: cada ramo da conferência aborta antes do
  // contract, e a reversão desfaz a tentativa. Um banco antigo só; cada
  // tentativa abortada é desfeita pelo reversao.sql antes da seguinte.
  describe("conferência", () => {
    // A linha do backfill que copia os campos do pré-curso para TB_Curso.
    const COPIA = "SELECT `CD_Curso`, `CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Data_Criacao`, `Criado_Por`";
    const FIM_DA_COPIA = "FROM `TB_Pre_Curso`;";

    const trocar = (de: string, para: string) => (sql: string) => {
      if (!sql.includes(de)) throw new Error(`trecho não encontrado na migration: ${de}`);
      return sql.replace(de, para);
    };

    let colunasAntes: { pre: string[]; pos: string[] };

    /** Desfaz a tentativa abortada e libera a migration para um novo deploy. */
    async function desfazer() {
      await reverter();
      await banco!.$executeRawUnsafe("DELETE FROM _prisma_migrations WHERE migration_name = ?", nova);
    }

    beforeAll(async () => {
      await prepararBancoAntigo();
      colunasAntes = { pre: await colunas("TB_Pre_Curso"), pos: await colunas("TB_Pos_Curso") };
    }, PREPARO_MS);

    // CUR-16: cada coluna copiada é comparada com o pré-curso de origem. No
    // curso 2 o criador (AM) difere do ofertante, então trocar um pelo outro
    // diverge pelo menos ali.
    it.each([
      ["o valor alocado", "`VL_Curso_Alocado`,", "`VL_Curso_Alocado` + 1,"],
      ["o ofertante", "`CD_Curso`, `CD_Ofertante`,", "`CD_Curso`, `Criado_Por`,"],
      ["a verba", "`CD_Verba`, `VL_Curso_Alocado`, `Data_Criacao`", "`CD_Verba` + 1, `VL_Curso_Alocado`, `Data_Criacao`"],
      ["a data de criação", "`Data_Criacao`, `Criado_Por`", "DATE_ADD(`Data_Criacao`, INTERVAL 1 SECOND), `Criado_Por`"],
      ["o criador", "`Data_Criacao`, `Criado_Por`", "`Data_Criacao`, `CD_Ofertante`"],
    ])("aborta com cursos_divergentes quando %s migrado difere do pré-curso", async (_campo, de, para) => {
      await expect(rodarMigration(trocar(COPIA, COPIA.replace(de, para)))).rejects.toThrow(/cursos_divergentes/);

      expect(await colunas("TB_Pre_Curso")).toEqual(colunasAntes.pre);
      expect(await colunas("TB_Pos_Curso")).toEqual(colunasAntes.pos);
      await desfazer();
    });

    // CUR-16: um curso a mais do que pré-cursos também diverge - só a
    // contagem pega esse caso, porque todo pré-curso tem o seu curso certo.
    it("aborta com cursos_divergentes quando a contagem de cursos não bate", async () => {
      const extra =
        "FROM `TB_Pre_Curso` UNION ALL " +
        COPIA.replace("`CD_Curso`,", "99999,") +
        " FROM `TB_Pre_Curso` WHERE `CD_Curso` = (SELECT MIN(`CD_Curso`) FROM `TB_Pre_Curso`);";

      await expect(rodarMigration(trocar(FIM_DA_COPIA, extra))).rejects.toThrow(/cursos_divergentes/);

      expect(await colunas("TB_Pre_Curso")).toEqual(colunasAntes.pre);
      await desfazer();
    });

    // CUR-17: pós-curso e avaliação sem curso, cada um por si.
    it.each([
      ["um pós-curso", "INSERT INTO TB_Pos_Curso (CD_Curso, Status, Criado_Por, Data_Ultima_Atualizacao) VALUES (99999, 'EM_ANDAMENTO', ?, NOW(3))", CNPJ_GO, "DELETE FROM TB_Pos_Curso WHERE CD_Curso = 99999"],
      ["uma avaliação", "INSERT INTO TB_Avaliacao_Aluno (CPF, CD_Curso, Status) VALUES (?, 99999, 'EM_ANDAMENTO')", CPF_ALUNO, "DELETE FROM TB_Avaliacao_Aluno WHERE CD_Curso = 99999"],
    ])("aborta com cursos_orfaos quando %s não tem curso", async (_etapa, inserir, documento, apagar) => {
      // Na mesma conexão: desligar as FKs só vale para a sessão que o fez.
      await banco!.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
        await tx.$executeRawUnsafe(inserir, documento);
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
      });

      await expect(rodarMigration()).rejects.toThrow(/cursos_orfaos/);

      expect(await colunas("TB_Pre_Curso")).toEqual(colunasAntes.pre);
      expect(await colunas("TB_Pos_Curso")).toEqual(colunasAntes.pos);
      await banco!.$executeRawUnsafe(apagar);
      await desfazer();
    });

    // CUR-23: depois de cada reversão, nada da tentativa sobra.
    it("a reversão não deixa TB_Curso nem a tabela de conferência", async () => {
      const depois = await tabelas();
      expect(depois).not.toContain("TB_Curso");
      expect(depois).not.toContain("_Conferencia_Tabela_Curso");
    });
  });
});
