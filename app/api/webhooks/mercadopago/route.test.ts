// Test de integración: necesita la base del compose (`make up`). Spec 04.
// Proveedor: el simulador (no hay MP_ACCESS_TOKEN en los tests); Inngest, mockeado.
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { analyses, paymentEvents, payments, plans, subscriptionCycles, subscriptions, user } from "@/db/schema";
import { db, sql } from "@/lib/db";
import { sign, signatureManifest } from "@/lib/payments/mercadopago";
import { mockPaymentId, mockPreapprovalId } from "@/lib/payments/mock";
import { processPaymentNotification } from "@/lib/payments/process";
import type { PaymentProvider } from "@/lib/payments/types";
import { POST } from "./route";

const sent = vi.hoisted(() => [] as unknown[]);
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: async (e: unknown) => sent.push(e) } }));

const events: string[] = [];
const analysisIds: string[] = [];
const subscriptionIds: string[] = [];
let userId: string;
let otroId: string;
let planId: string;

function webhook(dataId: string, opts: { signature?: string; eventId?: string; type?: string } = {}) {
  const eventId = opts.eventId ?? `test-${randomUUID()}`;
  const type = opts.type ?? "payment";
  events.push(eventId);
  const ts = "1700000000";
  const signature = opts.signature ?? `ts=${ts},v1=${sign("secreto-de-prueba", signatureManifest(dataId, "req-1", ts))}`;
  return POST(
    new Request(`http://localhost/api/webhooks/mercadopago?data.id=${dataId}&type=${type}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": signature, "x-request-id": "req-1" },
      body: JSON.stringify({ id: eventId, type, data: { id: dataId } }),
    }),
  );
}

async function pendingPayment(amountCents = 0) {
  const [a] = await db().insert(analyses).values({ userId, status: "preview_ready" }).returning();
  analysisIds.push(a.id);
  const [p] = await db().insert(payments).values({ userId, analysisId: a.id, kind: "analysis", amountCents }).returning();
  return { analysis: a, payment: p };
}

const status = async (table: typeof analyses | typeof payments, id: string) =>
  (await db().select({ status: table.status }).from(table).where(eq(table.id, id)))[0].status;

beforeAll(async () => {
  [{ id: userId }] = await db().select({ id: user.id }).from(user).where(eq(user.email, "demo@contratoclaro.local"));
  [{ id: otroId }] = await db().select({ id: user.id }).from(user).where(eq(user.email, "otro@contratoclaro.local"));
  const [plan] = await db().insert(plans).values({ code: `test-${randomUUID()}`, name: "Plan de prueba", priceCents: 500_000, pageQuota: 10 }).returning();
  planId = plan.id;
});

afterAll(async () => {
  if (events.length) await db().delete(paymentEvents).where(inArray(paymentEvents.providerEventId, events));
  if (analysisIds.length) await db().delete(analyses).where(inArray(analyses.id, analysisIds));
  if (subscriptionIds.length) await db().delete(subscriptions).where(inArray(subscriptions.id, subscriptionIds));
  await db().delete(plans).where(eq(plans.id, planId));
  await sql().end();
});

describe("POST /api/webhooks/mercadopago", () => {
  it("una firma inválida responde 401 y no guarda nada", async () => {
    const eventId = `test-${randomUUID()}`;
    const res = await webhook("999", { signature: "ts=1700000000,v1=00", eventId });
    expect(res.status).toBe(401);
    expect(await db().select().from(paymentEvents).where(eq(paymentEvents.providerEventId, eventId))).toHaveLength(0);
  });

  it("un pago aprobado desbloquea el análisis y encola el informe; el repetido se ignora", async () => {
    const { analysis, payment } = await pendingPayment();
    const eventId = `test-${randomUUID()}`;
    const dataId = mockPaymentId("approved", payment.id);

    const res = await webhook(dataId, { eventId });
    expect(res.status).toBe(200);
    expect(await status(payments, payment.id)).toBe("approved");
    expect(await status(analyses, analysis.id)).toBe("paid");
    expect(sent).toContainEqual({ id: `analysis-paid-${analysis.id}`, name: "analysis/paid", data: { analysisId: analysis.id } });

    const again = await webhook(dataId, { eventId });
    expect(await again.json()).toEqual({ status: "duplicado" });
    expect(await db().select().from(paymentEvents).where(eq(paymentEvents.providerEventId, eventId))).toHaveLength(1);
  });

  it("un aviso viejo de «pendiente» no deshace la aprobación", async () => {
    const { payment } = await pendingPayment();
    await webhook(mockPaymentId("approved", payment.id));
    await webhook(mockPaymentId("pending", payment.id));
    expect(await status(payments, payment.id)).toBe("approved");
  });

  it("un pago rechazado deja el análisis en vista previa", async () => {
    const { analysis, payment } = await pendingPayment();
    await webhook(mockPaymentId("rejected", payment.id));
    expect(await status(payments, payment.id)).toBe("rejected");
    expect(await status(analyses, analysis.id)).toBe("preview_ready");
  });

  it("si falla, responde 500, guarda el error y el reintento se procesa", async () => {
    const eventId = `test-${randomUUID()}`;
    const bad = await webhook("no-es-un-pago", { eventId });
    expect(bad.status).toBe(500);
    const [event] = await db().select().from(paymentEvents).where(eq(paymentEvents.providerEventId, eventId));
    expect(event.processedAt).toBeNull();
    expect(event.error).toContain("Pago simulado inválido");
  });
});

describe("processPaymentNotification()", () => {
  const fake = (amountCents: number | null, externalReference: string): PaymentProvider => ({
    name: "mercadopago",
    createCheckout: async () => ({ redirectUrl: "", preferenceId: null }),
    getPayment: async (id) => ({ id, status: "approved", externalReference, amountCents }),
  });

  it("no aprueba si el monto cobrado no coincide", async () => {
    const { payment } = await pendingPayment(1_500_000);
    await expect(processPaymentNotification("mp-1", { provider: fake(100, payment.id), send: async () => {} })).rejects.toThrow("Monto distinto");
    expect(await status(payments, payment.id)).toBe("pending");
  });

  it("ignora pagos que no son de esta app", async () => {
    const res = await processPaymentNotification("mp-2", { provider: fake(100, "otra-cosa"), send: async () => {} });
    expect(res).toEqual({ outcome: "ignored", reason: "sin external_reference de esta app" });
  });
});

describe("POST /api/webhooks/mercadopago (suscripciones, spec 06)", () => {
  it("un aviso de preapproval autorizada abre el ciclo de la suscripción", async () => {
    const [sub] = await db().insert(subscriptions).values({ userId: otroId, planId }).returning();
    subscriptionIds.push(sub.id);

    const res = await webhook(mockPreapprovalId("authorized", sub.id), { type: "subscription_preapproval" });
    expect(res.status).toBe(200);

    const [updated] = await db().select().from(subscriptions).where(eq(subscriptions.id, sub.id));
    expect(updated.status).toBe("authorized");
    expect(await db().select().from(subscriptionCycles).where(eq(subscriptionCycles.subscriptionId, sub.id))).toHaveLength(1);
  });

  it("un tipo de evento desconocido se ignora sin romper", async () => {
    const res = await webhook("lo-que-sea", { type: "merchant_order" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "procesado", result: { outcome: "ignored", reason: "tipo merchant_order" } });
  });
});
