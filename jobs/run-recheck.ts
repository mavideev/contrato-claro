import { and, asc, eq, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { clauses as clausesTable, documents, fingerprints, rechecks, subscriptionCycles, type RecheckChange } from "@/db/schema";
import { db } from "@/lib/db";
import { splitClauses } from "@/lib/extraction/clauses";
import { ExtractionError } from "@/lib/extraction/read";
import { readDocumentPages } from "@/lib/extraction/read-with-ai";
import { normalizeForCompare } from "@/lib/diff";
import { inngest } from "@/lib/inngest/client";

// Re-chequeo (spec 05, `recheck/uploaded`, etapa 4): compara la versión final
// contra la analizada. Igual que el archivo, idéntico sin más; si no, diff por
// cláusula (espacios/comillas/guiones no cuentan como cambio).
export const runRecheck = inngest.createFunction(
  {
    id: "run-recheck",
    triggers: [{ event: "recheck/uploaded" }],
    concurrency: { key: "event.data.analysisId", limit: 1 },
    retries: 3,
    onFailure: async ({ event }) => {
      const { recheckId } = event.data.event.data as { recheckId: string };
      console.error("[re-chequeo] falló después de los reintentos", { recheckId });
      await db().update(rechecks).set({ result: "failed" }).where(eq(rechecks.id, recheckId));
    },
  },
  async ({ event, step }) => {
    const { recheckId, analysisId } = event.data as { recheckId: string; analysisId: string };
    console.log("[re-chequeo] comparación iniciada", { analysisId, recheckId });

    const result = await step.run("comparar", async () => {
      const [recheck] = await db().select().from(rechecks).where(eq(rechecks.id, recheckId)).limit(1);
      if (!recheck?.documentId) throw new NonRetriableError(`El re-chequeo ${recheckId} no tiene documento`);
      const [doc] = await db().select().from(documents).where(eq(documents.id, recheck.documentId)).limit(1);
      if (!doc) throw new NonRetriableError(`Documento ${recheck.documentId} no encontrado`);

      let read;
      try {
        read = await readDocumentPages(doc, analysisId);
      } catch (err) {
        if (!(err instanceof ExtractionError)) throw err;
        console.error("[re-chequeo] no se pudo leer la versión final", { analysisId, recheckId, code: err.code });
        return { result: "failed" as const, changes: [] as RecheckChange[], pages: 0 };
      }

      // Suscripción (spec 06): se descuenta con la cantidad real de páginas,
      // solo una vez (pagesCharged hace de candado ante reintentos).
      if (recheck.subscriptionCycleId && recheck.pagesCharged == null) {
        await db().transaction(async (tx) => {
          await tx.update(rechecks).set({ pagesCharged: read.pages.length }).where(eq(rechecks.id, recheckId));
          await tx
            .update(subscriptionCycles)
            .set({ pagesUsed: sql`${subscriptionCycles.pagesUsed} + ${read.pages.length}` })
            .where(eq(subscriptionCycles.id, recheck.subscriptionCycleId!));
        });
      }

      const [fingerprint] = await db().select().from(fingerprints).where(eq(fingerprints.analysisId, analysisId)).limit(1);
      if (fingerprint?.fileSha256 && fingerprint.fileSha256 === read.sha256) {
        console.log("[re-chequeo] archivo idéntico", { analysisId, recheckId });
        return { result: "identical" as const, changes: [] as RecheckChange[], pages: read.pages.length };
      }

      const originalClauses = await db().select().from(clausesTable).where(eq(clausesTable.analysisId, analysisId)).orderBy(asc(clausesTable.number));
      const byNumber = new Map(originalClauses.map((c) => [c.number, c]));
      const newClauses = splitClauses(read.pages);
      const newByNumber = new Map(newClauses.map((c) => [c.number, c]));

      const changes: RecheckChange[] = [];
      for (const original of originalClauses) {
        const current = newByNumber.get(original.number);
        if (!current) {
          changes.push({ clauseNumber: original.number, title: original.title, before: original.text, after: "" });
        } else if (normalizeForCompare(current.text) !== normalizeForCompare(original.text)) {
          changes.push({ clauseNumber: original.number, title: original.title, before: original.text, after: current.text });
        }
      }
      for (const current of newClauses) {
        if (!byNumber.has(current.number)) changes.push({ clauseNumber: current.number, title: current.title, before: "", after: current.text });
      }
      changes.sort((a, b) => a.clauseNumber - b.clauseNumber);

      console.log("[re-chequeo] comparación completa", { analysisId, recheckId, cambios: changes.length });
      return { result: changes.length ? ("changed" as const) : ("identical" as const), changes, pages: read.pages.length };
    });

    await db()
      .update(rechecks)
      .set({ result: result.result, changes: result.changes })
      .where(and(eq(rechecks.id, recheckId), eq(rechecks.result, "pending")));
    return { recheckId, result: result.result, cambios: result.changes.length };
  },
);
