import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results.nosync",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /storefront|guard/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /admin|guard/ },
  ],
  webServer: {
    command: `NEXT_DIST_DIR=.next-test.nosync npx next build && NEXT_DIST_DIR=.next-test.nosync npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
