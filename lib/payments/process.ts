import "server-only";
import { and, eq } from "drizzle-orm";
import { analyses, payments } from "@/db/schema";
import { db as defaultDb, type Db } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { paymentProvider } from "./provider";
import type { PaymentProvider } from "./types";

// Procesa un aviso de pago (spec 04, pasos 4.3 y 4.4): consulta el pago al
// proveedor (nunca se confía en el cuerpo del webhook), actualiza `payments`
// y, si quedó aprobado, desbloquea el análisis y encola el informe.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProcessResult =
  | { outcome: "ignored"; reason: string }
  | { outcome: "updated"; paymentId: string; status: string; analysisPaid: boolean };

type Deps = { provider?: PaymentProvider; db?: Db; send?: (e: { id: string; name: "analysis/paid"; data: { analysisId: string } }) => Promise<unknown> };

export async function processPaymentNotification(providerPaymentId: string, deps: Deps = {}): Promise<ProcessResult> {
  const provider = deps.provider ?? paymentProvider();
  const db = deps.db ?? defaultDb();
  const send = deps.send ?? ((e) => inngest.send(e));

  const remote = await provider.getPayment(providerPaymentId);
  if (!remote.externalReference || !UUID.test(remote.externalReference)) {
    return { outcome: "ignored", reason: "sin external_reference de esta app" };
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(payments).where(eq(payments.id, remote.externalReference!)).for("update");
    if (!row) return null;

    // El monto cobrado tiene que coincidir con el registrado (el simulador no informa monto).
    if (remote.amountCents !== null && row.amountCents > 0 && remote.amountCents !== row.amountCents) {
      throw new Error(`Monto distinto: se esperaba ${row.amountCents} y llegó ${remote.amountCents} (pago ${row.id})`);
    }

    // Un aviso viejo no deshace una aprobación; solo un reembolso la cambia.
    const status = row.status === "approved" && remote.status !== "refunded" ? "approved" : remote.status;
    await tx.update(payments).set({ status, mpPaymentId: remote.id }).where(eq(payments.id, row.id));

    let analysisPaid = false;
    if (status === "approved" && row.kind === "analysis") {
      await tx
        .update(analyses)
        .set({ status: "paid" })
        .where(and(eq(analyses.id, row.analysisId), eq(analyses.status, "preview_ready")));
      const [a] = await tx.select({ status: analyses.status }).from(analyses).where(eq(analyses.id, row.analysisId));
      analysisPaid = a?.status === "paid";
    }
    return { row, status, analysisPaid };
  });

  if (!result) return { outcome: "ignored", reason: "pago desconocido" };

  // Fuera de la transacción. El id del evento evita duplicados en Inngest, y
  // como se manda mientras el análisis siga en `paid`, un reintento lo vuelve a encolar.
  if (result.analysisPaid) {
    await send({ id: `analysis-paid-${result.row.analysisId}`, name: "analysis/paid", data: { analysisId: result.row.analysisId } });
  }
  return { outcome: "updated", paymentId: result.row.id, status: result.status, analysisPaid: result.analysisPaid };
}
