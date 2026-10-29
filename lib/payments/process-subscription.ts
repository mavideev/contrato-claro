import "server-only";
import { desc, eq } from "drizzle-orm";
import { plans, subscriptionCycles, subscriptions } from "@/db/schema";
import { db as defaultDb, type Db } from "@/lib/db";
import { subscriptionProvider } from "./provider";
import type { SubscriptionProvider } from "./types";

// Procesa los avisos de la Preapproval API (spec 06): consulta el estado real
// al proveedor (nunca se confía en el cuerpo del webhook) y lo refleja en
// `subscriptions` / `subscription_cycles`.

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export type ProcessSubscriptionResult = { outcome: "ignored"; reason: string } | { outcome: "updated"; subscriptionId: string; status: string };

type Deps = { provider?: SubscriptionProvider; db?: Db };
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function openCycle(tx: Tx, subscriptionId: string, planId: string) {
  const [plan] = await tx.select().from(plans).where(eq(plans.id, planId)).limit(1);
  if (!plan) return;
  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + MONTH_MS);
  await tx.insert(subscriptionCycles).values({ subscriptionId, periodStart, periodEnd, pageQuota: plan.pageQuota });
  await tx.update(subscriptions).set({ currentPeriodStart: periodStart, currentPeriodEnd: periodEnd }).where(eq(subscriptions.id, subscriptionId));
}

/** `type: "subscription_preapproval"`: alta, pausa o baja. */
export async function processPreapprovalNotification(providerPreapprovalId: string, deps: Deps = {}): Promise<ProcessSubscriptionResult> {
  const provider = deps.provider ?? subscriptionProvider();
  const db = deps.db ?? defaultDb();
  const remote = await provider.getPreapproval(providerPreapprovalId);
  if (!remote.externalReference) return { outcome: "ignored", reason: "sin external_reference de esta app" };

  return db.transaction(async (tx) => {
    const [byPreapproval] = await tx.select().from(subscriptions).where(eq(subscriptions.mpPreapprovalId, providerPreapprovalId)).for("update");
    const existing = byPreapproval ?? (await tx.select().from(subscriptions).where(eq(subscriptions.id, remote.externalReference!)).for("update"))[0];
    if (!existing) return { outcome: "ignored" as const, reason: "suscripción desconocida" };

    await tx.update(subscriptions).set({ status: remote.status, mpPreapprovalId: providerPreapprovalId }).where(eq(subscriptions.id, existing.id));

    if (remote.status === "authorized") {
      const [currentCycle] = await tx
        .select()
        .from(subscriptionCycles)
        .where(eq(subscriptionCycles.subscriptionId, existing.id))
        .orderBy(desc(subscriptionCycles.periodStart))
        .limit(1);
      if (!currentCycle) await openCycle(tx, existing.id, existing.planId);
    }

    return { outcome: "updated" as const, subscriptionId: existing.id, status: remote.status };
  });
}

/** `type: "subscription_authorized_payment"`: el cobro mensual. Cierra el ciclo vencido y abre el siguiente con el cupo completo. */
export async function processAuthorizedPayment(providerAuthorizedPaymentId: string, deps: Deps = {}): Promise<ProcessSubscriptionResult> {
  const provider = deps.provider ?? subscriptionProvider();
  const db = deps.db ?? defaultDb();
  const { preapprovalId } = await provider.getAuthorizedPayment(providerAuthorizedPaymentId);

  return db.transaction(async (tx) => {
    const [sub] = await tx.select().from(subscriptions).where(eq(subscriptions.mpPreapprovalId, preapprovalId)).for("update");
    if (!sub) return { outcome: "ignored" as const, reason: "suscripción desconocida" };
    await tx.update(subscriptions).set({ status: "authorized" }).where(eq(subscriptions.id, sub.id));
    await openCycle(tx, sub.id, sub.planId);
    return { outcome: "updated" as const, subscriptionId: sub.id, status: "authorized" };
  });
}
