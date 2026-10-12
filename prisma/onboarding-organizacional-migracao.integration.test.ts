// Teste de integração da migration que cria o gate de dados organizacionais
// do GO (OGO-14, OGO-16), contra o banco real `spma_test`.
//
// Roda o SQL da própria migration - lido do arquivo que `prisma migrate
// deploy` executa -, não uma reimplementação dele. Como a coluna já existe
// no banco de teste (o reset aplica todas as migrations), o teste volta o
// banco ao estado anterior derrubando a coluna, semeia linhas por SQL cru
// (o cliente Prisma gerado já conhece a coluna e falharia sem ela) e então
// executa a migration. Seguro porque `vitest.integration.config.ts` roda os
// arquivos em série (`fileParallelism: false`).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

const CNPJ_GO = "71830472000155";
const CPF_AL = "83920571046";

// Valores escritos aqui, não derivados de constante nenhuma: o que se prova
// é que a migration não toca nenhum deles.
const ORGANIZACAO = {
  nome: "Organizacao Pre-Migration",
  responsavel: "Responsavel Pre-Migration",
  email: "pre-migration@exemplo.dev",
  telefone: "11 4000-0000",
  uf: "SP",
  municipio: "Santos",
};

function sqlDaMigration(): string[] {
  const raiz = path.resolve(process.cwd(), "prisma/migrations");
  const pasta = readdirSync(raiz).find((nome) =>
    nome.endsWith("_onboarding_organizacional_go"),
  );

  if (!pasta) {
    throw new Error("Migration do onboarding organizacional não encontrada em prisma/migrations");
  }

  // Comentários saem ANTES de dividir por `;`: o cabeçalho da migration tem
  // ponto e vírgula em prosa, e dividir primeiro corta o comentário no meio.
  return readFileSync(path.join(raiz, pasta, "migration.sql"), "utf8")
    .split("\n")
    .filter((linha) => !linha.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((comando) => comando.trim())
    .filter((comando) => comando.length > 0);
}

async function colunaExiste(): Promise<boolean> {
  const linhas = await prisma.$queryRawUnsafe<unknown[]>(
    "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() " +
      "AND TABLE_NAME = 'TB_Usuario' AND COLUMN_NAME = 'Dados_Organizacionais_Completos'",
  );
  return linhas.length > 0;
}

async function apagarFixtures(): Promise<void> {
  await prisma.$executeRawUnsafe(
    "DELETE FROM `TB_Usuario` WHERE `Documento_Usuario` IN (?, ?)",
    CNPJ_GO,
    CPF_AL,
  );
}

describe("migration do gate de dados organizacionais do GO (integration)", () => {
  beforeAll(async () => {
    await apagarFixtures();

    // Estado anterior à migration.
    if (await colunaExiste()) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `TB_Usuario` DROP COLUMN `Dados_Organizacionais_Completos`",
      );
    }

    // GO com os 6 dados organizacionais já preenchidos - o caso que o
    // critério antigo (nome/uf não-nulos) considerava completo.
    await prisma.$executeRawUnsafe(
      "INSERT INTO `TB_Usuario` (`Documento_Usuario`, `NM_Usuario`, `Resp_Organizacao`, " +
        "`Email_Usuario`, `Tel_Organizacao`, `UF_Organizacao`, `Municipio_Organizacao`, `TP_Usuario`) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, 'GO')",
      CNPJ_GO,
      ORGANIZACAO.nome,
      ORGANIZACAO.responsavel,
      ORGANIZACAO.email,
      ORGANIZACAO.telefone,
      ORGANIZACAO.uf,
      ORGANIZACAO.municipio,
    );
    await prisma.$executeRawUnsafe(
      "INSERT INTO `TB_Usuario` (`Documento_Usuario`, `NM_Usuario`, `TP_Usuario`) VALUES (?, 'Aluno Pre-Migration', 'AL')",
      CPF_AL,
    );

    for (const comando of sqlDaMigration()) {
      await prisma.$executeRawUnsafe(comando);
    }
  });

  afterAll(async () => {
    // Se o teste falhou entre o DROP e a migration, o banco de teste não
    // pode ficar sem a coluna que o resto da suíte usa.
    if (!(await colunaExiste())) {
      for (const comando of sqlDaMigration()) {
        await prisma.$executeRawUnsafe(comando);
      }
    }
    await apagarFixtures();
    await prisma.$disconnect();
  });

  // OGO-14: todo GO existente passa pelo formulário.
  it("deixa todo usuário pré-existente com dadosOrganizacionaisCompletos = false, inclusive o GO com nome e UF preenchidos", async () => {
    const go = await prisma.usuario.findUnique({ where: { documento: CNPJ_GO } });
    const aluno = await prisma.usuario.findUnique({ where: { documento: CPF_AL } });

    expect(go?.dadosOrganizacionaisCompletos).toBe(false);
    expect(aluno?.dadosOrganizacionaisCompletos).toBe(false);
  });

  // OGO-16: nenhum dado organizacional é apagado.
  it("preserva os 6 dados organizacionais já gravados do GO", async () => {
    const go = await prisma.usuario.findUnique({
      where: { documento: CNPJ_GO },
      select: {
        nome: true,
        responsavel: true,
        email: true,
        telefone: true,
        uf: true,
        municipio: true,
      },
    });

    expect(go).toEqual(ORGANIZACAO);
  });
});
