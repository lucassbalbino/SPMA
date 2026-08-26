// Reseta o banco `spma_test`: aplica migrations pendentes e limpa as
// tabelas de domínio. Usado por `npm run test:integration` e pelo global
// setup do Playwright (T5) antes de cada rodada, para garantir estado
// limpo e previsível entre execuções.
import { execFileSync } from "node:child_process";
import { config as loadEnv } from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: ".env.test" });

const DOMAIN_TABLES = [
  "TB_Avaliacao_Aluno",
  "TB_Pos_Curso",
  "TB_Pre_Curso",
  "TB_Verba",
  "TB_Ofertante",
  "TB_Sessao",
  "TB_Usuario",
  // Rate-limit por IP (REQ-SEC-03, seguranca-transversal): sem tabela nesta
  // lista, o bucket "desconhecido" (chamadas sem x-forwarded-for) acumula
  // falhas de execuções anteriores e pode ultrapassar o limite entre
  // rodadas, bloqueando logins legítimos de specs que não têm nada a ver
  // com rate-limit.
  "TB_Tentativa_Login_Ip",
];

async function main() {
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
      for (const table of DOMAIN_TABLES) {
        await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
      }
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
