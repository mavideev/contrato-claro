"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { env } from "@/lib/env";
import { sign, signatureManifest } from "@/lib/payments/mercadopago";
import { mockPaymentId } from "@/lib/payments/mock";
import { paymentProvider } from "@/lib/payments/provider";
import type { PaymentStatus } from "@/lib/payments/types";
import { handleWebhook } from "@/lib/payments/webhook";

// Simulador: arma el aviso firmado que mandaría Mercado Pago y lo pasa por el
// mismo webhook. Solo funciona con el proveedor `mock` (nunca en producción).
export async function simulatePayment(paymentId: string, status: PaymentStatus): Promise<void> {
  const user = await requireUser("/analisis");
  if (paymentProvider().name !== "mock") redirect("/analisis");
  const payment = await scoped(user.id).payments.get(paymentId);
  if (!payment) redirect("/analisis");

  const secret = env().MP_WEBHOOK_SECRET;
  if (!secret) throw new Error("Falta MP_WEBHOOK_SECRET para firmar el aviso simulado");
  const dataId = mockPaymentId(status, payment.id);
  const requestId = randomUUID();
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await handleWebhook(
    new Request(`${env().APP_URL}/api/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId,
        "x-signature": `ts=${ts},v1=${sign(secret, signatureManifest(dataId, requestId, ts))}`,
      },
      body: JSON.stringify({ id: `sim-${requestId}`, type: "payment", action: "payment.updated", data: { id: dataId } }),
    }),
  );
  if (!res.ok) throw new Error(`El webhook respondió ${res.status}`);

  if (payment.kind === "topup") redirect("/suscripcion");
  redirect(`/pago/retorno?analisis=${payment.analysisId}${payment.kind === "recheck" ? "&tipo=rechequeo" : ""}`);
}
