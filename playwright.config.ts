import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  reporter: "line",
  use: { baseURL: "http://localhost:4173", ...devices["iPhone 13"], browserName: "chromium", viewport: { width: 375, height: 812 } },
  webServer: { command: "serve out -l 4173", url: "http://localhost:4173", reuseExistingServer: true, timeout: 120_000 },
});
