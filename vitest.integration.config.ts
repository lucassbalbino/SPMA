import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: ".env.test" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts", "prisma/**/*.integration.test.ts"],
    passWithNoTests: true,
  },
});
