import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm --prefix ../frontend run dev -- --host 127.0.0.1",
        url: "http://127.0.0.1:5173/login",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5173",
    headless: true,
  },
});
