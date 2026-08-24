// Roda antes da suíte e2e: reseta `spma_test` (migrate deploy + truncate,
// via scripts/db-test-reset.ts) e semeia o Administrador Master (via
// prisma/seed.ts), para que os specs comecem sempre de um estado limpo e
// previsível.
//
// Ambos rodam como processo filho separado (execFileSync), nunca via
// import direto do client/seed gerado pelo Prisma aqui: (1) `.env.test` é
// carregado com override:true - seed.ts também chama loadEnv() sem path
// (lê `.env`), e como o dotenv nunca sobrescreve uma env var já definida,
// importar seed.ts sem essa ordem faria a suíte apontar para o banco de
// DEV em vez do de teste; (2) o loader de módulos do Playwright não
// consegue fazer import() do client TS gerado pelo Prisma sem erro de
// ciclo require/ESM - rodar como processo `tsx` isolado evita o problema.
import { execFileSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

async function globalSetup() {
  loadEnv({ path: ".env.test", override: true });

  execFileSync("npm", ["run", "db:test:reset"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  execFileSync("npx", ["tsx", "prisma/seed.ts"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
}

export default globalSetup;
