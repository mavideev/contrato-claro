import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { analyses, clauses as clausesTable, documentPages, documents } from "@/db/schema";
import { aiProvider } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { splitClauses } from "@/lib/extraction/clauses";
import { ExtractionError, hasText, readDocument } from "@/lib/extraction/read";
import { inngest } from "@/lib/inngest/client";
import { getObjectBytes } from "@/lib/storage/s3";

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
      console.error("[extracción] falló después de los reintentos", analysisId, error);
      await fail(analysisId, error instanceof ExtractionError ? error.code : "unreadable");
    },
  },
  async ({ event, step }) => {
    const { analysisId } = event.data as { analysisId: string };

    const read = await step.run("leer el texto", async () => {
      const doc = await originalDocument(analysisId);
      if (!doc) throw new NonRetriableError(`El análisis ${analysisId} no tiene documento`);
      try {
        return await readText(doc);
      } catch (err) {
        if (!(err instanceof ExtractionError)) throw err;
        await fail(analysisId, err.code);
        return null;
      }
    });
    if (!read) return { analysisId, status: "failed" };

    const clauses = splitClauses(read.pages);
    const fields = await step.run("datos clave", () => aiProvider().extractFields(clauses));

    await step.run("guardar", async () => {
      await db().transaction(async (tx) => {
        const [current] = await tx
          .update(analyses)
          .set({ status: "awaiting_confirmation", confirmedFields: fields, errorCode: null })
          .where(and(eq(analyses.id, analysisId), eq(analyses.status, "extracting")))
          .returning({ id: analyses.id });
        // Otro intento ya terminó, o el usuario borró el análisis.
        if (!current) return;
        await tx.update(documents).set({ sha256: read.sha256, pageCount: read.pages.length }).where(eq(documents.id, read.documentId));
        await tx.delete(clausesTable).where(eq(clausesTable.analysisId, analysisId));
        await tx.insert(clausesTable).values(clauses.map((c) => ({ ...c, analysisId, sha256: sha256(c.text) })));
      });
    });
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

/** Texto por página y huella del archivo. Fotos y PDF escaneados los lee la IA. */
async function readText(doc: typeof documents.$inferSelect): Promise<{ documentId: string; pages: string[]; sha256: string }> {
  if (doc.kind === "photo") {
    const pages = await db().select().from(documentPages).where(eq(documentPages.documentId, doc.id)).orderBy(asc(documentPages.pageNumber));
    const images = await Promise.all(pages.map(async (p) => ({ bytes: await getObjectBytes(p.storageKey), mime: doc.mime })));
    // La huella de un escaneo es la de todas sus páginas en orden.
    const hash = createHash("sha256");
    images.forEach((i) => hash.update(i.bytes));
    const text = await aiProvider().readPages(images);
    if (!hasText(text)) throw new ExtractionError("photos_without_text", "No se pudo leer texto en las fotos");
    return { documentId: doc.id, pages: text, sha256: hash.digest("hex") };
  }

  const bytes = await getObjectBytes(doc.storageKey);
  try {
    return { documentId: doc.id, pages: await readDocument(doc.kind, bytes), sha256: sha256(bytes) };
  } catch (err) {
    if (!(err instanceof ExtractionError) || err.code !== "pdf_without_text") throw err;
    const pages = await aiProvider().readPages([{ bytes, mime: doc.mime }]);
    if (!hasText(pages)) throw new ExtractionError("photos_without_text", "No se pudo leer texto en el PDF escaneado");
    return { documentId: doc.id, pages, sha256: sha256(bytes) };
  }
}

async function fail(analysisId: string, code: string) {
  await db()
    .update(analyses)
    .set({ status: "failed", errorCode: code })
    .where(and(eq(analyses.id, analysisId), eq(analyses.status, "extracting")));
}
