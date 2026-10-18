import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";

// Un solo pool por proceso. En dev, el hot reload re-evalúa los módulos,
// así que se guarda en globalThis para no abrir conexiones de más.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export function sql(): postgres.Sql {
  globalForDb.sql ??= postgres(env().DATABASE_URL, { max: 10 });
  return globalForDb.sql;
}

export function db() {
  return drizzle(sql());
}
