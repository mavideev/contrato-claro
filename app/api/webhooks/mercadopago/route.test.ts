// Test de integración: necesita la base del compose (`make up`). Spec 04, etapa 0.
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { paymentEvents } from "@/db/schema";
import { db, sql } from "@/lib/db";
import { sign, signatureManifest } from "@/lib/payments/mercadopago";
import { POST } from "./route";

const eventId = `test-${Date.now()}`;
const dataId = "999";

function request(signature: string) {
  return new Request(`http://localhost/api/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": signature, "x-request-id": "req-1" },
    body: JSON.stringify({ id: eventId, type: "payment", data: { id: dataId } }),
  });
}

const valid = () => `ts=1700000000,v1=${sign("secreto-de-prueba", signatureManifest(dataId, "req-1", "1700000000"))}`;

afterAll(async () => {
  await db().delete(paymentEvents).where(eq(paymentEvents.providerEventId, eventId));
  await sql().end();
});

describe("POST /api/webhooks/mercadopago", () => {
  it("una firma inválida responde 401 y no guarda nada", async () => {
    const res = await POST(request("ts=1700000000,v1=00"));
    expect(res.status).toBe(401);
    expect(await db().select().from(paymentEvents).where(eq(paymentEvents.providerEventId, eventId))).toHaveLength(0);
  });

  it("si el mismo evento llega dos veces, se guarda una sola fila", async () => {
    const first = await POST(request(valid()));
    expect(first.status).toBe(501);
    const second = await POST(request(valid()));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ status: "duplicado" });
    expect(await db().select().from(paymentEvents).where(eq(paymentEvents.providerEventId, eventId))).toHaveLength(1);
  });
});
