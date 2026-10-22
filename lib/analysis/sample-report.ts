import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as s from "../../db/schema";

// Informe de ejemplo: lo usan el seed y el job que corre después de un pago
// aprobado, hasta que llegue el análisis real con IA (etapa 3). Desde la etapa 2
// usa las cláusulas reales del contrato y marca las de depósito, ajuste y rescisión.
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

type SampleFinding = Omit<typeof s.findings.$inferInsert, "analysisId" | "clauseId">;

// Los hallazgos del prototipo, por tema de la cláusula.
const SAMPLE_FINDINGS: { topic: RegExp; finding: SampleFinding }[] = [
  {
    topic: /dep[oó]sito/i,
    finding: {
      level: "high",
      title: "Depósito sin plazo de devolución",
      explanation: "No dice en cuántos días se devuelve ni con qué ajuste. Pedí que quede por escrito.",
      whatToAsk: "Pedí que se agregue el plazo de devolución en días y cómo se actualiza el monto al momento de devolverlo.",
    },
  },
  {
    topic: /ajuste|actualizaci/i,
    finding: {
      level: "attention",
      title: "Ajuste del precio",
      explanation: "Confirmá la fuente del índice y desde qué fecha rige el primer ajuste.",
      whatToAsk: "Preguntá desde qué mes se aplica el primer ajuste y qué índice se usa si deja de publicarse.",
    },
  },
  {
    topic: /rescisi/i,
    finding: {
      level: "attention",
      title: "Condiciones para rescindir",
      explanation: "Revisá si hay penalidad y desde qué mes se puede rescindir.",
      whatToAsk: "Buscá si hay una penalidad en meses de alquiler por rescindir antes de tiempo y desde qué mes podés hacerlo.",
    },
  },
];

/** Hallazgos de ejemplo por número de cláusula: la primera cláusula de cada tema. */
export function sampleFindings(clauses: { number: number; title: string }[]): Map<number, SampleFinding> {
  const out = new Map<number, SampleFinding>();
  for (const { topic, finding } of SAMPLE_FINDINGS) {
    const clause = clauses.find((c) => topic.test(c.title) && !out.has(c.number));
    if (clause) out.set(clause.number, finding);
  }
  return out;
}

/** Vista previa coherente con el informe de ejemplo. */
export function samplePreview(clauses: { number: number; title: string }[]): s.PreviewCounts {
  const levels = [...sampleFindings(clauses).values()].map((f) => f.level);
  const high = levels.filter((l) => l === "high").length;
  const attention = levels.filter((l) => l === "attention").length;
  return { high, attention, none: clauses.length - high - attention };
}

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Escribe hallazgos y huella de ejemplo sobre las cláusulas del análisis. Si no
 * tiene cláusulas (seed), escribe las del contrato de ejemplo. Si ya hay
 * hallazgos, no hace nada.
 */
export async function writeSampleReport(db: PostgresJsDatabase<typeof s>, analysisId: string) {
  const [existing] = await db.select({ id: s.findings.id }).from(s.findings).where(eq(s.findings.analysisId, analysisId)).limit(1);
  if (existing) return;

  let clauses = await db.select().from(s.clauses).where(eq(s.clauses.analysisId, analysisId)).orderBy(asc(s.clauses.number));
  if (clauses.length === 0) {
    clauses = await db
      .insert(s.clauses)
      .values(SAMPLE_CLAUSES.map((c, i) => ({ analysisId, number: i + 1, title: c.title, text: c.text, sha256: sha256(c.text) })))
      .returning();
  }

  const findings = sampleFindings(clauses);
  const flagged = clauses.filter((c) => findings.has(c.number));
  if (flagged.length) await db.insert(s.findings).values(flagged.map((c) => ({ ...findings.get(c.number)!, analysisId, clauseId: c.id })));

  const [document] = await db
    .select({ sha256: s.documents.sha256 })
    .from(s.documents)
    .where(and(eq(s.documents.analysisId, analysisId), eq(s.documents.role, "original")))
    .limit(1);
  await db
    .insert(s.fingerprints)
    .values({
      analysisId,
      fileSha256: document?.sha256 ?? sha256(`archivo-${analysisId}`),
      normalizedTextSha256: sha256(clauses.map((c) => c.text).join("\n")),
      clauseHashes: Object.fromEntries(clauses.map((c) => [c.number, c.sha256])),
    })
    .onConflictDoNothing();
}
