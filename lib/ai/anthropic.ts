import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ConfirmedFields } from "@/db/schema";
import { ExtractionError } from "@/lib/extraction/read";
import type { Clause } from "@/lib/extraction/clauses";
import type { AiProvider, PageImage } from "./types";

const MODEL = "claude-haiku-4-5";
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

const client = new Anthropic();

const PagesSchema = z.object({ pages: z.array(z.string()) });

const FieldsSchema = z.object({
  landlord: z.string().optional(),
  tenant: z.string().optional(),
  property: z.string().optional(),
  term: z.string().optional(),
  initialRent: z.string().optional(),
  currency: z.string().optional(),
  adjustment: z.string().optional(),
  deposit: z.string().optional(),
  guarantee: z.string().optional(),
  termination: z.string().optional(),
  expenses: z.string().optional(),
  commission: z.string().optional(),
});

export async function pingAnthropic(): Promise<void> {
  await client.models.retrieve(MODEL);
}

function pageBlock(page: PageImage): Anthropic.ContentBlockParam {
  const data = Buffer.from(page.bytes).toString("base64");
  if (page.mime === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  }
  if (!SUPPORTED_IMAGE_TYPES.includes(page.mime as SupportedImageType)) {
    throw new ExtractionError("unreadable", `Claude no puede leer imágenes de tipo ${page.mime}`);
  }
  return { type: "image", source: { type: "base64", media_type: page.mime as SupportedImageType, data } };
}

export const anthropicAi: AiProvider = {
  name: "anthropic",

  async readPages(pages: PageImage[]) {
    if (pages.length === 0) return [];
    const singlePdf = pages.length === 1 && pages[0].mime === "application/pdf";
    const instructions = singlePdf
      ? 'Transcribí el texto exacto de este contrato de alquiler escaneado, página por página, tal cual aparece, sin resumir ni corregir errores de tipeo. Devolvé un elemento de "pages" por cada página real del documento, en orden.'
      : 'Cada imagen es una foto de una página distinta de un contrato de alquiler, en el mismo orden en que aparecen. Transcribí el texto exacto visible en cada una, sin resumir ni corregir errores de tipeo. Devolvé un elemento de "pages" por cada imagen, en el mismo orden.';

    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { format: zodOutputFormat(PagesSchema) },
      messages: [{ role: "user", content: [...pages.map(pageBlock), { type: "text", text: instructions }] }],
    });
    return response.parsed_output?.pages ?? [];
  },

  async extractFields(clauses: Clause[]) {
    const contract = clauses.map((c) => `${c.title}\n${c.text}`).join("\n\n");
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      output_config: { format: zodOutputFormat(FieldsSchema) },
      messages: [
        {
          role: "user",
          content: `Leé este contrato de alquiler argentino y completá los datos clave con lo que dice el texto, palabra por palabra cuando se pueda. Dejá un campo sin completar si el contrato no lo dice.\n\n${contract}`,
        },
      ],
    });
    return (response.parsed_output ?? {}) satisfies ConfirmedFields;
  },
};
