import { handleWebhook } from "@/lib/payments/webhook";

// Webhook de Mercado Pago (spec 04). La lógica está en lib/payments/webhook.ts.
export function POST(request: Request) {
  return handleWebhook(request);
}
