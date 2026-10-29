// Test de integración: necesita la base del compose (`make up`). Spec 06.
import { randomUUID } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { plans, subscriptionCycles, subscriptions, user } from "@/db/schema";
import { db, sql } from "@/lib/db";
import { mockAuthorizedPaymentId, mockPreapprovalId } from "@/lib/payments/mock";
import { processAuthorizedPayment, processPreapprovalNotification } from "@/lib/payments/process-subscription";
import type { SubscriptionProvider } from "@/lib/payments/types";

let userId: string;
let planId: string;
const subscriptionIds: string[] = [];

async function pendingSubscription() {
  const [row] = await db().insert(subscriptions).values({ userId, planId }).returning();
  subscriptionIds.push(row.id);
  return row;
}

async function cyclesOf(subscriptionId: string) {
  return db().select().from(subscriptionCycles).where(eq(subscriptionCycles.subscriptionId, subscriptionId)).orderBy(asc(subscriptionCycles.periodStart));
}

beforeAll(async () => {
  [{ id: userId }] = await db().select({ id: user.id }).from(user).where(eq(user.email, "demo@contratoclaro.local"));
  const [plan] = await db().insert(plans).values({ code: `test-${randomUUID()}`, name: "Plan de prueba", priceCents: 500_000, pageQuota: 100 }).returning();
  planId = plan.id;
});

afterAll(async () => {
  if (subscriptionIds.length) await db().delete(subscriptions).where(inArray(subscriptions.id, subscriptionIds));
  await db().delete(plans).where(eq(plans.id, planId));
  await sql().end();
});

describe("processPreapprovalNotification()", () => {
  it("al autorizarse, abre el primer ciclo con el cupo del plan", async () => {
    const sub = await pendingSubscription();
    const res = await processPreapprovalNotification(mockPreapprovalId("authorized", sub.id));
    expect(res).toEqual({ outcome: "updated", subscriptionId: sub.id, status: "authorized" });

    const [updated] = await db().select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(updated.status).toBe("authorized");

    const cycles = await cyclesOf(sub.id);
    expect(cycles).toHaveLength(1);
    expect(cycles[0].pageQuota).toBe(100);
    expect(cycles[0].pagesUsed).toBe(0);
  });

  it("un segundo aviso de autorizada no abre un segundo ciclo", async () => {
    const sub = await pendingSubscription();
    await processPreapprovalNotification(mockPreapprovalId("authorized", sub.id));
    await processPreapprovalNotification(mockPreapprovalId("authorized", sub.id));
    expect(await cyclesOf(sub.id)).toHaveLength(1);
  });

  it("cancelada actualiza el estado sin abrir ciclo", async () => {
    const sub = await pendingSubscription();
    const res = await processPreapprovalNotification(mockPreapprovalId("cancelled", sub.id));
    expect(res).toEqual({ outcome: "updated", subscriptionId: sub.id, status: "cancelled" });

    const [updated] = await db().select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(updated.status).toBe("cancelled");
    expect(await cyclesOf(sub.id)).toHaveLength(0);
  });

  it("ignora avisos que no son de esta app", async () => {
    const fake: SubscriptionProvider = {
      name: "mercadopago",
      createPreapproval: async () => ({ redirectUrl: "", preapprovalId: "" }),
      getPreapproval: async (id) => ({ id, status: "authorized", externalReference: null }),
      cancelPreapproval: async () => {},
      getAuthorizedPayment: async () => ({ preapprovalId: "" }),
    };
    const res = await processPreapprovalNotification("mp-1", { provider: fake });
    expect(res).toEqual({ outcome: "ignored", reason: "sin external_reference de esta app" });
  });

  it("ignora suscripciones desconocidas", async () => {
    const res = await processPreapprovalNotification(mockPreapprovalId("authorized", randomUUID()));
    expect(res).toEqual({ outcome: "ignored", reason: "suscripción desconocida" });
  });
});

describe("processAuthorizedPayment()", () => {
  it("el cobro mensual cierra el ciclo y abre el siguiente con el cupo completo", async () => {
    const sub = await pendingSubscription();
    await processPreapprovalNotification(mockPreapprovalId("authorized", sub.id));
    const [firstCycle] = await cyclesOf(sub.id);
    await db().update(subscriptionCycles).set({ pagesUsed: 90 }).where(eq(subscriptionCycles.id, firstCycle.id));

    const res = await processAuthorizedPayment(mockAuthorizedPaymentId(sub.id));
    expect(res).toEqual({ outcome: "updated", subscriptionId: sub.id, status: "authorized" });

    const cycles = await cyclesOf(sub.id);
    expect(cycles).toHaveLength(2);
    expect(cycles[0].pagesUsed).toBe(90);
    expect(cycles[1].pagesUsed).toBe(0);
    expect(cycles[1].pageQuota).toBe(100);
  });

  it("ignora un cobro de una suscripción desconocida", async () => {
    const res = await processAuthorizedPayment(mockAuthorizedPaymentId(randomUUID()));
    expect(res).toEqual({ outcome: "ignored", reason: "suscripción desconocida" });
  });
});
