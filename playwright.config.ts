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
  // Paralelismo por ARQUIVO, nunca dentro do arquivo.
  //
  // `fullyParallel: false` mantém os testes de um mesmo spec em série, que é
  // a ordem de que eles dependem: vários constroem estado num teste e o
  // inspecionam no seguinte (encerrar depois de preencher, 409 depois de
  // encerrar). Só os ARQUIVOS correm em paralelo, e cada um já traz os
  // próprios dados.
  //
  // O que tornou isto seguro (auditado, não presumido):
  //   1. O reset do banco roda UMA vez, em `globalSetup` - nenhum spec
  //      trunca nada no meio da suíte.
  //   2. Os 145 CPFs dos specs são distintos por arquivo. As duas exceções
  //      restantes são inofensivas: um CPF com dígito inválido (nunca
  //      persistido) e um CPF "inexistente" que nenhum spec cria.
  //   3. O limite de login por IP tem faixa por worker
  //      (`e2e/helpers/http.ts`), então falhas de um arquivo não bloqueiam o
  //      login de outro.
  //
  // Ao acrescentar spec novo: use CPFs que mais nenhum arquivo use, e nunca
  // apague dado por critério amplo (`deleteMany` sem filtro de CPF/Ofertante
  // do próprio arquivo) - é isso que quebraria o vizinho.
  fullyParallel: false,
  workers: process.env.CI ? 2 : 4,
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
    //
    // LIMITE MEDIDO: com um `dev:test` de vida longa, os specs de UI
    // pesada (`pre-cursos-formulario`, `pos-cursos-formulario`) dão falso
    // negativo intermitente em clique de checkbox/radio. Reproduzido com e
    // sem mudança de produção, isolado e em conjunto, e 100% verde com
    // servidor fresco do Playwright. Use a flag para specs de API, não
    // para specs de formulário - e nunca num gate que precise valer como
    // evidência final.
    reuseExistingServer: !!process.env.E2E_REUSE_SERVER,
    // Bumped from 60s after Batch 3 saw one flaky boot right at the
    // threshold (passed on immediate retry, nothing else held the port).
    timeout: 90_000,
  },
});
