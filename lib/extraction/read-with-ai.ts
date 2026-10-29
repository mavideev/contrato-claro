import "server-only";
import { createHash } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { documentPages, documents } from "@/db/schema";
import { aiProvider } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { getObjectBytes } from "@/lib/storage/s3";
import { ExtractionError, hasText, readDocument } from "./read";

// Texto por página y huella del archivo, para un `documents` ya subido. Fotos
// y PDF escaneados los lee la IA. Lo usan `extract-analysis.ts` (etapa 2) y
// `run-recheck.ts` (etapa 4): misma lectura, documentos distintos.

const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");

export async function readDocumentPages(doc: typeof documents.$inferSelect, analysisId: string): Promise<{ pages: string[]; sha256: string }> {
  if (doc.kind === "photo") {
    const pages = await db().select().from(documentPages).where(eq(documentPages.documentId, doc.id)).orderBy(asc(documentPages.pageNumber));
    const images = await Promise.all(pages.map(async (p) => ({ bytes: await getObjectBytes(p.storageKey), mime: doc.mime })));
    // La huella de un escaneo es la de todas sus páginas en orden.
    const hash = createHash("sha256");
    images.forEach((i) => hash.update(i.bytes));
    console.log("[extracción] leyendo fotos con IA", { analysisId, fotos: images.length, ai: aiProvider().name });
    const text = await aiProvider().readPages(images, { analysisId });
    if (!hasText(text)) throw new ExtractionError("photos_without_text", "No se pudo leer texto en las fotos");
    return { pages: text, sha256: hash.digest("hex") };
  }

  const bytes = await getObjectBytes(doc.storageKey);
  try {
    return { pages: await readDocument(doc.kind, bytes), sha256: sha256(bytes) };
  } catch (err) {
    if (!(err instanceof ExtractionError) || err.code !== "pdf_without_text") throw err;
    console.log("[extracción] PDF escaneado, leyendo con IA", { analysisId, ai: aiProvider().name });
    const pages = await aiProvider().readPages([{ bytes, mime: doc.mime }], { analysisId });
    if (!hasText(pages)) throw new ExtractionError("photos_without_text", "No se pudo leer texto en el PDF escaneado");
    return { pages, sha256: sha256(bytes) };
  }
}
