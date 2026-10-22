import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? `postgres://contratos:contratos@localhost:${process.env.DB_PORT ?? 5432}/contratos`,
  },
});
