// Test de integración: necesita la base del compose con el seed cargado (`make up`). Spec 06.
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { plans, subscriptionCycles, subscriptions, user } from "@/db/schema";
import { db, sql } from "@/lib/db";
import { ensureQuota } from "./entitlement";

let userId: string;
let planId: string;
const subscriptionIds: string[] = [];

async function authorizedCycle(overrides: { pagesUsed?: number; extraPagesGranted?: number } = {}) {
  const [sub] = await db().insert(subscriptions).values({ userId, planId, status: "authorized" }).returning();
  subscriptionIds.push(sub.id);
  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db()
    .insert(subscriptionCycles)
    .values({ subscriptionId: sub.id, periodStart, periodEnd, pageQuota: 10, pagesUsed: overrides.pagesUsed ?? 0, extraPagesGranted: overrides.extraPagesGranted ?? 0 });
}

beforeAll(async () => {
  [{ id: userId }] = await db().select({ id: user.id }).from(user).where(eq(user.email, "otro@contratoclaro.local"));
  const [plan] = await db().insert(plans).values({ code: `test-${randomUUID()}`, name: "Plan de prueba", priceCents: 500_000, pageQuota: 10 }).returning();
  planId = plan.id;
});

afterAll(async () => {
  if (subscriptionIds.length) await db().delete(subscriptions).where(inArray(subscriptions.id, subscriptionIds));
  await db().delete(plans).where(eq(plans.id, planId));
  await sql().end();
});

describe("ensureQuota()", () => {
  it("sin suscripción, no hay cupo", async () => {
    expect(await ensureQuota(randomUUID())).toEqual({ ok: false, reason: "sin_suscripcion" });
  });

  it("con cupo disponible, ok", async () => {
    await authorizedCycle({ pagesUsed: 3 });
    expect((await ensureQuota(userId)).ok).toBe(true);
  });

  it("sin cupo (agotado)", async () => {
    await authorizedCycle({ pagesUsed: 10 });
    expect(await ensureQuota(userId)).toMatchObject({ ok: false, reason: "sin_cupo" });
  });

  it("páginas extra (top-up) suman al cupo", async () => {
    await authorizedCycle({ pagesUsed: 10, extraPagesGranted: 5 });
    expect((await ensureQuota(userId)).ok).toBe(true);
  });
});
