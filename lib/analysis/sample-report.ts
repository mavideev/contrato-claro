import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as s from "../../db/schema";

// Informe de ejemplo: lo usan el seed y, en la etapa 1, el job que corre
// después de un pago aprobado (el análisis real con IA es la etapa 3).
// Imports relativos: también lo importa scripts/seed.ts (fuera de Next).

// Contrato de ejemplo: 12 cláusulas; 3 con hallazgos (las del prototipo).
export const SAMPLE_CLAUSES: { title: string; text: string }[] = [
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

export const SAMPLE_FINDINGS: Record<number, Omit<typeof s.findings.$inferInsert, "analysisId" | "clauseId">> = {
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

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

/** Escribe cláusulas, hallazgos y huella de ejemplo. Si ya existen, no hace nada. */
export async function writeSampleReport(db: PostgresJsDatabase<typeof s>, analysisId: string) {
  const [existing] = await db.select({ id: s.clauses.id }).from(s.clauses).where(eq(s.clauses.analysisId, analysisId)).limit(1);
  if (existing) return;

  const inserted = await db
    .insert(s.clauses)
    .values(SAMPLE_CLAUSES.map((c, i) => ({ analysisId, number: i + 1, title: c.title, text: c.text, sha256: sha256(c.text) })))
    .returning();

  await db.insert(s.findings).values(
    inserted.filter((c) => SAMPLE_FINDINGS[c.number]).map((c) => ({ ...SAMPLE_FINDINGS[c.number], analysisId, clauseId: c.id })),
  );

  await db.insert(s.fingerprints).values({
    analysisId,
    fileSha256: sha256(`archivo-${analysisId}`),
    normalizedTextSha256: sha256(SAMPLE_CLAUSES.map((c) => c.text).join("\n")),
    clauseHashes: Object.fromEntries(inserted.map((c) => [c.number, c.sha256])),
  });
}
