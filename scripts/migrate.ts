// Aplica las migraciones de db/migrations. Lo corre el servicio `setup` del
// compose y, en Render, el preDeployCommand.
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
