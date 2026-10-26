import { defineConfig, devices } from "@playwright/test";

// Smoke tests contra el entorno local (`make up` o `make dev`), spec 03.
// Uso: `pnpm e2e`. BASE_URL permite apuntar a otro entorno.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // Un solo servidor de Next.js en modo dev para todo el run: con más de un
  // worker, dos tests pueden pedir rutas nunca compiladas al mismo tiempo y
  // saturar el compilador (se vio "Compiling..." todavía a los 90s en CI).
  // Localmente no hace falta: cada test corre contra sus propias rutas de a una.
  workers: process.env.CI ? 1 : undefined,
  // El dev server compila cada ruta la primera vez: margen para eso (una ruta
  // nunca visitada puede tardar bastante más de 10s en CI).
  expect: { timeout: 30_000 },
  // Los registros pueden esperar al rate limit (ver e2e/helpers.ts), y algún
  // test espera 60s una compilación en frío: margen por encima de eso.
  timeout: 150_000,
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
