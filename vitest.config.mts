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
      S3_BUCKET: "contracts",
      S3_ACCESS_KEY_ID: "test",
      S3_SECRET_ACCESS_KEY: "test",
    },
  },
});
