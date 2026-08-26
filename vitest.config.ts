import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // e2e/helpers/**: helpers puros (sem browser/servidor) usados pelos specs
    // Playwright - T19 (seguranca-transversal) exige teste unitário direto
    // para eles, então precisam ser descobertos por este runner também.
    include: ["src/**/*.test.ts", "e2e/helpers/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
    passWithNoTests: true,
  },
});
