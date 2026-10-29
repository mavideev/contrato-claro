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
