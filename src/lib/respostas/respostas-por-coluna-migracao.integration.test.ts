// Teste de integração da migration `respostas_por_coluna` (COL-17 a COL-24).
//
// Roda a migration do jeito que a produção roda: `prisma migrate deploy`.
// Cada cenário recria um banco descartável e faz dois deploys, apontados por
// um config temporário: o primeiro só com as migrations anteriores, depois a
// semeadura das tabelas antigas `(Chave, Ordem, Valor)` por SQL, e o segundo
// com a migration nova acrescentada - o mesmo passo que a VPS executa
// (AD-047). O `spma_test` dos outros testes não é tocado.
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MAPA, colunasDaEntrada, type Entrada, type Formulario } from "./colunas";
import { lerRespostas } from "./repositorio";

const BANCO = "spma_migracao_colunas";
const NOVA = "_respostas_por_coluna";
const RAIZ = path.resolve(process.cwd(), "prisma/migrations");

const CPF_GO = "31128484008";
const CPF_ALUNO = "16256024022";

const urlDoBanco = () => {
  const url = new URL(process.env.DATABASE_URL as string);
  url.pathname = `/${BANCO}`;
  return url.toString();
};

const pastas = readdirSync(RAIZ)
  .filter((nome) => /^\d+_/.test(nome))
  .sort();
const nova = pastas.find((nome) => nome.endsWith(NOVA));
// O estado antigo é o de antes desta migration, mesmo depois que outras
// entraram na fila depois dela (como a da AD-052).
const anteriores = pastas.slice(0, pastas.indexOf(nova!));

let banco: PrismaClient | undefined;
let temporario: string | undefined;

async function executar(sqls: string[]): Promise<void> {
  for (const sql of sqls) await banco!.$executeRawUnsafe(sql);
}

/**
 * `prisma migrate deploy` no banco descartável, com as pastas de migration
 * informadas. Assíncrono de propósito: um `spawnSync` travado bloqueia o
 * event loop e nem o timeout do vitest consegue interromper o teste.
 */
async function deploy(migrations: string[]): Promise<{ ok: boolean; saida: string }> {
  const destino = path.join(temporario!, "migrations");
  for (const pasta of migrations) {
    cpSync(path.join(RAIZ, pasta), path.join(destino, pasta), { recursive: true });
  }
  cpSync(path.join(RAIZ, "migration_lock.toml"), path.join(destino, "migration_lock.toml"));

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

/** Aplica a migration nova; lança com a saída do Prisma se ela abortar. */
async function rodarMigration(): Promise<void> {
  const { ok, saida } = await deploy([nova!]);
  if (!ok) throw new Error(saida);
}

async function consultar<T = Record<string, unknown>>(sql: string, ...parametros: unknown[]) {
  return banco!.$queryRawUnsafe<T[]>(sql, ...parametros);
}

type Respostas = Record<string, unknown>;

function linhas(respostas: Respostas) {
  return Object.entries(respostas).flatMap(([chave, valor]) =>
    (Array.isArray(valor) ? valor : [valor]).map((item, ordem) => ({ chave, ordem, valor: String(item) })),
  );
}

async function semearLinhas(tabela: string, pai: Record<string, unknown>, respostas: Respostas) {
  const colunasPai = Object.keys(pai);
  const todas = linhas(respostas);
  if (todas.length === 0) return;
  const valores = `(${[...colunasPai.map(() => "?"), "?", "?", "?"].join(", ")})`;
  await banco!.$executeRawUnsafe(
    `INSERT INTO \`${tabela}\` (${colunasPai.map((c) => `\`${c}\``).join(", ")}, \`Chave\`, \`Ordem\`, \`Valor\`)
     VALUES ${todas.map(() => valores).join(", ")}`,
    ...todas.flatMap((linha) => [...Object.values(pai), linha.chave, linha.ordem, linha.valor]),
  );
}

/** Banco no estado imediatamente anterior à migration, com um GO, um Aluno e dois cursos. */
async function prepararBancoAntigo(): Promise<{ cursoComRespostas: number; cursoVazio: number }> {
  // Desconectar ANTES do DROP: conexões abertas do cenário anterior seguram
  // lock de metadados e deixam o DROP DATABASE esperando.
  await banco?.$disconnect();
  banco = undefined;
  await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${BANCO}\``);
  await prisma.$executeRawUnsafe(`CREATE DATABASE \`${BANCO}\``);
  if (temporario) rmSync(temporario, { recursive: true, force: true });
  temporario = mkdtempSync(path.join(os.tmpdir(), "spma-migracao-"));

  const anterior = await deploy(anteriores);
  if (!anterior.ok) throw new Error(anterior.saida);
  banco = new PrismaClient({ adapter: new PrismaMariaDb(urlDoBanco()) });

  await executar([
    `INSERT INTO TB_Usuario (Documento_Usuario, NM_Usuario, TP_Usuario) VALUES ('${CPF_GO}', 'GO', 'GO')`,
    `INSERT INTO TB_Usuario (Documento_Usuario, NM_Usuario, TP_Usuario) VALUES ('${CPF_ALUNO}', 'Aluno', 'AL')`,
    `INSERT INTO TB_Verba (CD_Ofertante, DS_Verba, VL_Verba) VALUES ('${CPF_GO}', 'Verba', 10000)`,
  ]);
  const [{ cdVerba }] = await consultar<{ cdVerba: number }>("SELECT MAX(CD_Verba) AS cdVerba FROM TB_Verba");
  const curso = async (status: string) => {
    await banco!.$executeRawUnsafe(
      `INSERT INTO TB_Pre_Curso (CD_Ofertante, CD_Verba, VL_Curso_Alocado, Status, Criado_Por, Data_Encerramento)
       VALUES (?, ?, 500, ?, ?, ?)`,
      CPF_GO,
      cdVerba,
      status,
      CPF_GO,
      status === "ENCERRADO" ? new Date("2026-10-01T12:00:00.000Z") : null,
    );
    const [{ cd }] = await consultar<{ cd: number }>("SELECT MAX(CD_Curso) AS cd FROM TB_Pre_Curso");
    return Number(cd);
  };
  const cursoComRespostas = await curso("ENCERRADO");
  const cursoVazio = await curso("EM_ANDAMENTO");

  await banco!.$executeRawUnsafe(
    "INSERT INTO TB_Pos_Curso (CD_Curso, Criado_Por, Data_Ultima_Atualizacao) VALUES (?, ?, NOW(3))",
    cursoComRespostas,
    CPF_GO,
  );
  await banco!.$executeRawUnsafe(
    "INSERT INTO TB_Avaliacao_Aluno (CPF, CD_Curso) VALUES (?, ?)",
    CPF_ALUNO,
    cursoComRespostas,
  );

  return { cursoComRespostas, cursoVazio };
}

// Respostas no formato que a API grava (texto das opções), uma de cada tipo.
const PRE_CURSO = {
  identifUf: "BA",
  identifMunicipio: "Salvador",
  qualifModalidade: "À distância (online)",
  qualifCaracteristicas: ["Idiomas", "Outro"],
  qualifCaracteristicasOutra: "Gastronomia regional",
  planejDataInicioPrevista: "2026-11-03",
  planejCargaHoraria: 40,
  planejTaxaEvasaoEsperada: 12.5,
  publicoPerfil: ["Mulheres", "Jovens"],
  infraBasicaRecepcao: 4,
  infraEspecificaDisponibilidade: "Há disponibilidade de todos os equipamentos, em condições satisfatórias",
};
const POS_CURSO = {
  posAcompanhLicaoIndividual: "Não se aplica.",
  posAcompanhMonitoramento: ["Reuniões periódicas com alunos."],
  posFinValorTotal: 15000.5,
};
const AVALIACAO = {
  avalParticipConcluiuCurso: "Não",
  avalParticipMotivoNaoConclusao: ["Dificuldades financeiras", "Outro"],
  avalCursoInfraestruturaSalaAula: 2,
  avalGeralNota: 9,
};
const DADOS_PESSOAIS = {
  avalPessoalEstado: "BA",
  avalPessoalMunicipio: "Salvador",
  avalPessoalGenero: "Feminino",
  avalPessoalEscolaridade: "Pós-graduação completa",
};

async function semearTodos(cursoComRespostas: number, extras: { pre?: Respostas; pessoal?: Respostas } = {}) {
  await semearLinhas("TB_Resposta_Pre_Curso", { CD_Curso: cursoComRespostas }, { ...PRE_CURSO, ...extras.pre });
  await semearLinhas("TB_Resposta_Pos_Curso", { CD_Curso: cursoComRespostas }, POS_CURSO);
  await semearLinhas("TB_Resposta_Avaliacao", { CPF: CPF_ALUNO, CD_Curso: cursoComRespostas }, AVALIACAO);
  await semearLinhas("TB_Dado_Pessoal_Aluno", { CPF: CPF_ALUNO }, { ...DADOS_PESSOAIS, ...extras.pessoal });
}

// Semeadura que passa por todas as opções do mapa (COL-17): na rodada k,
// cada escolha única e cada múltipla recebem a opção k da lista (módulo o
// tamanho dela) e cada escalar um valor próprio da rodada. Uma letra trocada
// no backfill não muda contagem nenhuma, então só a leitura de cada opção a
// denuncia.
const RODADAS = Math.max(
  ...Object.values(MAPA)
    .flat()
    .map((entrada) => ("opcoes" in entrada ? entrada.opcoes.length : 1)),
);

function valorDaRodada(entrada: Entrada, k: number): unknown {
  switch (entrada.tipo) {
    case "unica":
      return entrada.opcoes[k % entrada.opcoes.length];
    case "multipla":
      return [entrada.opcoes[k % entrada.opcoes.length]];
    case "sigla":
      return ["BA", "SP", "AM"][k % 3];
    case "texto":
      return `${entrada.chave} ${k}`;
    case "inteiro":
      return k + 1;
    case "nota":
      return k % 6;
    case "decimal":
      return k + 0.25;
    case "data":
      return new Date(Date.UTC(2026, 0, 1 + k)).toISOString().slice(0, 10);
  }
}

const rodada = (formulario: Formulario, k: number): Respostas =>
  Object.fromEntries(MAPA[formulario].map((entrada) => [entrada.chave, valorDaRodada(entrada, k)]));

const cpfDaRodada = (k: number) => String(50000000000 + k);

/** Um curso, um pós-curso, uma avaliação e um Aluno por rodada. Devolve os cursos. */
async function semearTodasAsOpcoes(): Promise<number[]> {
  const [{ cdVerba }] = await consultar<{ cdVerba: number }>("SELECT MAX(CD_Verba) AS cdVerba FROM TB_Verba");
  const cursosDaRodada: number[] = [];

  for (let k = 0; k < RODADAS; k++) {
    const cpf = cpfDaRodada(k);
    await banco!.$executeRawUnsafe(
      "INSERT INTO TB_Usuario (Documento_Usuario, NM_Usuario, TP_Usuario) VALUES (?, 'Aluno rodada', 'AL')",
      cpf,
    );
    await banco!.$executeRawUnsafe(
      `INSERT INTO TB_Pre_Curso (CD_Ofertante, CD_Verba, VL_Curso_Alocado, Status, Criado_Por)
       VALUES (?, ?, 1, 'EM_ANDAMENTO', ?)`,
      CPF_GO,
      cdVerba,
      CPF_GO,
    );
    const [{ cd }] = await consultar<{ cd: number }>("SELECT MAX(CD_Curso) AS cd FROM TB_Pre_Curso");
    const cdCurso = Number(cd);
    cursosDaRodada.push(cdCurso);
    await banco!.$executeRawUnsafe(
      "INSERT INTO TB_Pos_Curso (CD_Curso, Criado_Por, Data_Ultima_Atualizacao) VALUES (?, ?, NOW(3))",
      cdCurso,
      CPF_GO,
    );
    await banco!.$executeRawUnsafe("INSERT INTO TB_Avaliacao_Aluno (CPF, CD_Curso) VALUES (?, ?)", cpf, cdCurso);

    await semearLinhas("TB_Resposta_Pre_Curso", { CD_Curso: cdCurso }, rodada("preCurso", k));
    await semearLinhas("TB_Resposta_Pos_Curso", { CD_Curso: cdCurso }, rodada("posCurso", k));
    await semearLinhas("TB_Resposta_Avaliacao", { CPF: cpf, CD_Curso: cdCurso }, rodada("avaliacao", k));
    await semearLinhas("TB_Dado_Pessoal_Aluno", { CPF: cpf }, rodada("dadosPessoais", k));
  }

  return cursosDaRodada;
}

const tabelas = async () =>
  (
    await consultar<{ nome: string }>(
      "SELECT TABLE_NAME AS nome FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
    )
  ).map((t) => t.nome);

const bit = (valor: unknown) => (valor === null ? null : Number(valor));

// Cada cenário faz dois `prisma migrate deploy` num banco novo.
const PREPARO_MS = 180_000;

describe("migration respostas_por_coluna (integration)", { timeout: PREPARO_MS }, () => {
  let cursos: { cursoComRespostas: number; cursoVazio: number };

  afterAll(async () => {
    await banco?.$disconnect();
    if (temporario) rmSync(temporario, { recursive: true, force: true });
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${BANCO}\``);
    await prisma.$disconnect();
  });

  it("existe uma única migration respostas_por_coluna", () => {
    expect(pastas.filter((nome) => nome.endsWith(NOVA))).toEqual([nova]);
  });

  describe("com respostas válidas", () => {
    let cursosDaRodada: number[];

    beforeAll(async () => {
      cursos = await prepararBancoAntigo();
      await semearTodos(cursos.cursoComRespostas, {
        pre: { chaveDeQuestionarioAntigo: ["resquício", "de troca"] },
        pessoal: { avalPessoalChaveAntiga: "x" },
      });
      cursosDaRodada = await semearTodasAsOpcoes();
      await rodarMigration();
    }, PREPARO_MS);

    // COL-17: cada opção de cada pergunta, nos quatro formulários, migra para
    // a letra ou a coluna que a API gravaria - lida de volta, cada rodada é
    // exatamente o texto semeado.
    it("migra cada opção de cada pergunta para a coluna e a letra certas", async () => {
      for (const [k, cdCurso] of cursosDaRodada.entries()) {
        const cpf = cpfDaRodada(k);
        expect(await lerRespostas(banco!, { formulario: "preCurso", cdCurso })).toEqual(rodada("preCurso", k));
        expect(await lerRespostas(banco!, { formulario: "posCurso", cdCurso })).toEqual(rodada("posCurso", k));
        expect(await lerRespostas(banco!, { formulario: "avaliacao", cpf, cdCurso })).toEqual(rodada("avaliacao", k));
        expect(await lerRespostas(banco!, { formulario: "dadosPessoais", cpf })).toEqual(rodada("dadosPessoais", k));
      }
    });

    // COL-18: a leitura trata 0 e NULL como "não marcada", então o 0 de cada
    // opção não marcada é conferido na coluna física, em toda múltipla.
    it("grava 1 na opção marcada e 0 em todas as outras de cada múltipla", async () => {
      const ONDE: Record<Formulario, string> = {
        preCurso: "TB_Pre_Curso WHERE CD_Curso = ?",
        posCurso: "TB_Pos_Curso WHERE CD_Curso = ?",
        avaliacao: "TB_Avaliacao_Aluno WHERE CPF = ? AND CD_Curso = ?",
        dadosPessoais: "TB_Dado_Pessoal_Aluno WHERE CPF = ?",
      };

      for (const [k, cdCurso] of cursosDaRodada.entries()) {
        const cpf = cpfDaRodada(k);
        const parametros: Record<Formulario, unknown[]> = {
          preCurso: [cdCurso],
          posCurso: [cdCurso],
          avaliacao: [cpf, cdCurso],
          dadosPessoais: [cpf],
        };

        for (const formulario of Object.keys(ONDE) as Formulario[]) {
          const multiplas = MAPA[formulario].filter((entrada) => entrada.tipo === "multipla");
          if (multiplas.length === 0) continue;
          const esperado = Object.fromEntries(
            multiplas.flatMap((entrada) =>
              colunasDaEntrada(entrada).map((coluna, i, todas) => [coluna, i === k % todas.length ? 1 : 0]),
            ),
          );
          const lista = Object.keys(esperado).map((coluna) => `\`${coluna}\``).join(", ");
          const [linha] = await consultar(`SELECT ${lista} FROM ${ONDE[formulario]}`, ...parametros[formulario]);

          expect(Object.fromEntries(Object.entries(linha).map(([c, v]) => [c, bit(v)]))).toEqual(esperado);
        }
      }
    });

    // COL-17: texto vira letra, cada valor na sua coluna e no seu tipo.
    it("grava cada resposta do Pré-Curso na sua coluna", async () => {
      const [linha] = await consultar(
        "SELECT `P1`, `P2`, `P11`, `P10Qual`, `P15`, `P18`, `P23.5`, `P25.1`, `P13` FROM TB_Pre_Curso WHERE CD_Curso = ?",
        cursos.cursoComRespostas,
      );

      expect({ ...linha, P15: Number(linha.P15), P18: String(linha.P18), "P23.5": Number(linha["P23.5"]) }).toEqual({
        P1: "BA",
        P2: "Salvador",
        P11: "b",
        P10Qual: "Gastronomia regional",
        P15: 40,
        P18: "12.5",
        "P23.5": 4,
        "P25.1": "d",
        P13: new Date("2026-11-03T00:00:00.000Z"),
      });
    });

    // COL-18: múltipla respondida tem 1 nas presentes e 0 nas demais.
    it("grava 1 nas opções marcadas e 0 nas demais da múltipla", async () => {
      const [linha] = await consultar(
        "SELECT `P20a`, `P20b`, `P20c`, `P20k`, `P10k`, `P10l`, `P10a` FROM TB_Pre_Curso WHERE CD_Curso = ?",
        cursos.cursoComRespostas,
      );

      expect(Object.fromEntries(Object.entries(linha).map(([c, v]) => [c, bit(v)]))).toEqual({
        P20a: 1,
        P20b: 1,
        P20c: 0,
        P20k: 0,
        P10k: 1,
        P10l: 1,
        P10a: 0,
      });
    });

    // COL-17: o resultado é o mesmo que a gravação pela API produziria - lido
    // pelo repositório, cada formulário volta igual ao que foi semeado.
    it("produz o mesmo estado que a API produziria nos quatro formulários", async () => {
      const { cursoComRespostas } = cursos;

      expect(await lerRespostas(banco!, { formulario: "preCurso", cdCurso: cursoComRespostas })).toEqual({
        ...PRE_CURSO,
        qualifCaracteristicas: ["Idiomas", "Outro"],
        publicoPerfil: ["Jovens", "Mulheres"],
      });
      expect(await lerRespostas(banco!, { formulario: "posCurso", cdCurso: cursoComRespostas })).toEqual(POS_CURSO);
      expect(
        await lerRespostas(banco!, { formulario: "avaliacao", cpf: CPF_ALUNO, cdCurso: cursoComRespostas }),
      ).toEqual(AVALIACAO);
      expect(await lerRespostas(banco!, { formulario: "dadosPessoais", cpf: CPF_ALUNO })).toEqual(DADOS_PESSOAIS);
    });

    it("grava os dados pessoais numa única linha por CPF", async () => {
      expect(
        await consultar("SELECT `CPF`, `P3`, `P4`, `P5`, `P6`, `P7` FROM TB_Dado_Pessoal_Aluno WHERE CPF = ?", CPF_ALUNO),
      ).toEqual([{ CPF: CPF_ALUNO, P3: "BA", P4: "Salvador", P5: "a", P6: null, P7: "j" }]);
    });

    // COL-19: a chave órfã não aborta e não aparece em coluna nenhuma (a
    // leitura acima já devolveu exatamente o semeado, sem ela).
    // COL-09: as tabelas antigas e a de conferência não existem mais.
    it("descarta as órfãs e remove as tabelas antigas", async () => {
      const nomes = await tabelas();

      expect(nomes).not.toContain("TB_Resposta_Pre_Curso");
      expect(nomes).not.toContain("TB_Resposta_Pos_Curso");
      expect(nomes).not.toContain("TB_Resposta_Avaliacao");
      expect(nomes).not.toContain("TB_Dado_Pessoal_Aluno_Novo");
      expect(nomes).not.toContain("_Conferencia_Respostas_Por_Coluna");
      expect(nomes).toContain("TB_Dado_Pessoal_Aluno");
    });

    // COL-23: status, datas e demais colunas existentes ficam como estavam.
    it("preserva status, datas e as demais colunas dos formulários", async () => {
      const [linha] = await consultar(
        "SELECT Status, Data_Encerramento, VL_Curso_Alocado, Criado_Por FROM TB_Pre_Curso WHERE CD_Curso = ?",
        cursos.cursoComRespostas,
      );

      expect({ ...linha, VL_Curso_Alocado: String(linha.VL_Curso_Alocado) }).toEqual({
        Status: "ENCERRADO",
        Data_Encerramento: new Date("2026-10-01T12:00:00.000Z"),
        VL_Curso_Alocado: "500",
        Criado_Por: CPF_GO,
      });
    });

    // COL-24: formulário sem resposta fica com todas as colunas em NULL.
    it("deixa em NULL as colunas de um formulário sem nenhuma resposta", async () => {
      expect(await lerRespostas(banco!, { formulario: "preCurso", cdCurso: cursos.cursoVazio })).toEqual({});
      const [linha] = await consultar(
        "SELECT `P1`, `P11`, `P20a`, `P23.1` FROM TB_Pre_Curso WHERE CD_Curso = ?",
        cursos.cursoVazio,
      );
      expect(linha).toEqual({ P1: null, P11: null, P20a: null, "P23.1": null });
    });

    // COL-31 continua valendo depois da troca de tabela: a FK com cascata
    // voltou com o nome que o Prisma espera.
    it("recria a FK dos dados pessoais com cascata", async () => {
      expect(
        await consultar(
          `SELECT CONSTRAINT_NAME AS nome, DELETE_RULE AS aoApagar, UPDATE_RULE AS aoAtualizar
           FROM information_schema.REFERENTIAL_CONSTRAINTS
           WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'TB_Dado_Pessoal_Aluno'`,
        ),
      ).toEqual([{ nome: "TB_Dado_Pessoal_Aluno_CPF_fkey", aoApagar: "CASCADE", aoAtualizar: "CASCADE" }]);
    });
  });

  // COL-20 + COL-22: texto sem opção correspondente aborta antes de qualquer
  // DROP, com o formulário no erro, e as tabelas antigas ficam intactas.
  it("aborta com o nome do formulário quando um texto não corresponde a nenhuma opção", async () => {
    cursos = await prepararBancoAntigo();
    await semearTodos(cursos.cursoComRespostas, { pre: { qualifModalidade: "Teleporte" } });
    const antes = await consultar("SELECT CD_Curso, Chave, Ordem, Valor FROM TB_Resposta_Pre_Curso ORDER BY ID_Resposta");

    await expect(rodarMigration()).rejects.toThrow(/respostas_pre_curso_divergentes/);

    expect(await consultar("SELECT CD_Curso, Chave, Ordem, Valor FROM TB_Resposta_Pre_Curso ORDER BY ID_Resposta")).toEqual(
      antes,
    );
    const nomes = await tabelas();
    expect(nomes).toEqual(
      expect.arrayContaining(["TB_Resposta_Pos_Curso", "TB_Resposta_Avaliacao", "TB_Dado_Pessoal_Aluno"]),
    );
    expect(await consultar("SELECT COUNT(*) AS n FROM TB_Dado_Pessoal_Aluno WHERE Chave IS NOT NULL")).toEqual([
      { n: BigInt(Object.keys(DADOS_PESSOAIS).length) },
    ]);
  });

  // COL-20: opção de múltipla desconhecida também aborta, e o erro aponta o
  // formulário certo (aqui, o Pós-Curso).
  it("aborta apontando o Pós-Curso quando uma opção de múltipla não existe", async () => {
    cursos = await prepararBancoAntigo();
    await semearTodos(cursos.cursoComRespostas);
    await semearLinhas("TB_Resposta_Pos_Curso", { CD_Curso: cursos.cursoComRespostas }, {
      posParticMotivosAbandono: ["Abdução"],
    });

    await expect(rodarMigration()).rejects.toThrow(/respostas_pos_curso_divergentes/);
    expect(await tabelas()).toContain("TB_Resposta_Pos_Curso");
  });

  // COL-21 + COL-22: contagem divergente (duas linhas para uma pergunta de
  // escolha única) aborta com o nome do formulário e nada antigo é removido.
  it("aborta com o nome do formulário quando a contagem diverge", async () => {
    cursos = await prepararBancoAntigo();
    await semearTodos(cursos.cursoComRespostas);
    await banco!.$executeRawUnsafe(
      "INSERT INTO TB_Dado_Pessoal_Aluno (CPF, Chave, Ordem, Valor) VALUES (?, 'avalPessoalGenero', 1, 'Masculino')",
      CPF_ALUNO,
    );

    await expect(rodarMigration()).rejects.toThrow(/respostas_dados_pessoais_divergentes/);

    expect(
      await consultar("SELECT Valor FROM TB_Dado_Pessoal_Aluno WHERE Chave = 'avalPessoalGenero' ORDER BY Ordem"),
    ).toEqual([{ Valor: "Feminino" }, { Valor: "Masculino" }]);
    expect(await tabelas()).toEqual(
      expect.arrayContaining(["TB_Resposta_Pre_Curso", "TB_Resposta_Pos_Curso", "TB_Resposta_Avaliacao"]),
    );
  });
});
