import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { analyses, clauses as clausesTable, documents, subscriptionCycles } from "@/db/schema";
import { aiProvider } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { splitClauses } from "@/lib/extraction/clauses";
import { ExtractionError } from "@/lib/extraction/read";
import { readDocumentPages } from "@/lib/extraction/read-with-ai";
import { inngest } from "@/lib/inngest/client";

// Extracción (spec 05, `analysis/uploaded`): texto → cláusulas → datos clave →
// `awaiting_confirmation`. Si el contrato no se puede leer, queda en `failed`
// con el motivo en `error_code` y la pantalla de estado ofrece subir otro.
export const extractAnalysis = inngest.createFunction(
  {
    id: "extract-analysis",
    triggers: [{ event: "analysis/uploaded" }],
    // Un análisis a la vez por usuario (spec 05).
    concurrency: { key: "event.data.userId", limit: 1 },
    retries: 3,
    onFailure: async ({ event, error }) => {
      const { analysisId } = event.data.event.data as { analysisId: string };
      console.error("[análisis] falló después de los reintentos", { analysisId, error });
      await fail(analysisId, error instanceof ExtractionError ? error.code : "unreadable");
    },
  },
  async ({ event, step }) => {
    const { analysisId } = event.data as { analysisId: string };
    console.log("[análisis] extracción iniciada", { analysisId });

    const read = await step.run("leer el texto", async () => {
      const doc = await originalDocument(analysisId);
      if (!doc) throw new NonRetriableError(`El análisis ${analysisId} no tiene documento`);
      try {
        const result = await readDocumentPages(doc, analysisId);
        return { documentId: doc.id, ...result };
      } catch (err) {
        if (!(err instanceof ExtractionError)) throw err;
        console.error("[análisis] no se pudo leer el texto", { analysisId, code: err.code });
        await fail(analysisId, err.code);
        return null;
      }
    });
    if (!read) return { analysisId, status: "failed" };
    console.log("[análisis] texto leído", { analysisId, pages: read.pages.length });

    const clauses = splitClauses(read.pages);
    console.log("[análisis] cláusulas detectadas", { analysisId, clauses: clauses.length });

    const fields = await step.run("datos clave", () => aiProvider().extractFields(clauses, { analysisId }));
    console.log("[análisis] datos clave extraídos", { analysisId, ai: aiProvider().name, camposLeidos: Object.values(fields).filter(Boolean).length });

    await step.run("guardar", async () => {
      await db().transaction(async (tx) => {
        const [current] = await tx
          .update(analyses)
          .set({ status: "awaiting_confirmation", confirmedFields: fields, errorCode: null })
          .where(and(eq(analyses.id, analysisId), eq(analyses.status, "extracting")))
          .returning({ id: analyses.id, billingMode: analyses.billingMode, subscriptionCycleId: analyses.subscriptionCycleId, pagesCharged: analyses.pagesCharged });
        // Otro intento ya terminó, o el usuario borró el análisis.
        if (!current) return;
        await tx.update(documents).set({ sha256: read.sha256, pageCount: read.pages.length }).where(eq(documents.id, read.documentId));
        await tx.delete(clausesTable).where(eq(clausesTable.analysisId, analysisId));
        await tx.insert(clausesTable).values(clauses.map((c) => ({ ...c, analysisId, sha256: sha256(c.text) })));

        // Suscripción (spec 06): se descuenta recién acá, con la cantidad real de
        // páginas, y solo una vez (pagesCharged hace de candado ante reintentos).
        if (current.billingMode === "subscription" && current.subscriptionCycleId && current.pagesCharged == null) {
          await tx.update(analyses).set({ pagesCharged: read.pages.length }).where(eq(analyses.id, analysisId));
          await tx
            .update(subscriptionCycles)
            .set({ pagesUsed: sql`${subscriptionCycles.pagesUsed} + ${read.pages.length}` })
            .where(eq(subscriptionCycles.id, current.subscriptionCycleId));
        }
      });
    });
    console.log("[análisis] extracción completa", { analysisId, clauses: clauses.length, ai: aiProvider().name });
    return { analysisId, clauses: clauses.length, ai: aiProvider().name };
  },
);

const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");

async function originalDocument(analysisId: string) {
  const [doc] = await db()
    .select()
    .from(documents)
    .where(and(eq(documents.analysisId, analysisId), eq(documents.role, "original")))
    .orderBy(asc(documents.createdAt))
    .limit(1);
  return doc ?? null;
}

async function fail(analysisId: string, code: string) {
  await db()
    .update(analyses)
    .set({ status: "failed", errorCode: code })
    .where(and(eq(analyses.id, analysisId), eq(analyses.status, "extracting")));
}
