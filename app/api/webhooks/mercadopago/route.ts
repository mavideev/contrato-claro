import { paymentEvents } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifySignature } from "@/lib/payments/mercadopago";

// Webhook de Mercado Pago (spec 04). Etapa 0: verifica la firma y registra el
// evento una sola vez; procesar el pago llega en la etapa 1, por eso responde 501.
export async function POST(request: Request) {
  const secret = env().MP_WEBHOOK_SECRET;
  const url = new URL(request.url);
  const valid =
    !!secret &&
    verifySignature({
      secret,
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId: url.searchParams.get("data.id"),
    });
  if (!valid) return Response.json({ error: "firma inválida" }, { status: 401 });

  let body: { id?: string | number; type?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "cuerpo inválido" }, { status: 400 });
  }
  if (body.id === undefined) return Response.json({ error: "falta id" }, { status: 400 });

  // Idempotencia: provider_event_id es único; un evento repetido no inserta nada.
  const inserted = await db()
    .insert(paymentEvents)
    .values({ providerEventId: String(body.id), type: body.type ?? body.action ?? "unknown", payload: body })
    .onConflictDoNothing({ target: paymentEvents.providerEventId })
    .returning({ id: paymentEvents.id });
  if (inserted.length === 0) return Response.json({ status: "duplicado" });

  return Response.json({ status: "registrado", error: "procesamiento no implementado (etapa 1)" }, { status: 501 });
}
