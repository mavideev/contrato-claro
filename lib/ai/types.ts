import type { ConfirmedFields } from "@/db/schema";
import type { Clause } from "@/lib/extraction/clauses";

// Lo que la extracción le pide a la IA (spec 05, `extractAnalysis`). Hay dos
// implementaciones: el simulador (sin clave) y Claude (pendiente de conectar).

export type PageImage = { bytes: Uint8Array; mime: string };

/** Para registrar el costo de la llamada en `ai_usage` (panel /admin). */
export type AiCallContext = { analysisId: string };

export interface AiProvider {
  readonly name: "mock" | "anthropic";
  /** Lee el texto de las fotos de cada página (o de un PDF escaneado, como una sola entrada). Devuelve una entrada por página. */
  readPages(pages: PageImage[], context?: AiCallContext): Promise<string[]>;
  /** Los campos críticos (documento base §3) leídos de las cláusulas. Vacío si el contrato no lo dice. */
  extractFields(clauses: Clause[], context?: AiCallContext): Promise<ConfirmedFields>;
}
