import "server-only";
import { eq } from "drizzle-orm";
import { paymentEvents } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifySignature } from "./mercadopago";
import { processPaymentNotification } from "./process";

// Webhook de Mercado Pago (spec 04, paso 4). Lo usan la ruta
// /api/webhooks/mercadopago y el simulador local, con el mismo aviso firmado.
export async function handleWebhook(request: Request): Promise<Response> {
  const secret = env().MP_WEBHOOK_SECRET;
  console.log("imprimiendo secret ", secret);
  const url = new URL(request.url);
  const valid =
    !!secret &&
    verifySignature({
      secret,
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId: url.searchParams.get("data.id"),
    });
  if (!valid) {
    console.error("[webhook mercadopago] firma inválida", {
      hasSecret: !!secret,
      dataId: url.searchParams.get("data.id"),
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      body: await request.text().catch(() => "<no se pudo leer>"),
    });
    return Response.json({ error: "firma inválida" }, { status: 401 });
  }

  let body: { id?: string | number; type?: string; action?: string; data?: { id?: string | number } };
  try {
    body = await request.json();
  } catch {
    console.error("[webhook mercadopago] cuerpo inválido");
    return Response.json({ error: "cuerpo inválido" }, { status: 400 });
  }
  if (body.id === undefined) {
    console.error("[webhook mercadopago] falta id", body);
    return Response.json({ error: "falta id" }, { status: 400 });
  }
  console.log("[webhook mercadopago] recibido", { id: body.id, type: body.type ?? body.action });

  // Idempotencia: provider_event_id es único. Un evento ya procesado se ignora;
  // uno que falló antes (processed_at vacío) se vuelve a procesar.
  const providerEventId = String(body.id);
  const type = body.type ?? body.action ?? "unknown";
  await db().insert(paymentEvents).values({ providerEventId, type, payload: body }).onConflictDoNothing({ target: paymentEvents.providerEventId });
  const [event] = await db().select().from(paymentEvents).where(eq(paymentEvents.providerEventId, providerEventId));
  if (event.processedAt) return Response.json({ status: "duplicado" });

  const paymentId = url.searchParams.get("data.id") ?? (body.data?.id !== undefined ? String(body.data.id) : null);
  try {
    const result =
      type === "payment" && paymentId ? await processPaymentNotification(paymentId) : { outcome: "ignored" as const, reason: `tipo ${type}` };
    await db().update(paymentEvents).set({ processedAt: new Date(), error: null }).where(eq(paymentEvents.id, event.id));
    return Response.json({ status: "procesado", result });
  } catch (err) {
    // 500: Mercado Pago reintenta y el evento se procesa de nuevo.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[webhook mercadopago]", message);
    await db().update(paymentEvents).set({ error: message }).where(eq(paymentEvents.id, event.id));
    return Response.json({ error: "no se pudo procesar" }, { status: 500 });
  }
}
