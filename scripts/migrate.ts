// Aplica las migraciones de db/migrations. Lo corre el servicio `setup` del
// compose y, en producción, `node migrate.mjs` desde la imagen (ver docs/deploy.md).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

const client = postgres(url, { max: 1, onnotice: () => {} });

migrate(drizzle(client), { migrationsFolder: "db/migrations" })
  .then(() => console.log("[migrate] base al día"))
  .catch((err) => {
    console.error("[migrate]", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
