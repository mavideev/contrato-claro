import "server-only";
import { scoped } from "@/lib/db/scoped";

// Gate de acceso para suscripción (spec 06): se llama antes de subir un
// contrato nuevo o la versión final del re-chequeo, para no gastar IA en un
// análisis que no se va a poder cobrar. El descuento real del cupo pasa
// después, cuando se sabe la cantidad de páginas (jobs/extract-analysis.ts).

export type QuotaResult = { ok: true; subscriptionCycleId: string } | { ok: false; reason: "sin_suscripcion" | "sin_cupo"; subscriptionCycleId?: string };

export async function ensureQuota(userId: string): Promise<QuotaResult> {
  const cycle = await scoped(userId).billing.activeCycle();
  if (!cycle) return { ok: false, reason: "sin_suscripcion" };
  const remaining = cycle.pageQuota + cycle.extraPagesGranted - cycle.pagesUsed;
  if (remaining <= 0) return { ok: false, reason: "sin_cupo", subscriptionCycleId: cycle.id };
  return { ok: true, subscriptionCycleId: cycle.id };
}

// Quién puede empezar un análisis nuevo: con cupo de suscripción, con un pago
// de análisis ya aprobado antes de subir (pago único, "pagar antes de subir"),
// esperando que se confirme ese pago, o nadie de los dos (hay que elegir plan).
export type AnalysisEntitlement =
  | { mode: "subscription"; subscriptionCycleId: string }
  | { mode: "prepaid"; paymentId: string }
  | { mode: "pending" }
  | { mode: "none" };

export async function analysisEntitlement(userId: string): Promise<AnalysisEntitlement> {
  const quota = await ensureQuota(userId);
  if (quota.ok) return { mode: "subscription", subscriptionCycleId: quota.subscriptionCycleId };

  const prepaid = await scoped(userId).payments.latestPrepaid("analysis");
  if (prepaid?.status === "approved") return { mode: "prepaid", paymentId: prepaid.id };
  if (prepaid?.status === "pending") return { mode: "pending" };
  return { mode: "none" };
}
