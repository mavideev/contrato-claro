import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as s from "@/db/schema";
import { aiProvider } from "@/lib/ai/provider";
import { checklistFor } from "./checklists";
import { DNU_70_2023_DATE, PRE_DNU_FINDING } from "./checklists/rental-v1";
import { viewerRoleLabel } from "./fields";

// Análisis real con IA (etapa 3, spec 05 `runAnalysis`): hallazgos por
// cláusula según el checklist, huella del contrato, y versión usada.
// Reemplaza a `writeSampleReport` (que sigue existiendo para el seed).

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

export async function runAnalysis(db: PostgresJsDatabase<typeof s>, analysisId: string, signingDate: string | null): Promise<{ checklistVersion: string }> {
  const [analysis] = await db.select({ contractType: s.analyses.contractType, viewerRole: s.analyses.viewerRole }).from(s.analyses).where(eq(s.analyses.id, analysisId)).limit(1);
  const { version: checklistVersion, checklist } = checklistFor(analysis?.contractType ?? "rental");

  const [existing] = await db.select({ id: s.findings.id }).from(s.findings).where(eq(s.findings.analysisId, analysisId)).limit(1);
  if (existing) return { checklistVersion };

  const clauses = await db.select().from(s.clauses).where(eq(s.clauses.analysisId, analysisId)).orderBy(asc(s.clauses.number));
  const byNumber = new Map(clauses.map((c) => [c.number, c]));

  const supportingDocs = await db
    .select({ label: s.documents.label, text: s.documents.text })
    .from(s.documents)
    .where(and(eq(s.documents.analysisId, analysisId), eq(s.documents.role, "supporting")));
  const supportingText = supportingDocs
    .filter((d) => d.text)
    .map((d) => `Documento adjunto: ${d.label ?? "sin nombre"}\n${d.text}`)
    .join("\n\n---\n\n");

  const contractType = analysis?.contractType ?? "rental";
  const roleLabel = viewerRoleLabel(contractType, analysis?.viewerRole ?? null);
  const { findings: aiFindings, conclusion } = clauses.length
    ? await aiProvider().analyzeRisks(clauses, checklist, contractType, supportingText, roleLabel, { analysisId })
    : { findings: [], conclusion: "" };
  const rows = aiFindings
    .map((f) => {
      const clause = byNumber.get(f.clauseNumber);
      if (!clause) return null;
      return { analysisId, clauseId: clause.id, level: f.level, title: f.title, explanation: f.explanation, whatToAsk: f.whatToAsk };
    })
    .filter((f) => f !== null);

  // Contrato firmado antes del DNU 70/2023: el checklist (ley vigente hoy) no aplica del todo.
  if (contractType === "rental" && signingDate && signingDate < DNU_70_2023_DATE && clauses[0]) {
    rows.unshift({ analysisId, clauseId: clauses[0].id, ...PRE_DNU_FINDING });
  }

  if (rows.length) await db.insert(s.findings).values(rows);
  if (conclusion) await db.update(s.analyses).set({ conclusion }).where(eq(s.analyses.id, analysisId));

  const [document] = await db
    .select({ sha256: s.documents.sha256 })
    .from(s.documents)
    .where(and(eq(s.documents.analysisId, analysisId), eq(s.documents.role, "original")))
    .limit(1);
  await db
    .insert(s.fingerprints)
    .values({
      analysisId,
      fileSha256: document?.sha256 ?? null,
      normalizedTextSha256: sha256(clauses.map((c) => c.text).join("\n")),
      clauseHashes: Object.fromEntries(clauses.map((c) => [c.number, c.sha256])),
    })
    .onConflictDoNothing();

  return { checklistVersion };
}
