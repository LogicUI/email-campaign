import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./app/tests/e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run clean && next dev --hostname 127.0.0.1 --port 3101",
    env: {
      NEXTAUTH_URL: "http://127.0.0.1:3101",
    },
    url: "http://127.0.0.1:3101",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
