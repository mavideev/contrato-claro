"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { env } from "@/lib/env";
import { sign, signatureManifest } from "@/lib/payments/mercadopago";
import { mockPreapprovalId } from "@/lib/payments/mock";
import { subscriptionProvider } from "@/lib/payments/provider";
import type { SubscriptionStatus } from "@/lib/payments/types";
import { handleWebhook } from "@/lib/payments/webhook";

// Simulador: arma el aviso firmado que mandaría Mercado Pago y lo pasa por el
// mismo webhook. Solo funciona con el proveedor `mock` (nunca en producción).
export async function simulateSubscription(subscriptionId: string, status: SubscriptionStatus): Promise<void> {
  const user = await requireUser("/suscripcion");
  if (subscriptionProvider().name !== "mock") redirect("/suscripcion");
  const subscription = await scoped(user.id).billing.current();
  if (!subscription || subscription.id !== subscriptionId) redirect("/suscripcion");

  const secret = env().MP_WEBHOOK_SECRET;
  if (!secret) throw new Error("Falta MP_WEBHOOK_SECRET para firmar el aviso simulado");
  const dataId = mockPreapprovalId(status, subscriptionId);
  const requestId = randomUUID();
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await handleWebhook(
    new Request(`${env().APP_URL}/api/webhooks/mercadopago?data.id=${dataId}&type=subscription_preapproval`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId,
        "x-signature": `ts=${ts},v1=${sign(secret, signatureManifest(dataId, requestId, ts))}`,
      },
      body: JSON.stringify({ id: `sim-${requestId}`, type: "subscription_preapproval", data: { id: dataId } }),
    }),
  );
  if (!res.ok) throw new Error(`El webhook respondió ${res.status}`);
  redirect("/suscripcion");
}
