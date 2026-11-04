import { defineConfig } from "@playwright/test";
// CI owns a separate Compose project/database. Never target a personal/production save.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:8080", browserName: "chromium" },
  workers: 2,
  retries: 0,
  reporter: "list",
});
