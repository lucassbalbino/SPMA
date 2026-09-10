import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // e2e/helpers/http.test.ts (T19, seguranca-transversal) is a Vitest unit
  // test for pure helpers, not a Playwright spec - it lives under
  // e2e/helpers/ but must not be picked up by Playwright's default
  // testMatch (which would try to import "vitest" as a Playwright test and
  // fail on the CJS/ESM mismatch).
  testIgnore: "**/helpers/**",
  globalSetup: "./e2e/global-setup.ts",
  // Specs share one real `spma_test` database with mutable state (login
  // attempt counters, created users, sessions) - serial execution avoids
  // cross-spec interference. Revisit if the suite grows slow enough to
  // need per-test data isolation instead.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:test",
    url: "http://localhost:3000",
    // Reuso é OPT-IN, nunca automático. Ligado (`E2E_REUSE_SERVER=1`), a
    // suíte aproveita um `npm run dev:test` já de pé e economiza o boot do
    // Turbopack a cada invocação - o que só compensa em rodadas repetidas
    // de poucos arquivos, durante desenvolvimento.
    //
    // O default segue `false` de propósito: com reuso automático, um
    // `npm run dev` comum (que aponta para o banco de DESENVOLVIMENTO, não
    // para `.env.test`) seria adotado silenciosamente pela suíte, e as
    // fixtures destrutivas dos specs apagariam dados de dev. Quem liga a
    // flag é quem subiu o servidor e sabe qual banco ele está usando.
    reuseExistingServer: !!process.env.E2E_REUSE_SERVER,
    // Bumped from 60s after Batch 3 saw one flaky boot right at the
    // threshold (passed on immediate retry, nothing else held the port).
    timeout: 90_000,
  },
});
