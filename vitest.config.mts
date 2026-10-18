import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `server-only` lanza error fuera de Next; en tests no hace falta.
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    env: {
      APP_URL: "http://localhost:3000",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://contratos:contratos@localhost:5432/contratos",
      BETTER_AUTH_SECRET: "test-secret-de-al-menos-32-caracteres!!",
      MP_WEBHOOK_SECRET: "secreto-de-prueba",
      // RustFS del compose (las pruebas de subida usan el almacenamiento local).
      S3_ENDPOINT: "http://localhost:9000",
      S3_PUBLIC_ENDPOINT: "http://localhost:9000",
      S3_FORCE_PATH_STYLE: "true",
      S3_BUCKET: "contracts",
      S3_ACCESS_KEY_ID: "contratos",
      S3_SECRET_ACCESS_KEY: "contratos-local-secret",
    },
  },
});
