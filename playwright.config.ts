import { defineConfig, devices } from "@playwright/test";

// Smoke tests contra el entorno local (`make up` o `make dev`), spec 03.
// Uso: `pnpm e2e`. BASE_URL permite apuntar a otro entorno.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, storageState: "e2e/.auth/demo.json" },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      // 390 px como el prototipo; Chromium con emulación táctil.
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, storageState: "e2e/.auth/demo.json" },
      dependencies: ["setup"],
    },
  ],
});
