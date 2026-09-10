import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: ".env.test" });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts", "prisma/**/*.integration.test.ts"],
    // Os arquivos compartilham um único banco `spma_test` real. O teste da
    // migration de backfill roda o SQL dela, que varre as três tabelas de
    // formulário inteiras - com execução paralela ele enxergaria linhas
    // semeadas por outro arquivo e colidiria na unicidade. Mesma razão do
    // `workers: 1` do Playwright (playwright.config.ts).
    fileParallelism: false,
    passWithNoTests: true,
  },
});
