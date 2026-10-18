// Datos de ejemplo para desarrollo local (spec 01, "Seed local").
// Idempotente: si el usuario demo ya existe, no hace nada.
// `make reset` borra la base y vuelve a sembrar desde cero.
import { createHash, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "../db/schema";
import { SAMPLE_FIELDS as FIELDS, SAMPLE_PREVIEW } from "../lib/analysis/sample";

if (process.env.NODE_ENV === "production") throw new Error("El seed es solo para desarrollo");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s, casing: "snake_case" });

export const DEMO = { email: "demo@contratoclaro.local", password: "demo12345", name: "Usuario Demo" };
export const OTHER = { email: "otro@contratoclaro.local", password: "otro12345", name: "Otra Persona" };

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");
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

// Contrato de ejemplo: 12 cláusulas; 3 con hallazgos (las del prototipo).
const CLAUSES: { title: string; text: string }[] = [
  { title: "Partes", text: "[Locador], DNI [número], y [Locatario], DNI [número], celebran el presente contrato de locación." },
  { title: "Objeto", text: "El locador da en locación al locatario el inmueble ubicado en [Dirección y unidad], destinado exclusivamente a vivienda." },
  { title: "Plazo", text: "El plazo de la locación es de 24 meses, contados desde la fecha de entrega de llaves." },
  { title: "Ajuste", text: "El precio se actualizará trimestralmente según la variación del IPC publicada por el INDEC." },
  { title: "Forma de pago", text: "El alquiler se paga por mes adelantado, del 1 al 10 de cada mes, mediante transferencia bancaria." },
  { title: "Expensas", text: "Las expensas ordinarias están a cargo del locatario; las extraordinarias, a cargo del locador." },
  { title: "Depósito", text: "El locatario entrega en este acto la suma equivalente a tres meses de alquiler en concepto de depósito en garantía." },
  { title: "Garantía", text: "En garantía de las obligaciones asumidas, el locatario presenta seguro de caución [Aseguradora]." },
  { title: "Rescisión", text: "El locatario podrá rescindir el contrato notificando con 90 días de anticipación." },
  { title: "Mejoras", text: "Toda mejora requiere autorización escrita del locador y quedará a beneficio del inmueble." },
  { title: "Valor inicial", text: "El alquiler mensual inicial es de $ 450.000 (pesos cuatrocientos cincuenta mil)." },
  { title: "Domicilios", text: "Las partes constituyen domicilio en los indicados al inicio, donde serán válidas las notificaciones." },
];

const FINDINGS: Record<number, Omit<typeof s.findings.$inferInsert, "analysisId" | "clauseId">> = {
  7: {
    level: "high",
    title: "Depósito de 3 meses sin plazo de devolución",
    explanation: "No dice en cuántos días se devuelve ni con qué ajuste. Pedí que quede por escrito.",
    whatToAsk: "Pedí que se agregue el plazo de devolución en días y cómo se actualiza el monto al momento de devolverlo.",
  },
  4: {
    level: "attention",
    title: "Ajuste trimestral por IPC",
    explanation: "Confirmá la fuente del índice y desde qué fecha rige el primer ajuste.",
    whatToAsk: "Preguntá desde qué mes se aplica el primer ajuste y qué índice se usa si el IPC deja de publicarse.",
  },
  9: {
    level: "attention",
    title: "Preaviso de 90 días para el inquilino",
    explanation: "Revisá si hay penalidad y desde qué mes se puede rescindir.",
    whatToAsk: "Buscá si hay una penalidad en meses de alquiler por rescindir antes de tiempo y desde qué mes podés hacerlo.",
  },
};


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

  const inserted = await db
    .insert(s.clauses)
    .values(CLAUSES.map((c, i) => ({ analysisId: a.id, number: i + 1, title: c.title, text: c.text, sha256: sha256(c.text) })))
    .returning();

  await db.insert(s.findings).values(
    inserted
      .filter((c) => FINDINGS[c.number])
      .map((c) => ({ ...FINDINGS[c.number], analysisId: a.id, clauseId: c.id })),
  );

  await db.insert(s.fingerprints).values({
    analysisId: a.id,
    fileSha256: sha256(`archivo-${a.id}`),
    normalizedTextSha256: sha256(CLAUSES.map((c) => c.text).join("\n")),
    clauseHashes: Object.fromEntries(inserted.map((c) => [c.number, c.sha256])),
  });

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

async function main() {
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
