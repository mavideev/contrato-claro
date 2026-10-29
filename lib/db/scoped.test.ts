// Test de integración: necesita la base del compose con el seed cargado
// (`make up`). Verifica el aislamiento entre usuarios (spec 01, "Acceso").
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyses, plans, subscriptionCycles, subscriptions, user } from "@/db/schema";
import { db, sql } from "@/lib/db";
import { scoped } from "@/lib/db/scoped";
import { SAMPLE_PREVIEW } from "@/lib/analysis/sample";

let demoId: string;
let otherId: string;
const uploadStub = { kind: "pdf" as const, mime: "application/pdf", sizeBytes: 10, storageKey: "users/x/uploads/stub" };

beforeAll(async () => {
  const find = async (email: string) => {
    const [row] = await db().select({ id: user.id }).from(user).where(eq(user.email, email));
    if (!row) throw new Error(`Falta ${email}: corré el seed (make up)`);
    return row.id;
  };
  demoId = await find("demo@contratoclaro.local");
  otherId = await find("otro@contratoclaro.local");
});

afterAll(async () => {
  await sql().end();
});

describe("scoped()", () => {
  it("lista solo los análisis del usuario", async () => {
    const mine = await scoped(demoId).analyses.list();
    // Al menos los 3 del seed (puede haber más si se usó la cuenta demo a mano).
    expect(mine.length).toBeGreaterThanOrEqual(3);
    expect(mine.every((a) => a.userId === demoId)).toBe(true);
  });

  it("no devuelve un análisis de otro usuario", async () => {
    const [ajeno] = await scoped(otherId).analyses.list();
    expect(await scoped(demoId).analyses.get(ajeno.id)).toBeNull();
    expect(await scoped(demoId).analyses.report(ajeno.id)).toBeNull();
  });

  it("el informe trae cláusulas ordenadas y hallazgos con cláusula", async () => {
    const [ready] = (await scoped(demoId).analyses.list()).filter((a) => a.status === "ready");
    const report = await scoped(demoId).analyses.report(ready.id);
    expect(report?.clauses.map((c) => c.number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    const clauseIds = new Set(report?.clauses.map((c) => c.id));
    expect(report?.findings.every((f) => clauseIds.has(f.clauseId))).toBe(true);
  });

  it("el historial de pagos trae solo los del usuario, con su análisis", async () => {
    const mine = await scoped(demoId).payments.list();
    expect(mine.length).toBeGreaterThanOrEqual(4);
    expect(mine.every((r) => r.payment.userId === demoId && r.payment.analysisId === r.analysis?.id)).toBe(true);
  });

  it("exige userId", () => {
    expect(() => scoped("")).toThrow();
  });
});

describe("scoped(): escrituras", () => {
  const confirmValues = { confirmedFields: { property: "Test 123" }, signingDate: "2026-11-02", propertyLabel: "Test 123", preview: SAMPLE_PREVIEW };

  it("crear, confirmar y no volver a editar después de pagar", async () => {
    const me = scoped(demoId);
    const a = await me.analyses.create({ status: "awaiting_confirmation" });
    try {
      const confirmed = await me.analyses.confirm(a.id, confirmValues);
      expect(confirmed?.status).toBe("preview_ready");
      expect(confirmed?.signingDate).toBe("2026-11-02");

      await db().update(analyses).set({ status: "paid" }).where(eq(analyses.id, a.id));
      expect(await me.analyses.confirm(a.id, confirmValues)).toBeNull();
    } finally {
      await db().delete(analyses).where(eq(analyses.id, a.id));
    }
  });

  it("no confirma ni cobra análisis ajenos, ni con ids mal formados", async () => {
    const [ajeno] = await scoped(otherId).analyses.list();
    expect(await scoped(demoId).analyses.confirm(ajeno.id, confirmValues)).toBeNull();
    expect(await scoped(demoId).payments.start(ajeno.id, "analysis", 0)).toBeNull();
    expect(await scoped(demoId).rechecks.upload(ajeno.id, uploadStub)).toBeNull();
    expect(await scoped(demoId).analyses.get("no-es-un-uuid")).toBeNull();
  });

  it("iniciar el pago dos veces reutiliza el pendiente", async () => {
    const me = scoped(demoId);
    const a = await me.analyses.create({ status: "preview_ready" });
    try {
      const first = await me.payments.start(a.id, "analysis", 0);
      const second = await me.payments.start(a.id, "analysis", 0);
      expect(second?.id).toBe(first?.id);
      expect(first?.status).toBe("pending");
    } finally {
      await db().delete(analyses).where(eq(analyses.id, a.id));
    }
  });

  it("el re-chequeo exige un pago de re-chequeo aprobado", async () => {
    const ready = (await scoped(demoId).analyses.list()).filter((a) => a.status === "ready");
    const results = await Promise.all(ready.map((a) => scoped(demoId).rechecks.paid(a.id)));
    // En el seed, solo el de «Firma hoy» tiene el re-chequeo pagado.
    expect(results.filter(Boolean)).toHaveLength(1);
    const unpaid = ready[results.findIndex((r) => !r)];
    expect(await scoped(demoId).rechecks.upload(unpaid.id, uploadStub)).toBeNull();
  });
});

describe("scoped(): suscripciones (spec 06)", () => {
  let subUserId: string;
  let planId: string;
  const subscriptionIds: string[] = [];

  async function throwawayUser() {
    const [row] = await db()
      .insert(user)
      .values({ id: randomUUID(), name: "Test", email: `test-${randomUUID()}@contratoclaro.local`, emailVerified: true })
      .returning();
    return row.id;
  }

  async function authorizedCycle(overrides: { pagesUsed?: number; extraPagesGranted?: number; expired?: boolean } = {}) {
    const [sub] = await db().insert(subscriptions).values({ userId: subUserId, planId, status: "authorized" }).returning();
    subscriptionIds.push(sub.id);
    const periodStart = new Date();
    const periodEnd = overrides.expired ? new Date(Date.now() - 1000) : new Date(periodStart.getTime() + 60 * 60 * 1000);
    const [cycle] = await db()
      .insert(subscriptionCycles)
      .values({ subscriptionId: sub.id, periodStart, periodEnd, pageQuota: 5, pagesUsed: overrides.pagesUsed ?? 0, extraPagesGranted: overrides.extraPagesGranted ?? 0 })
      .returning();
    return { sub, cycle };
  }

  beforeAll(async () => {
    subUserId = await throwawayUser();
    const [plan] = await db().insert(plans).values({ code: `test-${randomUUID()}`, name: "Plan de prueba", priceCents: 500_000, pageQuota: 5 }).returning();
    planId = plan.id;
  });

  afterAll(async () => {
    if (subscriptionIds.length) await db().delete(subscriptions).where(inArray(subscriptions.id, subscriptionIds));
    await db().delete(plans).where(eq(plans.id, planId));
    await db().delete(user).where(eq(user.id, subUserId));
  });

  it("alta de suscripción: pendiente, no duplica y guarda el id de Mercado Pago", async () => {
    const otherUserId = await throwawayUser();
    try {
      const me = scoped(otherUserId);
      const first = await me.billing.start(planId);
      const second = await me.billing.start(planId);
      expect(second.id).toBe(first.id);
      expect(first.status).toBe("pending");

      await me.billing.setPreapproval(first.id, "mp-123");
      const [updated] = await db().select().from(subscriptions).where(eq(subscriptions.id, first.id));
      expect(updated.mpPreapprovalId).toBe("mp-123");
    } finally {
      await db().delete(subscriptions).where(eq(subscriptions.userId, otherUserId));
      await db().delete(user).where(eq(user.id, otherUserId));
    }
  });

  it("sin suscripción autorizada, no hay ciclo vigente", async () => {
    const otherUserId = await throwawayUser();
    try {
      expect(await scoped(otherUserId).billing.activeCycle()).toBeNull();
    } finally {
      await db().delete(user).where(eq(user.id, otherUserId));
    }
  });

  it("un ciclo vencido no cuenta como vigente", async () => {
    const { sub } = await authorizedCycle({ expired: true });
    expect(await scoped(sub.userId).billing.activeCycle()).toBeNull();
  });

  it("createFromUpload con un ciclo marca el análisis como de suscripción", async () => {
    const { cycle } = await authorizedCycle();
    const a = await scoped(subUserId).analyses.createFromUpload({ kind: "pdf", mime: "application/pdf", sizeBytes: 10, storageKey: "x", subscriptionCycleId: cycle.id });
    try {
      expect(a.billingMode).toBe("subscription");
      expect(a.subscriptionCycleId).toBe(cycle.id);
    } finally {
      await db().delete(analyses).where(eq(analyses.id, a.id));
    }
  });

  it("createFromUpload sin ciclo queda como pago único, de siempre", async () => {
    const a = await scoped(subUserId).analyses.createFromUpload(uploadStub);
    try {
      expect(a.billingMode).toBe("one_time");
      expect(a.subscriptionCycleId).toBeNull();
    } finally {
      await db().delete(analyses).where(eq(analyses.id, a.id));
    }
  });

  it("markPaidBySubscription solo pasa a paid un análisis de suscripción en vista previa", async () => {
    const { cycle } = await authorizedCycle();
    const me = scoped(subUserId);
    const subscriptionAnalysis = await me.analyses.createFromUpload({ kind: "pdf", mime: "application/pdf", sizeBytes: 10, storageKey: "x", subscriptionCycleId: cycle.id });
    const oneTimeAnalysis = await me.analyses.create({ status: "preview_ready" });
    try {
      await db().update(analyses).set({ status: "preview_ready" }).where(eq(analyses.id, subscriptionAnalysis.id));
      expect(await me.analyses.markPaidBySubscription(subscriptionAnalysis.id)).toBe(true);
      expect(await me.analyses.markPaidBySubscription(oneTimeAnalysis.id)).toBe(false);

      const [row] = await db().select({ status: analyses.status }).from(analyses).where(eq(analyses.id, oneTimeAnalysis.id));
      expect(row.status).toBe("preview_ready");
    } finally {
      await db().delete(analyses).where(inArray(analyses.id, [subscriptionAnalysis.id, oneTimeAnalysis.id]));
    }
  });

  it("el re-chequeo sin cupo no se puede subir; con cupo, sí y sin pago", async () => {
    const { cycle } = await authorizedCycle({ pagesUsed: 5 });
    const me = scoped(subUserId);
    const ready = await me.analyses.create({ status: "ready" });
    try {
      expect(await me.rechecks.entitlement(ready.id)).toEqual({ ok: false, reason: "sin_cupo" });
      expect(await me.rechecks.upload(ready.id, uploadStub, { subscriptionCycleId: cycle.id })).toBeNull();

      await db().update(subscriptionCycles).set({ pagesUsed: 1 }).where(eq(subscriptionCycles.id, cycle.id));
      expect(await me.rechecks.entitlement(ready.id)).toEqual({ ok: true, subscriptionCycleId: cycle.id });

      const uploaded = await me.rechecks.upload(ready.id, uploadStub, { subscriptionCycleId: cycle.id });
      expect(uploaded?.subscriptionCycleId).toBe(cycle.id);
      expect(uploaded?.paymentId).toBeNull();
    } finally {
      await db().delete(analyses).where(eq(analyses.id, ready.id));
    }
  });

  it("startTopup crea un pago de páginas extra sin análisis", async () => {
    const { cycle } = await authorizedCycle();
    const payment = await scoped(subUserId).billing.startTopup(cycle.id, 100_000, 20);
    expect(payment.kind).toBe("topup");
    expect(payment.analysisId).toBeNull();
    expect(payment.pagesGranted).toBe(20);
  });
});
