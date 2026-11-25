import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { aiUsage, type ConfirmedFields } from "@/db/schema";
import { db } from "@/lib/db";
import { ExtractionError } from "@/lib/extraction/read";
import type { Clause } from "@/lib/extraction/clauses";
import type { AiCallContext, AiProvider, ContractType, PageImage, RiskFinding, RisksResult } from "./types";

const MODEL = "claude-haiku-5-5";
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

const client = new Anthropic();

const PagesSchema = z.object({ pages: z.array(z.string()) });

const RisksSchema = z.object({
  findings: z.array(
    z.object({
      clauseNumber: z.number().int(),
      level: z.enum(["high", "attention"]),
      title: z.string(),
      explanation: z.string(),
      whatToAsk: z.string().optional(),
    }),
  ),
  conclusion: z.string(),
});

const short = () => z.string().max(300).optional();

const RentalFieldsSchema = z.object({
  landlord: short(),
  tenant: short(),
  property: short(),
  term: short(),
  initialRent: short(),
  currency: short(),
  adjustment: short(),
  deposit: short(),
  guarantee: short(),
  termination: short(),
  expenses: short(),
  commission: short(),
});

const SaleFieldsSchema = z.object({
  seller: short(),
  buyer: short(),
  property: short(),
  price: short(),
  currency: short(),
  paymentForm: short(),
  signingTerm: short(),
  deliveryTerm: short(),
  titleStatus: short(),
  debtsStatus: short(),
  commission: short(),
});

const BoletoFieldsSchema = z.object({
  seller: short(),
  buyer: short(),
  property: short(),
  price: short(),
  currency: short(),
  paymentForm: short(),
  deliveryTerm: short(),
  signingTerm: short(),
  titleStatus: short(),
  cession: short(),
  guarantee: short(),
});

const FIELDS_SCHEMA_BY_TYPE: Record<ContractType, z.ZodTypeAny> = {
  rental: RentalFieldsSchema,
  sale: SaleFieldsSchema,
  boleto: BoletoFieldsSchema,
};

const CONTRACT_NAME_BY_TYPE: Record<ContractType, string> = {
  rental: "contrato de alquiler",
  sale: "contrato de compraventa",
  boleto: "boleto de compraventa",
};

export async function pingAnthropic(): Promise<void> {
  await client.models.retrieve(MODEL);
}

async function recordUsage(
  context: AiCallContext | undefined,
  kind: "read_pages" | "extract_fields" | "analyze_risks",
  usage: { input_tokens: number; output_tokens: number },
) {
  if (!context) return;
  try {
    await db()
      .insert(aiUsage)
      .values({ analysisId: context.analysisId, kind, model: MODEL, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens });
  } catch (err) {
    console.error("[ai usage]", err);
  }
}

let maxOutputTokens: Promise<number> | undefined;
function modelMaxTokens(): Promise<number> {
  maxOutputTokens ??= client.models.retrieve(MODEL).then((m) => m.max_tokens ?? 16000);
  return maxOutputTokens;
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

  async readPages(pages: PageImage[], context?: AiCallContext) {
    if (pages.length === 0) return [];
    const singlePdf = pages.length === 1 && pages[0].mime === "application/pdf";
    const instructions = singlePdf
      ? 'Transcribí el texto exacto de este contrato escaneado, página por página, tal cual aparece, sin resumir ni corregir errores de tipeo. Devolvé un elemento de "pages" por cada página real del documento, en orden.'
      : 'Cada imagen es una foto de una página distinta de un contrato, en el mismo orden en que aparecen. Transcribí el texto exacto visible en cada una, sin resumir ni corregir errores de tipeo. Devolvé un elemento de "pages" por cada imagen, en el mismo orden.';

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: await modelMaxTokens(),
      output_config: { format: zodOutputFormat(PagesSchema) },
      messages: [{ role: "user", content: [...pages.map(pageBlock), { type: "text", text: instructions }] }],
    });
    const response = await stream.finalMessage();
    await recordUsage(context, "read_pages", response.usage);
    return response.parsed_output?.pages ?? [];
  },

  async extractFields(clauses: Clause[], contractType: ContractType, context?: AiCallContext) {
    const contract = clauses.map((c) => `${c.title}\n${c.text}`).join("\n\n");
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: await modelMaxTokens(),
      output_config: { format: zodOutputFormat(FIELDS_SCHEMA_BY_TYPE[contractType]) },
      messages: [
        {
          role: "user",
          content: `Leé este ${CONTRACT_NAME_BY_TYPE[contractType]} argentino y completá los datos clave con lo que dice el texto, palabra por palabra cuando se pueda. Cada campo es un dato corto (una frase, no la cláusula entera) — resumí si hace falta. Dejá un campo sin completar si el contrato no lo dice.\n\n${contract}`,
        },
      ],
    });
    const response = await stream.finalMessage();
    await recordUsage(context, "extract_fields", response.usage);
    return (response.parsed_output ?? {}) satisfies ConfirmedFields;
  },

  async analyzeRisks(clauses: Clause[], checklist: string, contractType: ContractType, supportingText: string, viewerRoleLabel: string | null, context?: AiCallContext): Promise<RisksResult> {
    const contract = clauses.map((c) => `Cláusula ${c.number} — ${c.title}\n${c.text}`).join("\n\n");
    const supportingBlock = supportingText
      ? `\n\nAdemás del contrato, se adjuntaron estos documentos adicionales. Usalos para verificar lo que dice el contrato (por ejemplo, confirmar el estado de dominio contra un informe de dominio o una escritura adjunta). Si hay una contradicción, marcá "high" en la cláusula del CONTRATO a la que corresponde — estos documentos no tienen número de cláusula propio, nunca cites uno de acá. Si alguno de estos documentos ya responde (total o parcialmente) lo que un punto del checklist pide verificar, decilo explícitamente en el hallazgo o en "qué pedir" (ej. "según la escritura adjunta del 9/1/2020..."), en vez de pedir de nuevo algo que ya está adjunto. Si lo adjunto no alcanza para confirmar algo del todo (por ejemplo, es una escritura de una compra anterior y no un informe de dominio actualizado a hoy, que es el único que muestra gravámenes constituidos después de esa escritura), explicá puntualmente qué falta y por qué ese documento adjunto no lo cubre — nunca un pedido genérico que ignore lo que ya se adjuntó. El nombre que sigue a "Documento adjunto:" es solo la etiqueta que eligió quien subió el archivo (puede tener errores de tipeo) — nunca la uses como fuente de un dato (nombre de una persona, una sociedad, una fecha, etc.), esos solo salen del texto del documento. Si un informe de dominio o de gravámenes muestra un asiento marcado como "caducado", "caducidad por plazo de ley" o "cancelado", tratalo como ya sin efecto — no es un gravamen vigente, no lo pidas confirmar como si lo fuera. Compará montos, superficies y fechas entre el contrato y estos documentos adicionales (por ejemplo, una minuta u hoja de cálculo con el precio real pactado): si alguno no coincide con lo que dice el contrato, marcá "high" en la cláusula del contrato correspondiente explicando la diferencia exacta.\n\n${supportingText}`
      : "";
    const conclusionBlock = `\n\nAdemás de los hallazgos por cláusula, completá el campo "conclusion": un cierre en lenguaje simple y claro, sin jerga legal sin explicar, pensado para ${
      viewerRoleLabel ? `la parte "${viewerRoleLabel}"` : "quien lee esto"
    } — qué proteger específicamente desde ese lugar, no en términos neutros. Incluí: una conclusión general (¿el contrato está razonablemente equilibrado o tiene problemas serios para esa parte?), entre 2 y 4 recomendaciones concretas, y qué pedir o cambiar antes de firmar.${
      contractType === "rental"
        ? ""
        : ` Si la parte vendedora es una empresa (desarrolladora), tené en cuenta que en Argentina este tipo de boletos suele ser un modelo ya armado por la desarrolladora, que no se negocia cláusula por cláusula — distinguí en las recomendaciones qué puntos conviene exigir sí o sí (riesgos altos sobre algo esencial: precio, identificación del inmueble, plazos clave, pérdida de lo pagado) de cuáles son cláusulas estándar de este tipo de operación que probablemente no se muevan, explicando qué significa aceptarlas tal cual para que la persona decida si firma igual.`
    } Cerrá siempre recomendando confirmar todo esto con un escribano o abogado antes de decidir, y con la inmobiliaria también si hay una de por medio en la operación.`;
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: await modelMaxTokens(),
      output_config: { format: zodOutputFormat(RisksSchema) },
      messages: [{ role: "user", content: `${checklist}${supportingBlock}${conclusionBlock}\n\nContrato (cada cláusula con su número):\n\n${contract}` }],
    });
    const response = await stream.finalMessage();
    await recordUsage(context, "analyze_risks", response.usage);

    const findings = response.parsed_output?.findings ?? [];
    const validNumbers = new Set(clauses.map((c) => c.number));
    const valid: RiskFinding[] = findings.filter((f) => validNumbers.has(f.clauseNumber));
    if (valid.length < findings.length) {
      console.error("[análisis] hallazgos sin cláusula válida, descartados", { analysisId: context?.analysisId, descartados: findings.length - valid.length });
    }
    return { findings: valid, conclusion: response.parsed_output?.conclusion ?? "" };
  },
};
