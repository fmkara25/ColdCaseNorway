import { defineConfig } from "@playwright/test";

if (!process.env.TEST_DATABASE_CONNECTION) throw new Error("Set TEST_DATABASE_CONNECTION to an isolated test database.");
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:5173", browserName: "chromium" },
  retries: 0,
  reporter: "list",
  webServer: [
    {
      command: "dotnet run --project ../backend/ColdCase.Api --no-launch-profile --configuration Release",
      url: "http://localhost:5249/api/health",
      env: { ASPNETCORE_ENVIRONMENT: "Development", Testing__BrowserAcceptance: "true", ASPNETCORE_URLS: "http://localhost:5249", ConnectionStrings__ColdCase: process.env.TEST_DATABASE_CONNECTION },
      timeout: 120_000,
      reuseExistingServer: false,
    },
    { command: "npm run dev -- --host 127.0.0.1 --strictPort", url: "http://127.0.0.1:5173", reuseExistingServer: false },
  ],
});
