import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
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
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
