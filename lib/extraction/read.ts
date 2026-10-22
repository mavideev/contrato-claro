import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { MAX_PAGES } from "@/lib/storage/upload";

// Lectura directa del texto (spec 05, `extractAnalysis`, paso 1): PDF con
// pdf.js (vía unpdf), Word con mammoth y el texto pegado tal cual. Las fotos
// las lee la IA (lib/ai).

export class ExtractionError extends Error {
  constructor(
    /** Se guarda en `analyses.error_code` y elige el mensaje de la pantalla. */
    readonly code: "empty" | "pdf_without_text" | "photos_without_text" | "too_many_pages" | "unreadable",
    message: string,
  ) {
    super(message);
  }
}

/** Texto por página. Un Word o un texto pegado es una sola «página». */
export async function readDocument(kind: "pdf" | "docx" | "text", bytes: Uint8Array): Promise<string[]> {
  const pages = await read(kind, bytes);
  if (pages.length > MAX_PAGES) throw new ExtractionError("too_many_pages", `El documento tiene ${pages.length} páginas (máximo ${MAX_PAGES})`);
  if (!hasText(pages)) {
    // Un PDF escaneado no trae texto: lo tiene que leer la IA como si fueran fotos.
    throw kind === "pdf" ? new ExtractionError("pdf_without_text", "El PDF no tiene texto seleccionable") : new ExtractionError("empty", "El documento no tiene texto");
  }
  return pages;
}

/** Un contrato tiene al menos unas palabras: si no, no se pudo leer. */
export function hasText(pages: string[]): boolean {
  return pages.join("").replace(/[^\p{L}]/gu, "").length >= 40;
}

async function read(kind: "pdf" | "docx" | "text", bytes: Uint8Array): Promise<string[]> {
  try {
    if (kind === "text") return [new TextDecoder().decode(bytes)];
    if (kind === "docx") {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return [value];
    }
    // pdf.js se queda con el buffer: se le pasa una copia.
    const pdf = await getDocumentProxy(bytes.slice());
    const { text } = await extractText(pdf, { mergePages: false });
    return text;
  } catch (err) {
    throw new ExtractionError("unreadable", `No se pudo abrir el archivo: ${(err as Error).message}`);
  }
}
