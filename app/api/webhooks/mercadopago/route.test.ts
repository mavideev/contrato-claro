// Test de integración: necesita la base del compose (`make up`). Spec 04.
// Proveedor: el simulador (no hay MP_ACCESS_TOKEN en los tests); Inngest, mockeado.
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { analyses, paymentEvents, payments, user } from "@/db/schema";
import { db, sql } from "@/lib/db";
import { sign, signatureManifest } from "@/lib/payments/mercadopago";
import { mockPaymentId } from "@/lib/payments/mock";
import { processPaymentNotification } from "@/lib/payments/process";
import type { PaymentProvider } from "@/lib/payments/types";
import { POST } from "./route";

const sent = vi.hoisted(() => [] as unknown[]);
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: async (e: unknown) => sent.push(e) } }));

const events: string[] = [];
const analysisIds: string[] = [];
let userId: string;

function webhook(dataId: string, opts: { signature?: string; eventId?: string } = {}) {
  const eventId = opts.eventId ?? `test-${randomUUID()}`;
  events.push(eventId);
  const ts = "1700000000";
  const signature = opts.signature ?? `ts=${ts},v1=${sign("secreto-de-prueba", signatureManifest(dataId, "req-1", ts))}`;
  return POST(
    new Request(`http://localhost/api/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": signature, "x-request-id": "req-1" },
      body: JSON.stringify({ id: eventId, type: "payment", data: { id: dataId } }),
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
});

afterAll(async () => {
  if (events.length) await db().delete(paymentEvents).where(inArray(paymentEvents.providerEventId, events));
  if (analysisIds.length) await db().delete(analyses).where(inArray(analyses.id, analysisIds));
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
