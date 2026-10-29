// Datos de ejemplo para desarrollo local (spec 01, "Seed local").
// Idempotente: si el usuario demo ya existe, no hace nada.
// `make reset` borra la base y vuelve a sembrar desde cero.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "../db/schema";
import { SAMPLE_FIELDS as FIELDS, SAMPLE_PREVIEW } from "../lib/analysis/sample";
import { SAMPLE_CLAUSES as CLAUSES, writeSampleReport } from "../lib/analysis/sample-report";

if (process.env.NODE_ENV === "production") throw new Error("El seed es solo para desarrollo");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s, casing: "snake_case" });

export const DEMO = { email: "demo@contratoclaro.local", password: "demo12345", name: "Usuario Demo" };
export const OTHER = { email: "otro@contratoclaro.local", password: "otro12345", name: "Otra Persona" };

const today = () => new Date().toISOString().slice(0, 10);

async function createUser(u: typeof DEMO) {
  const id = randomUUID();
  await db.insert(s.user).values({ id, name: u.name, email: u.email, emailVerified: true });
  await db.insert(s.account).values({
    id: randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: await hashPassword(u.password),
  });
  return id;
}



async function createReadyAnalysis(userId: string, opts: { signingDate?: string; createdAt: Date; label: string }) {
  const [a] = await db
    .insert(s.analyses)
    .values({
      userId,
      status: "ready",
      propertyLabel: opts.label,
      signingDate: opts.signingDate,
      checklistVersion: "rental-v1",
      confirmedFields: FIELDS,
      preview: SAMPLE_PREVIEW,
      createdAt: opts.createdAt,
    })
    .returning();

  await writeSampleReport(db, a.id);

  await db.insert(s.payments).values({
    userId,
    analysisId: a.id,
    kind: "analysis",
    status: "approved",
    mpPaymentId: `seed-${a.id}`,
    amountCents: 0,
  });
  return a;
}

/** Plan de suscripción por defecto (spec 06), independiente del resto del seed. */
async function ensureDefaultPlan() {
  const [existing] = await db.select({ id: s.plans.id }).from(s.plans).where(eq(s.plans.code, "basic"));
  if (existing) return;
  await db.insert(s.plans).values({ code: "basic", name: "Plan Básico", priceCents: 0, pageQuota: 50 });
  console.log('[seed] plan "basic" creado (50 páginas/mes; precio sin definir, PRICE_* en .env)');
}

async function main() {
  await ensureDefaultPlan();

  const existing = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.email, DEMO.email));
  if (existing.length) {
    console.log("[seed] ya hay datos de ejemplo; nada que hacer (usá `make reset` para empezar de cero)");
    return;
  }

  const demoId = await createUser(DEMO);
  await createReadyAnalysis(demoId, { label: "[Dirección] · Palermo", createdAt: new Date("2026-10-14T13:42:00Z") });
  const signsToday = await createReadyAnalysis(demoId, {
    label: "[Dirección] · Caballito",
    signingDate: today(),
    createdAt: new Date("2026-10-12T15:00:00Z"),
  });
  // Re-chequeo pagado con 2 cambios (prototipo 6 · Re-chequeo).
  const [recheckPayment] = await db
    .insert(s.payments)
    .values({ userId: demoId, analysisId: signsToday.id, kind: "recheck", status: "approved", mpPaymentId: `seed-recheck-${signsToday.id}`, amountCents: 0 })
    .returning();
  await db.insert(s.rechecks).values({
    analysisId: signsToday.id,
    paymentId: recheckPayment.id,
    result: "changed",
    changes: [
      { clauseNumber: 4, title: "Ajuste", before: CLAUSES[3].text, after: CLAUSES[3].text.replace("trimestralmente", "mensualmente") },
      { clauseNumber: 11, title: "Valor inicial", before: CLAUSES[10].text, after: CLAUSES[10].text.replace("$ 450.000 (pesos cuatrocientos cincuenta mil)", "$ 540.000 (pesos quinientos cuarenta mil)") },
    ],
  });

  const [pending] = await db
    .insert(s.analyses)
    .values({
      userId: demoId,
      status: "preview_ready",
      propertyLabel: "[Dirección] · Almagro",
      confirmedFields: FIELDS,
      preview: SAMPLE_PREVIEW,
      createdAt: new Date("2026-10-15T12:00:00Z"),
    })
    .returning();
  await db.insert(s.payments).values({
    userId: demoId,
    analysisId: pending.id,
    kind: "analysis",
    status: "pending",
    amountCents: 0,
  });

  // Segundo usuario: sirve para probar que nadie ve análisis ajenos.
  const otherId = await createUser(OTHER);
  await createReadyAnalysis(otherId, { label: "[Dirección] · Belgrano", createdAt: new Date("2026-10-10T12:00:00Z") });

  console.log(`[seed] listo: ${DEMO.email} / ${DEMO.password} (y ${OTHER.email} / ${OTHER.password})`);
}

main()
  .catch((err) => {
    console.error("[seed]", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
