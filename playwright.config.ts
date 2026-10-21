import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  outputDir: "output/playwright/results",
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3011",
    serviceWorkers: "allow",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: "bun run start --port 3011 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3011",
    reuseExistingServer: false,
    env: {
      BETTER_AUTH_URL: "http://127.0.0.1:3011",
      LOOM_LOCAL_TEST_LOGIN: "0",
    },
    timeout: 30_000,
  },
});
